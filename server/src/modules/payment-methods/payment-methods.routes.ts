import { Router } from 'express';
import { idParams, validate } from '../../middleware/validate';
import { adminOnly, staff } from '../../middleware/require-role';
import { paymentMethodBodySchema, paymentMethodListQuery, paymentMethodUpdateSchema } from './payment-methods.schema';
import * as ctrl from './payment-methods.controller';

// Mounted at /api/payment-methods (behind `authenticate`, see src/routes.ts). Issue #18 (S4).
export const paymentMethodsRouter = Router();

paymentMethodsRouter.get('/', staff, validate({ query: paymentMethodListQuery }), ctrl.list);
paymentMethodsRouter.get('/options', staff, ctrl.options);
paymentMethodsRouter.get('/:id', staff, validate({ params: idParams }), ctrl.get);
paymentMethodsRouter.post('/', adminOnly, validate({ body: paymentMethodBodySchema }), ctrl.create);
paymentMethodsRouter.patch('/:id', adminOnly, validate({ params: idParams, body: paymentMethodUpdateSchema }), ctrl.update);
paymentMethodsRouter.delete('/:id', adminOnly, validate({ params: idParams }), ctrl.remove);
