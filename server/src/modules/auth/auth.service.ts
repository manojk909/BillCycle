import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { prisma } from '../../lib/prisma';
import { conflict, forbidden, HttpError, unauthorized } from '../../lib/http-error';
import { sendMail } from '../../lib/mailer';
import { env } from '../../config/env';
import type { SignupInput } from './auth.schema';

const BCRYPT_ROUNDS = 12;

const publicUser = { id: true, name: true, email: true, role: true, customerId: true } as const;

export const hashPassword = (password: string) => bcrypt.hash(password, BCRYPT_ROUNDS);

/** Self-signup always creates a customer + PORTAL user (staff are created by an admin). */
export async function signup(input: SignupInput) {
  const exists = await prisma.user.findUnique({ where: { email: input.email } });
  if (exists)
    throw conflict('An account with this email already exists', 'DUPLICATE', {
      email: 'An account with this email already exists',
    });

  const passwordHash = await hashPassword(input.password);
  return prisma.$transaction(async (tx) => {
    const customer = await tx.customer.create({
      data: { name: input.name, email: input.email, companyName: input.companyName, phone: input.phone },
    });
    return tx.user.create({
      data: { name: input.name, email: input.email, passwordHash, role: 'PORTAL', customerId: customer.id },
      select: publicUser,
    });
  });
}

export async function login(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  // Same message for unknown email and wrong password, so accounts can't be discovered
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    throw unauthorized('Invalid email or password');
  }
  if (!user.isActive) throw forbidden('This account has been deactivated');
  return { id: user.id, name: user.name, email: user.email, role: user.role, customerId: user.customerId };
}

export async function getMe(userId: number) {
  const user = await prisma.user.findFirst({ where: { id: userId, isActive: true }, select: publicUser });
  if (!user) throw unauthorized();
  return user;
}

const hashToken = (token: string) => crypto.createHash('sha256').update(token).digest('hex');

/** Creates a single-use reset token and emails the link. Silent when the email is unknown. */
export async function requestPasswordReset(email: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.isActive) return;

  const token = crypto.randomBytes(32).toString('hex');
  await prisma.$transaction([
    prisma.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    }),
    prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(token),
        expiresAt: new Date(Date.now() + env.RESET_TOKEN_TTL_MINUTES * 60_000),
      },
    }),
  ]);

  const link = `${env.CLIENT_URL}/reset-password/${token}`;
  if (env.NODE_ENV !== 'production') console.log(`[auth] password reset link for ${email}: ${link}`);
  await sendMail({
    to: user.email,
    subject: 'Reset your BillCycle password',
    text: `Hi ${user.name},\n\nUse this link to reset your password (valid ${env.RESET_TOKEN_TTL_MINUTES} minutes):\n${link}\n\nIf you didn't ask for this, ignore this email.`,
    html: `<p>Hi ${escapeHtml(user.name)},</p><p>Use this link to reset your password (valid ${env.RESET_TOKEN_TTL_MINUTES} minutes):</p><p><a href="${link}">Reset password</a></p><p>If you didn't ask for this, ignore this email.</p>`,
  });
}

export async function resetPassword(token: string, password: string) {
  const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash: hashToken(token) } });
  if (!record || record.usedAt || record.expiresAt < new Date()) {
    throw new HttpError(400, 'INVALID_OR_EXPIRED_TOKEN', 'This reset link is invalid or has expired');
  }
  const passwordHash = await hashPassword(password);
  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
    prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
  ]);
}

function escapeHtml(s: string) {
  return s.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );
}
