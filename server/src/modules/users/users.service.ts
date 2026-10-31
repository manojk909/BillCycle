import type { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { conflict, notFound, unprocessable } from '../../lib/http-error';
import { paginated, toPrismaArgs } from '../../lib/pagination';
import { hashPassword } from '../auth/auth.service';
import type { CreateUserInput, UpdateUserInput, UserListQuery } from './users.schema';

const userSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  isActive: true,
  customerId: true,
  createdAt: true,
  createdBy: { select: { id: true, name: true } },
} as const;

export async function listUsers(p: UserListQuery) {
  const where: Prisma.UserWhereInput = {
    ...(p.role ? { role: p.role } : {}),
    ...(p.q
      ? {
          OR: [
            { name: { contains: p.q, mode: 'insensitive' } },
            { email: { contains: p.q, mode: 'insensitive' } },
          ],
        }
      : {}),
  };
  const [data, total] = await prisma.$transaction([
    prisma.user.findMany({
      where,
      select: userSelect,
      ...toPrismaArgs(p, ['name', 'email', 'role', 'createdAt'], 'name'),
    }),
    prisma.user.count({ where }),
  ]);
  return paginated(data, total, p);
}

/** Only admins reach this (route guard): creates an ADMIN or INTERNAL staff account. */
export async function createUser(input: CreateUserInput, createdById: number) {
  const exists = await prisma.user.findUnique({ where: { email: input.email } });
  if (exists) {
    throw conflict('An account with this email already exists', 'DUPLICATE', {
      email: 'An account with this email already exists',
    });
  }
  return prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      role: input.role,
      passwordHash: await hashPassword(input.password),
      createdById,
    },
    select: userSelect,
  });
}

export async function updateUser(id: number, input: UpdateUserInput, actorId: number) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw notFound('User');
  if (user.role === 'PORTAL' && input.role) {
    throw unprocessable('Customer accounts cannot be turned into staff', {
      role: 'Not allowed for customers',
    });
  }
  if (id === actorId && (input.isActive === false || (input.role && input.role !== user.role))) {
    throw unprocessable('You cannot deactivate yourself or change your own role');
  }
  const losesAdmin =
    user.role === 'ADMIN' && (input.isActive === false || (input.role && input.role !== 'ADMIN'));
  if (losesAdmin) {
    const otherAdmins = await prisma.user.count({
      where: { role: 'ADMIN', isActive: true, id: { not: id } },
    });
    if (otherAdmins === 0) throw conflict('At least one active admin is required', 'LAST_ADMIN');
  }
  return prisma.user.update({ where: { id }, data: input, select: userSelect });
}
