import { Router } from 'express';
import { idParams, validate } from '../../middleware/validate';
import { adminOnly, staff } from '../../middleware/require-role';
import { discountBodySchema, discountListQuery, discountUpdateSchema } from './discounts.schema';
import * as ctrl from './discounts.controller';

// Mounted at /api/discounts (behind `authenticate`, see src/routes.ts). Issue #21 (S7).
// Only admins create or change discount rules (Scene E); staff can read them.
export const discountsRouter = Router();

discountsRouter.get('/', staff, validate({ query: discountListQuery }), ctrl.list);
discountsRouter.get('/:id', staff, validate({ params: idParams }), ctrl.get);
discountsRouter.post('/', adminOnly, validate({ body: discountBodySchema }), ctrl.create);
discountsRouter.patch('/:id', adminOnly, validate({ params: idParams, body: discountUpdateSchema }), ctrl.update);
discountsRouter.post('/:id/deactivate', adminOnly, validate({ params: idParams }), ctrl.deactivate);
