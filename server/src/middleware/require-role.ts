import type { RequestHandler } from 'express';
import type { Role } from '@prisma/client';
import { forbidden, unauthorized } from '../lib/http-error';

/**
 * Role guards. `authenticate` is already applied to every router in routes.ts except /auth.
 *   router.get('/', staff, controller.list);          // ADMIN + INTERNAL
 *   router.post('/', adminOnly, controller.create);   // ADMIN only
 *   router.get('/invoices', portalOnly, ...);         // customers (portal module)
 */
export const requireRole =
  (...roles: Role[]): RequestHandler =>
  (req, _res, next) => {
    if (!req.user) return next(unauthorized());
    if (!roles.includes(req.user.role)) return next(forbidden());
    next();
  };

export const adminOnly = requireRole('ADMIN');
export const staff = requireRole('ADMIN', 'INTERNAL');
export const portalOnly = requireRole('PORTAL');
