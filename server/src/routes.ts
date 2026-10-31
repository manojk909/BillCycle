import { Router } from 'express';
import { authenticate } from './middleware/auth';
import { authRouter } from './modules/auth/auth.routes';
import { usersRouter } from './modules/users/users.routes';
import { customersRouter } from './modules/customers/customers.routes';
import { attributesRouter } from './modules/attributes/attributes.routes';
import { productsRouter } from './modules/products/products.routes';
import { taxesRouter } from './modules/taxes/taxes.routes';
import { paymentTermsRouter } from './modules/payment-terms/payment-terms.routes';
import { paymentMethodsRouter } from './modules/payment-methods/payment-methods.routes';
import { plansRouter } from './modules/plans/plans.routes';
import { quotationTemplatesRouter } from './modules/quotation-templates/quotation-templates.routes';
import { discountsRouter } from './modules/discounts/discounts.routes';
import { subscriptionsRouter } from './modules/subscriptions/subscriptions.routes';
import { invoicesRouter } from './modules/invoices/invoices.routes';
import { billingRouter } from './modules/invoices/billing.routes';
import { paymentsRouter } from './modules/payments/payments.routes';
import { invoicePaymentsRouter } from './modules/payments/invoice-payments.routes';
import { reportsRouter } from './modules/reports/reports.routes';
import { portalRouter } from './modules/portal/portal.routes';

// Every module router is mounted here once, so module owners never need to edit this file.
export const apiRouter = Router();

apiRouter.use('/auth', authRouter);

// Everything below requires a logged-in user; each module adds its own role guards.
apiRouter.use(authenticate);
apiRouter.use('/users', usersRouter);
apiRouter.use('/customers', customersRouter);
apiRouter.use('/attributes', attributesRouter);
apiRouter.use('/products', productsRouter);
apiRouter.use('/taxes', taxesRouter);
apiRouter.use('/payment-terms', paymentTermsRouter);
apiRouter.use('/payment-methods', paymentMethodsRouter);
apiRouter.use('/plans', plansRouter);
apiRouter.use('/quotation-templates', quotationTemplatesRouter);
apiRouter.use('/discounts', discountsRouter);
apiRouter.use('/subscriptions', subscriptionsRouter);
apiRouter.use('/invoices', invoicesRouter);
apiRouter.use('/billing', billingRouter);
apiRouter.use('/payments', paymentsRouter);
apiRouter.use('/invoices/:invoiceId/payments', invoicePaymentsRouter);
apiRouter.use('/reports', reportsRouter);
apiRouter.use('/portal', portalRouter);
