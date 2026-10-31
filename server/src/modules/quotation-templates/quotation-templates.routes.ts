import { Router } from 'express';
import { idParams, validate } from '../../middleware/validate';
import { staff } from '../../middleware/require-role';
import { templateBodySchema, templateListQuery, templateUpdateSchema } from './quotation-templates.schema';
import * as ctrl from './quotation-templates.controller';

// Mounted at /api/quotation-templates (behind `authenticate`, see src/routes.ts). Issue #20 (S6).
// Sales staff build their own templates, so ADMIN and INTERNAL can both write.
export const quotationTemplatesRouter = Router();

quotationTemplatesRouter.get('/', staff, validate({ query: templateListQuery }), ctrl.list);
quotationTemplatesRouter.get('/options', staff, ctrl.options);
quotationTemplatesRouter.get('/:id', staff, validate({ params: idParams }), ctrl.get);
quotationTemplatesRouter.post('/', staff, validate({ body: templateBodySchema }), ctrl.create);
quotationTemplatesRouter.patch('/:id', staff, validate({ params: idParams, body: templateUpdateSchema }), ctrl.update);
quotationTemplatesRouter.delete('/:id', staff, validate({ params: idParams }), ctrl.remove);
