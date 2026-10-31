import { Router } from 'express';
import { idParams, validate } from '../../middleware/validate';
import { adminOnly, staff } from '../../middleware/require-role';
import { paymentTermBodySchema, paymentTermListQuery, paymentTermUpdateSchema } from './payment-terms.schema';
import * as ctrl from './payment-terms.controller';

// Mounted at /api/payment-terms (behind `authenticate`, see src/routes.ts). Issue #18 (S4).
export const paymentTermsRouter = Router();

paymentTermsRouter.get('/', staff, validate({ query: paymentTermListQuery }), ctrl.list);
paymentTermsRouter.get('/options', staff, ctrl.options);
paymentTermsRouter.get('/:id', staff, validate({ params: idParams }), ctrl.get);
paymentTermsRouter.post('/', adminOnly, validate({ body: paymentTermBodySchema }), ctrl.create);
paymentTermsRouter.patch('/:id', adminOnly, validate({ params: idParams, body: paymentTermUpdateSchema }), ctrl.update);
paymentTermsRouter.delete('/:id', adminOnly, validate({ params: idParams }), ctrl.remove);
