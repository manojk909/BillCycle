import { z } from 'zod';

/** Extend with module filters: paginationSchema.extend({ state: z.nativeEnum(SubscriptionState).optional() }) */
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().trim().optional(),
  sort: z.string().trim().optional(), // "name" or "-createdAt"
});

export type Pagination = z.infer<typeof paginationSchema>;

export function toPrismaArgs(p: Pagination, allowedSort: string[], defaultSort = '-createdAt') {
  const field = p.sort?.replace(/^-/, '');
  const sort = field && allowedSort.includes(field) ? p.sort! : defaultSort;
  return {
    skip: (p.page - 1) * p.limit,
    take: p.limit,
    orderBy: { [sort.replace(/^-/, '')]: sort.startsWith('-') ? 'desc' : 'asc' } as Record<
      string,
      'asc' | 'desc'
    >,
  };
}

export const paginated = <T>(data: T[], total: number, p: Pagination) => ({
  data,
  meta: { page: p.page, limit: p.limit, total },
});
