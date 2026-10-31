import type { Request, Response } from 'express';
import * as service from './plans.service';
import type { PlanListQuery, PlanOptionsQuery } from './plans.schema';

const id = (req: Request) => Number(req.params.id);

export async function list(req: Request, res: Response) {
  res.json(await service.listPlans(req.query as unknown as PlanListQuery));
}

export async function options(req: Request, res: Response) {
  res.json({ data: await service.planOptions(req.query as unknown as PlanOptionsQuery) });
}

export async function get(req: Request, res: Response) {
  res.json({ data: await service.getPlan(id(req)) });
}

export async function create(req: Request, res: Response) {
  res.status(201).json({ data: await service.createPlan(req.body) });
}

export async function update(req: Request, res: Response) {
  res.json({ data: await service.updatePlan(id(req), req.body) });
}

export async function remove(req: Request, res: Response) {
  await service.deletePlan(id(req));
  res.status(204).end();
}
