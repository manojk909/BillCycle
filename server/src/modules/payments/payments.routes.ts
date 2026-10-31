import { Router } from 'express';
import { idParams, validate } from '../../middleware/validate';
import { adminOnly, staff } from '../../middleware/require-role';
import { paymentListQuery } from './payments.schema';
import * as ctrl from './payments.controller';

// Mounted at /api/payments (behind `authenticate`). Issue #10 (M10).
export const paymentsRouter = Router();

paymentsRouter.get('/', staff, validate({ query: paymentListQuery }), ctrl.list);
paymentsRouter.get('/methods', staff, ctrl.methods);
paymentsRouter.delete('/:id', adminOnly, validate({ params: idParams }), ctrl.remove);
