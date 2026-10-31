import type { Request, Response } from 'express';
import * as service from './customers.service';
import type { Pagination } from '../../lib/pagination';

const id = (req: Request) => Number(req.params.id);

export async function list(req: Request, res: Response) {
  res.json(await service.listCustomers(req.query as unknown as Pagination));
}

export async function options(req: Request, res: Response) {
  res.json({ data: await service.customerOptions((req.query as { q?: string }).q) });
}

export async function get(req: Request, res: Response) {
  res.json({ data: await service.getCustomer(id(req)) });
}

export async function create(req: Request, res: Response) {
  res.status(201).json({ data: await service.createCustomer(req.body) });
}

export async function update(req: Request, res: Response) {
  res.json({ data: await service.updateCustomer(id(req), req.body) });
}

export async function remove(req: Request, res: Response) {
  await service.deleteCustomer(id(req));
  res.status(204).end();
}
