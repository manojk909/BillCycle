import { Prisma } from '@prisma/client';

// All money math goes through Prisma.Decimal. Never use JS floats for amounts.
export type DecimalLike = Prisma.Decimal | number | string;

export const D = (x: DecimalLike | null | undefined): Prisma.Decimal => new Prisma.Decimal(x ?? 0);

export const round2 = (x: DecimalLike): Prisma.Decimal =>
  D(x).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);

export const sum = (xs: DecimalLike[]): Prisma.Decimal =>
  xs.reduce<Prisma.Decimal>((acc, x) => acc.plus(D(x)), D(0));

export const min = (a: DecimalLike, b: DecimalLike) => Prisma.Decimal.min(D(a), D(b));
export const max = (a: DecimalLike, b: DecimalLike) => Prisma.Decimal.max(D(a), D(b));
export const isZero = (x: DecimalLike) => D(x).isZero();

/** Two-decimal string for JSON responses, e.g. "1760.00" */
export const toFixed2 = (x: DecimalLike) => round2(x).toFixed(2);
