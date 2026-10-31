import type { Request } from 'express';
import { forbidden, unauthorized } from './http-error';

/**
 * Row scoping for customer data. PORTAL users get { customerId } to merge into every `where`,
 * staff get {}. A portal user asking for another customer's record must get 404 (findFirst returns null).
 */
export function customerScope(req: Request): { customerId?: number } {
  if (!req.user) throw unauthorized();
  if (req.user.role !== 'PORTAL') return {};
  if (!req.user.customerId) throw forbidden('This account is not linked to a customer');
  return { customerId: req.user.customerId };
}
