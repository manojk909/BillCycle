import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();

/** Transaction client type: pass `tx` from prisma.$transaction(async (tx) => ...) */
export type Tx = Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$extends'>;
