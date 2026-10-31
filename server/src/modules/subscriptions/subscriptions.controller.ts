import type { Request, Response } from 'express';
import * as service from './subscriptions.service';
import { currentUser } from '../../middleware/auth';
import type { ListQuery } from './subscriptions.schema';

const id = (req: Request) => Number(req.params.id);

export async function list(req: Request, res: Response) {
  res.json(await service.listSubscriptions(req.query as unknown as ListQuery));
}

export async function get(req: Request, res: Response) {
  res.json({ data: await service.getSubscription(id(req)) });
}

export async function activity(req: Request, res: Response) {
  res.json({ data: await service.getActivity(id(req)) });
}

export async function create(req: Request, res: Response) {
  const actor = currentUser(req);
  res.status(201).json({ data: await service.createSubscription(req.body, actor) });
}

export async function fromTemplate(req: Request, res: Response) {
  const actor = currentUser(req);
  res.status(201).json({ data: await service.createFromTemplate(req.body, actor) });
}

export async function update(req: Request, res: Response) {
  const actor = currentUser(req);
  res.json({ data: await service.updateSubscription(id(req), req.body, actor) });
}

export async function remove(req: Request, res: Response) {
  await service.deleteSubscription(id(req));
  res.status(204).end();
}
