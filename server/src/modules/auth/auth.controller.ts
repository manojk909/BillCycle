import type { Request, Response } from 'express';
import * as authService from './auth.service';
import { clearSession, currentUser, setSession } from '../../middleware/auth';

export async function signup(req: Request, res: Response) {
  const user = await authService.signup(req.body);
  setSession(res, user);
  res.status(201).json({ data: user });
}

export async function login(req: Request, res: Response) {
  const user = await authService.login(req.body.email, req.body.password);
  setSession(res, user);
  res.json({ data: user });
}

export function logout(_req: Request, res: Response) {
  clearSession(res);
  res.json({ data: { ok: true } });
}

export async function me(req: Request, res: Response) {
  res.json({ data: await authService.getMe(currentUser(req).id) });
}

export async function changePassword(req: Request, res: Response) {
  await authService.changePassword(currentUser(req).id, req.body.currentPassword, req.body.newPassword);
  res.json({ data: { message: 'Password changed' } });
}

export async function forgotPassword(req: Request, res: Response) {
  await authService.requestPasswordReset(req.body.email);
  res.json({ data: { message: 'If an account exists for this email, a reset link has been sent.' } });
}

export async function resetPassword(req: Request, res: Response) {
  await authService.resetPassword(req.body.token, req.body.password);
  res.json({ data: { message: 'Your password has been reset. You can now log in.' } });
}
