import { Router } from 'express';
import { validate, idParams } from '../../middleware/validate';
import { staff } from '../../middleware/require-role';
import * as controller from './subscriptions.controller';
import {
  createBody,
  fromTemplateBody,
  listQuery,
  updateBody,
} from './subscriptions.schema';

// Mounted at /api/subscriptions (already behind `authenticate`, see src/routes.ts).
// SK1 (Shubham, issue #23): CRUD, lines, totals, numbering, create from template.
export const subscriptionsRouter = Router();

subscriptionsRouter.use(staff);

subscriptionsRouter.get('/', validate({ query: listQuery }), controller.list);
subscriptionsRouter.post('/', validate({ body: createBody }), controller.create);
subscriptionsRouter.post(
  '/from-template',
  validate({ body: fromTemplateBody }),
  controller.fromTemplate,
);
subscriptionsRouter.get('/:id', validate({ params: idParams }), controller.get);
subscriptionsRouter.get('/:id/activity', validate({ params: idParams }), controller.activity);
subscriptionsRouter.patch(
  '/:id',
  validate({ params: idParams, body: updateBody }),
  controller.update,
);
subscriptionsRouter.delete('/:id', validate({ params: idParams }), controller.remove);
