import { Router } from 'express';
import { validate, idParams } from '../../middleware/validate';
import { staff } from '../../middleware/require-role';
import * as controller from './subscriptions.controller';
import {
  actionBody,
  createBody,
  fromTemplateBody,
  listQuery,
  updateBody,
} from './subscriptions.schema';

// Mounted at /api/subscriptions (already behind `authenticate`, see src/routes.ts).
// SK1 (Shubham, issue #23): CRUD, lines, totals, numbering, create from template.
// SK2 (Shubham, issue #24): lifecycle transitions.
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

// SK2 transitions. Body: { reason? }.
const action = { params: idParams, body: actionBody };
subscriptionsRouter.post('/:id/send', validate(action), controller.send);
subscriptionsRouter.post('/:id/confirm', validate(action), controller.confirm);
subscriptionsRouter.post('/:id/activate', validate(action), controller.activate);
subscriptionsRouter.post('/:id/pause', validate(action), controller.pause);
subscriptionsRouter.post('/:id/resume', validate(action), controller.resume);
subscriptionsRouter.post('/:id/renew', validate(action), controller.renew);
subscriptionsRouter.post('/:id/close', validate(action), controller.close);
subscriptionsRouter.post('/:id/cancel', validate(action), controller.cancel);

// SK4: generate an invoice for the current period (manual "Create invoice").
subscriptionsRouter.post('/:id/invoices', validate({ params: idParams }), controller.generateInvoice);
