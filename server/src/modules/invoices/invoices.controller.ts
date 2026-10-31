import type { Request, Response } from 'express';
import * as service from './invoices.service';
import { currentUser } from '../../middleware/auth';
import { env } from '../../config/env';
import type { ListQuery } from './invoices.schema';

const id = (req: Request) => Number(req.params.id);
const actor = (req: Request) => currentUser(req).id;

export async function list(req: Request, res: Response) {
  res.json(await service.listInvoices(req.query as unknown as ListQuery));
}

export async function get(req: Request, res: Response) {
  res.json({ data: await service.getInvoice(id(req)) });
}

export async function printData(req: Request, res: Response) {
  res.json({ data: await service.buildInvoicePrintData(id(req)) });
}

export async function update(req: Request, res: Response) {
  res.json({ data: await service.updateInvoice(id(req), req.body) });
}

export async function confirm(req: Request, res: Response) {
  res.json({ data: await service.confirmInvoiceById(id(req), actor(req)) });
}

export async function cancel(req: Request, res: Response) {
  res.json({ data: await service.cancelInvoiceById(id(req), actor(req)) });
}

export async function send(req: Request, res: Response) {
  res.json({ data: await service.sendInvoice(id(req), actor(req), env.CLIENT_URL) });
}

export async function bulkConfirm(req: Request, res: Response) {
  res.json({ data: await service.bulkConfirm(req.body, actor(req)) });
}
