import { Router } from 'express';
import { idParams, validate } from '../../middleware/validate';
import { adminOnly, staff } from '../../middleware/require-role';
import {
  productBodySchema,
  productListQuery,
  productUpdateSchema,
  variantBodySchema,
  variantOptionsQuery,
  variantParams,
} from './products.schema';
import * as ctrl from './products.controller';

// Mounted at /api/products (behind `authenticate`, see src/routes.ts). Issue #16 (S2).
export const productsRouter = Router();

productsRouter.get('/', staff, validate({ query: productListQuery }), ctrl.list);
// Before '/:id' so "variants" isn't parsed as an id.
productsRouter.get('/variants/options', staff, validate({ query: variantOptionsQuery }), ctrl.variantOptions);
productsRouter.get('/:id', staff, validate({ params: idParams }), ctrl.get);
productsRouter.post('/', adminOnly, validate({ body: productBodySchema }), ctrl.create);
productsRouter.patch('/:id', adminOnly, validate({ params: idParams, body: productUpdateSchema }), ctrl.update);
productsRouter.post('/:id/archive', adminOnly, validate({ params: idParams }), ctrl.archive);
productsRouter.post('/:id/unarchive', adminOnly, validate({ params: idParams }), ctrl.unarchive);
productsRouter.delete('/:id', adminOnly, validate({ params: idParams }), ctrl.remove);
productsRouter.post('/:id/variants', adminOnly, validate({ params: idParams, body: variantBodySchema }), ctrl.addVariant);
productsRouter.delete('/:id/variants/:variantId', adminOnly, validate({ params: variantParams }), ctrl.removeVariant);
