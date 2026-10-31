import type { Request, Response } from 'express';
import * as service from './portal.service';
import { customerScope } from '../../lib/scope';
import { currentUser } from '../../middleware/auth';
import type { Pagination } from '../../lib/pagination';

/** The session's customer id (portalOnly guarantees a PORTAL user) */
const customerId = (req: Request) => customerScope(req).customerId!;
const id = (req: Request) => Number(req.params.id);
const page = (req: Request) => req.query as unknown as Pagination;

export async function summary(req: Request, res: Response) {
  res.json({ data: await service.summary(customerId(req)) });
}

export async function listSubscriptions(req: Request, res: Response) {
  res.json(await service.listSubscriptions(customerId(req), page(req)));
}

export async function getSubscription(req: Request, res: Response) {
  res.json({ data: await service.getSubscription(customerId(req), id(req)) });
}

export async function listInvoices(req: Request, res: Response) {
  res.json(await service.listInvoices(customerId(req), page(req)));
}

export async function getInvoice(req: Request, res: Response) {
  res.json({ data: await service.getInvoice(customerId(req), id(req)) });
}

export async function getProfile(req: Request, res: Response) {
  res.json({ data: await service.getProfile(customerId(req), currentUser(req).id) });
}

export async function updateProfile(req: Request, res: Response) {
  res.json({ data: await service.updateProfile(customerId(req), currentUser(req).id, req.body) });
}
