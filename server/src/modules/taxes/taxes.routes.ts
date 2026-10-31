import { Router } from 'express';
import { idParams, validate } from '../../middleware/validate';
import { adminOnly, staff } from '../../middleware/require-role';
import { taxBodySchema, taxListQuery, taxUpdateSchema } from './taxes.schema';
import * as ctrl from './taxes.controller';

// Mounted at /api/taxes (behind `authenticate`, see src/routes.ts). Issue #18 (S4).
export const taxesRouter = Router();

taxesRouter.get('/', staff, validate({ query: taxListQuery }), ctrl.list);
taxesRouter.get('/options', staff, ctrl.options);
taxesRouter.get('/:id', staff, validate({ params: idParams }), ctrl.get);
taxesRouter.post('/', adminOnly, validate({ body: taxBodySchema }), ctrl.create);
taxesRouter.patch('/:id', adminOnly, validate({ params: idParams, body: taxUpdateSchema }), ctrl.update);
taxesRouter.delete('/:id', adminOnly, validate({ params: idParams }), ctrl.remove);
