import type { Request, Response } from 'express';
import * as service from './payment-terms.service';
import type { Pagination } from '../../lib/pagination';

const id = (req: Request) => Number(req.params.id);

export async function list(req: Request, res: Response) {
  res.json(await service.listPaymentTerms(req.query as unknown as Pagination));
}

export async function options(_req: Request, res: Response) {
  res.json({ data: await service.paymentTermOptions() });
}

export async function get(req: Request, res: Response) {
  res.json({ data: await service.getPaymentTerm(id(req)) });
}

export async function create(req: Request, res: Response) {
  res.status(201).json({ data: await service.createPaymentTerm(req.body) });
}

export async function update(req: Request, res: Response) {
  res.json({ data: await service.updatePaymentTerm(id(req), req.body) });
}

export async function remove(req: Request, res: Response) {
  await service.deletePaymentTerm(id(req));
  res.status(204).end();
}
