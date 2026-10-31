import type { Tx } from './prisma';

/** Next document number, e.g. SUB/2026/00001. Atomic, so safe under concurrent transactions. */
export async function nextNumber(tx: Tx, code: 'SUB' | 'INV', date: Date = new Date()): Promise<string> {
  const year = date.getUTCFullYear();
  const rows = await tx.$queryRaw<{ value: number }[]>`
    INSERT INTO sequences (code, year, next_value) VALUES (${code}, ${year}, 2)
    ON CONFLICT (code, year) DO UPDATE SET next_value = sequences.next_value + 1
    RETURNING next_value - 1 AS value`;
  return `${code}/${year}/${String(rows[0].value).padStart(5, '0')}`;
}
