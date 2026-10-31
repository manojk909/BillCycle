import { Router } from 'express';
import { validate, idParams } from '../../middleware/validate';
import { staff } from '../../middleware/require-role';
import * as controller from './invoices.controller';
import { listQuery, patchBody, bulkConfirmBody } from './invoices.schema';

// Mounted at /api/invoices (already behind `authenticate`, see src/routes.ts).
// SK6 (Shubham, issue #28): list, detail, confirm, cancel, send, print data.
export const invoicesRouter = Router();

invoicesRouter.use(staff);

invoicesRouter.get('/', validate({ query: listQuery }), controller.list);
invoicesRouter.post('/bulk-confirm', validate({ body: bulkConfirmBody }), controller.bulkConfirm);
invoicesRouter.get('/:id', validate({ params: idParams }), controller.get);
invoicesRouter.get('/:id/print-data', validate({ params: idParams }), controller.printData);
invoicesRouter.patch('/:id', validate({ params: idParams, body: patchBody }), controller.update);
invoicesRouter.post('/:id/confirm', validate({ params: idParams }), controller.confirm);
invoicesRouter.post('/:id/cancel', validate({ params: idParams }), controller.cancel);
invoicesRouter.post('/:id/send', validate({ params: idParams }), controller.send);
