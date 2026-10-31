import type { Request, Response } from 'express';
import * as service from './payments.service';
import { currentUser } from '../../middleware/auth';
import type { PaymentListQuery } from './payments.schema';

export async function list(req: Request, res: Response) {
  res.json(await service.listPayments(req.query as unknown as PaymentListQuery));
}

export async function methods(_req: Request, res: Response) {
  res.json({ data: await service.activePaymentMethods() });
}

export async function remove(req: Request, res: Response) {
  await service.deletePayment(Number(req.params.id), currentUser(req).id);
  res.status(204).end();
}

export async function listForInvoice(req: Request, res: Response) {
  res.json({ data: await service.invoicePayments(Number(req.params.invoiceId)) });
}

export async function register(req: Request, res: Response) {
  const result = await service.registerPayment(Number(req.params.invoiceId), req.body, currentUser(req).id);
  res.status(201).json({ data: result });
}
