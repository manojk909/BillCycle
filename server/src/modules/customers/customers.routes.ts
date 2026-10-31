import { Router } from 'express';
import { idParams, validate } from '../../middleware/validate';
import { adminOnly, staff } from '../../middleware/require-role';
import {
  customerBodySchema,
  customerListQuery,
  customerOptionsQuery,
  customerUpdateSchema,
} from './customers.schema';
import * as ctrl from './customers.controller';

// Mounted at /api/customers (behind `authenticate`, see src/routes.ts). Issue #9 (M9).
export const customersRouter = Router();

customersRouter.get('/', staff, validate({ query: customerListQuery }), ctrl.list);
customersRouter.get('/options', staff, validate({ query: customerOptionsQuery }), ctrl.options);
customersRouter.get('/:id', staff, validate({ params: idParams }), ctrl.get);
customersRouter.post('/', staff, validate({ body: customerBodySchema }), ctrl.create);
customersRouter.patch('/:id', staff, validate({ params: idParams, body: customerUpdateSchema }), ctrl.update);
customersRouter.delete('/:id', adminOnly, validate({ params: idParams }), ctrl.remove);
