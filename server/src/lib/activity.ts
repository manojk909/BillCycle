import type { Tx } from './prisma';

export function logActivity(
  tx: Tx,
  entry: { entityType: string; entityId: number; action: string; message: string; userId?: number | null },
) {
  return tx.activityLog.create({ data: { ...entry, userId: entry.userId ?? null } });
}
