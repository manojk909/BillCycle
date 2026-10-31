import type { Request, RequestHandler, Response } from 'express';
import jwt from 'jsonwebtoken';
import type { Role } from '@prisma/client';
import { env } from '../config/env';
import { unauthorized } from '../lib/http-error';

export const SESSION_COOKIE = 'bc_session';

type SessionPayload = { sub: string; role: Role; customerId: number | null };

export function setSession(res: Response, user: { id: number; role: Role; customerId: number | null }) {
  const token = jwt.sign({ role: user.role, customerId: user.customerId }, env.JWT_SECRET, {
    subject: String(user.id),
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000,
  });
}

export const clearSession = (res: Response) => res.clearCookie(SESSION_COOKIE);

/** Requires a valid session cookie; sets req.user */
export const authenticate: RequestHandler = (req, _res, next) => {
  const token = req.cookies?.[SESSION_COOKIE];
  if (!token) return next(unauthorized());
  try {
    const p = jwt.verify(token, env.JWT_SECRET) as unknown as SessionPayload;
    req.user = { id: Number(p.sub), role: p.role, customerId: p.customerId ?? null };
    next();
  } catch {
    next(unauthorized('Your session has expired, please log in again'));
  }
};

/** req.user for routes behind authenticate */
export function currentUser(req: Request) {
  if (!req.user) throw unauthorized();
  return req.user;
}
