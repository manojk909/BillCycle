import { Router } from 'express';
import { idParams, validate } from '../../middleware/validate';
import { adminOnly, staff } from '../../middleware/require-role';
import { planBodySchema, planListQuery, planOptionsQuery, planUpdateSchema } from './plans.schema';
import * as ctrl from './plans.controller';

// Mounted at /api/plans (behind `authenticate`, see src/routes.ts). Issue #19 (S5).
export const plansRouter = Router();

plansRouter.get('/', staff, validate({ query: planListQuery }), ctrl.list);
plansRouter.get('/options', staff, validate({ query: planOptionsQuery }), ctrl.options);
plansRouter.get('/:id', staff, validate({ params: idParams }), ctrl.get);
plansRouter.post('/', adminOnly, validate({ body: planBodySchema }), ctrl.create);
plansRouter.patch('/:id', adminOnly, validate({ params: idParams, body: planUpdateSchema }), ctrl.update);
plansRouter.delete('/:id', adminOnly, validate({ params: idParams }), ctrl.remove);
