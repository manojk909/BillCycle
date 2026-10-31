import type { Request, Response } from 'express';
import * as service from './quotation-templates.service';
import type { Pagination } from '../../lib/pagination';

const id = (req: Request) => Number(req.params.id);

export async function list(req: Request, res: Response) {
  res.json(await service.listTemplates(req.query as unknown as Pagination));
}

export async function options(_req: Request, res: Response) {
  res.json({ data: await service.templateOptions() });
}

export async function get(req: Request, res: Response) {
  res.json({ data: await service.getTemplate(id(req)) });
}

export async function create(req: Request, res: Response) {
  res.status(201).json({ data: await service.createTemplate(req.body) });
}

export async function update(req: Request, res: Response) {
  res.json({ data: await service.updateTemplate(id(req), req.body) });
}

export async function remove(req: Request, res: Response) {
  await service.deleteTemplate(id(req));
  res.status(204).end();
}
