import type { Request, Response } from 'express';
import * as service from './users.service';
import { currentUser } from '../../middleware/auth';
import type { UserListQuery } from './users.schema';

export async function list(req: Request, res: Response) {
  res.json(await service.listUsers(req.query as unknown as UserListQuery));
}

export async function create(req: Request, res: Response) {
  res.status(201).json({ data: await service.createUser(req.body, currentUser(req).id) });
}

export async function update(req: Request, res: Response) {
  res.json({ data: await service.updateUser(Number(req.params.id), req.body, currentUser(req).id) });
}
