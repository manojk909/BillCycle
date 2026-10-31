import { z } from 'zod';
import { zDate } from '../../middleware/validate';

export const runBody = z.object({ upTo: zDate });
export type RunBody = z.infer<typeof runBody>;

export const previewQuery = z.object({ upTo: zDate });
export type PreviewQuery = z.infer<typeof previewQuery>;

export const runsQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type RunsQuery = z.infer<typeof runsQuery>;
