import type { Request, Response } from 'express';
import { currentUser } from '../../middleware/auth';
import * as service from './products.service';
import type { ProductListQuery } from './products.schema';

const id = (req: Request) => Number(req.params.id);
const viewer = (req: Request): service.Viewer => ({ canSeeCost: currentUser(req).role === 'ADMIN' });

export async function list(req: Request, res: Response) {
  res.json(await service.listProducts(req.query as unknown as ProductListQuery, viewer(req)));
}

export async function variantOptions(req: Request, res: Response) {
  res.json({ data: await service.variantOptions((req.query as { q?: string }).q) });
}

export async function get(req: Request, res: Response) {
  res.json({ data: await service.getProduct(id(req), viewer(req)) });
}

export async function create(req: Request, res: Response) {
  res.status(201).json({ data: await service.createProduct(req.body, viewer(req)) });
}

export async function update(req: Request, res: Response) {
  res.json({ data: await service.updateProduct(id(req), req.body, viewer(req)) });
}

export async function archive(req: Request, res: Response) {
  res.json({ data: await service.setProductActive(id(req), false, viewer(req)) });
}

export async function unarchive(req: Request, res: Response) {
  res.json({ data: await service.setProductActive(id(req), true, viewer(req)) });
}

export async function remove(req: Request, res: Response) {
  await service.deleteProduct(id(req));
  res.status(204).end();
}

export async function addVariant(req: Request, res: Response) {
  res.status(201).json({ data: await service.addVariant(id(req), req.body, viewer(req)) });
}

export async function removeVariant(req: Request, res: Response) {
  await service.deleteVariant(id(req), Number(req.params.variantId));
  res.status(204).end();
}
