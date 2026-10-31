import type { Request, Response } from 'express';
import { currentUser } from '../../middleware/auth';
import { runBilling, previewBilling, listBillingRuns } from '../../jobs/billing-run';
import type { PreviewQuery, RunBody, RunsQuery } from './billing.schema';

export async function run(req: Request, res: Response) {
  const body = req.body as RunBody;
  const result = await runBilling({ upTo: body.upTo, triggeredById: currentUser(req).id });
  res.json({ data: result });
}

export async function preview(req: Request, res: Response) {
  const q = req.query as unknown as PreviewQuery;
  res.json({ data: await previewBilling(q.upTo) });
}

export async function runs(req: Request, res: Response) {
  const q = req.query as unknown as RunsQuery;
  const [rows, total] = await listBillingRuns(q.page, q.limit);
  res.json({ data: rows, meta: { page: q.page, limit: q.limit, total } });
}
