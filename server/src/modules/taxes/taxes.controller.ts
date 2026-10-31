import type { Request, Response } from 'express';
import * as service from './taxes.service';
import type { TaxListQuery } from './taxes.schema';

const id = (req: Request) => Number(req.params.id);

export async function list(req: Request, res: Response) {
  res.json(await service.listTaxes(req.query as unknown as TaxListQuery));
}

export async function options(_req: Request, res: Response) {
  res.json({ data: await service.taxOptions() });
}

export async function get(req: Request, res: Response) {
  res.json({ data: await service.getTax(id(req)) });
}

export async function create(req: Request, res: Response) {
  res.status(201).json({ data: await service.createTax(req.body) });
}

export async function update(req: Request, res: Response) {
  res.json({ data: await service.updateTax(id(req), req.body) });
}

export async function remove(req: Request, res: Response) {
  await service.deleteTax(id(req));
  res.status(204).end();
}
