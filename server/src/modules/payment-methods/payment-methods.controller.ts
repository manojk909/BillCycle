import type { Request, Response } from 'express';
import * as service from './payment-methods.service';
import type { PaymentMethodListQuery } from './payment-methods.schema';

const id = (req: Request) => Number(req.params.id);

export async function list(req: Request, res: Response) {
  res.json(await service.listPaymentMethods(req.query as unknown as PaymentMethodListQuery));
}

export async function options(_req: Request, res: Response) {
  res.json({ data: await service.paymentMethodOptions() });
}

export async function get(req: Request, res: Response) {
  res.json({ data: await service.getPaymentMethod(id(req)) });
}

export async function create(req: Request, res: Response) {
  res.status(201).json({ data: await service.createPaymentMethod(req.body) });
}

export async function update(req: Request, res: Response) {
  res.json({ data: await service.updatePaymentMethod(id(req), req.body) });
}

export async function remove(req: Request, res: Response) {
  await service.deletePaymentMethod(id(req));
  res.status(204).end();
}
