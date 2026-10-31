import type { Request, Response } from 'express';
import * as service from './subscriptions.service';
import { currentUser } from '../../middleware/auth';
import type { ListQuery } from './subscriptions.schema';

const id = (req: Request) => Number(req.params.id);

export async function list(req: Request, res: Response) {
  res.json(await service.listSubscriptions(req.query as unknown as ListQuery));
}

export async function get(req: Request, res: Response) {
  res.json({ data: await service.getSubscription(id(req)) });
}

export async function activity(req: Request, res: Response) {
  res.json({ data: await service.getActivity(id(req)) });
}

export async function create(req: Request, res: Response) {
  const actor = currentUser(req);
  res.status(201).json({ data: await service.createSubscription(req.body, actor) });
}

export async function fromTemplate(req: Request, res: Response) {
  const actor = currentUser(req);
  res.status(201).json({ data: await service.createFromTemplate(req.body, actor) });
}

export async function update(req: Request, res: Response) {
  const actor = currentUser(req);
  res.json({ data: await service.updateSubscription(id(req), req.body, actor) });
}

export async function remove(req: Request, res: Response) {
  await service.deleteSubscription(id(req));
  res.status(204).end();
}

// SK2: lifecycle transitions. Controller stays HTTP-only; logic is in subscription-actions.
import { ACTION_HANDLERS, type SubscriptionAction } from './subscription-actions';

const actorId = (req: Request) => currentUser(req).id;

function makeAction(action: SubscriptionAction) {
  return async (req: Request, res: Response) => {
    const reason = (req.body as { reason?: string } | undefined)?.reason;
    const result = await ACTION_HANDLERS[action](id(req), actorId(req), reason);
    res.json({ data: result });
  };
}

export const send = makeAction('send');
export const confirm = makeAction('confirm');
export const activate = makeAction('activate');
export const pause = makeAction('pause');
export const resume = makeAction('resume');
export const renew = makeAction('renew');
export const close = makeAction('close');
export const cancel = makeAction('cancel');
