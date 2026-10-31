import type { Request, Response } from 'express';
import * as service from './discounts.service';
import type { DiscountListQuery } from './discounts.schema';

const id = (req: Request) => Number(req.params.id);

export async function list(req: Request, res: Response) {
  res.json(await service.listDiscounts(req.query as unknown as DiscountListQuery));
}

export async function get(req: Request, res: Response) {
  res.json({ data: await service.getDiscount(id(req)) });
}

export async function create(req: Request, res: Response) {
  res.status(201).json({ data: await service.createDiscount(req.body) });
}

export async function update(req: Request, res: Response) {
  res.json({ data: await service.updateDiscount(id(req), req.body) });
}

export async function deactivate(req: Request, res: Response) {
  res.json({ data: await service.deactivateDiscount(id(req)) });
}
