import { Router } from 'express';
import { validate } from '../../middleware/validate';
import { staff } from '../../middleware/require-role';
import { invoiceParams, registerPaymentSchema } from './payments.schema';
import * as ctrl from './payments.controller';

// Mounted at /api/invoices/:invoiceId/payments (behind `authenticate`). Issue #10 (M10).
export const invoicePaymentsRouter = Router({ mergeParams: true });

invoicePaymentsRouter.get('/', staff, validate({ params: invoiceParams }), ctrl.listForInvoice);
invoicePaymentsRouter.post(
  '/',
  staff,
  validate({ params: invoiceParams, body: registerPaymentSchema }),
  ctrl.register,
);
