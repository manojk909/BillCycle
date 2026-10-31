import type { Request, Response } from 'express';
import * as service from './reports.service';
import type { OverdueQuery, ReportFilters, TrendQuery } from './reports.schema';

export async function summary(req: Request, res: Response) {
  res.json({ data: await service.summary(req.query as ReportFilters) });
}

export async function revenueTrend(req: Request, res: Response) {
  res.json({ data: await service.revenueTrend(req.query as unknown as TrendQuery) });
}

export async function overdue(req: Request, res: Response) {
  res.json({ data: await service.overdue(req.query as unknown as OverdueQuery) });
}

export async function byPlan(req: Request, res: Response) {
  res.json({ data: await service.byPlan(req.query as ReportFilters) });
}
