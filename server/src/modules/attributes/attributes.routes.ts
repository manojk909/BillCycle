import { Router } from 'express';
import { idParams, validate } from '../../middleware/validate';
import { adminOnly, staff } from '../../middleware/require-role';
import { attributeBodySchema, attributeListQuery, attributeUpdateSchema } from './attributes.schema';
import * as ctrl from './attributes.controller';

// Mounted at /api/attributes (behind `authenticate`, see src/routes.ts). Issue #15 (S1).
export const attributesRouter = Router();

attributesRouter.get('/', staff, validate({ query: attributeListQuery }), ctrl.list);
attributesRouter.get('/options', staff, ctrl.options);
attributesRouter.get('/:id', staff, validate({ params: idParams }), ctrl.get);
attributesRouter.post('/', adminOnly, validate({ body: attributeBodySchema }), ctrl.create);
attributesRouter.patch('/:id', adminOnly, validate({ params: idParams, body: attributeUpdateSchema }), ctrl.update);
attributesRouter.delete('/:id', adminOnly, validate({ params: idParams }), ctrl.remove);
