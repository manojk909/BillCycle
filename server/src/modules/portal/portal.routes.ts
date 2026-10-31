import { Router } from 'express';
import { idParams, validate } from '../../middleware/validate';
import { portalOnly } from '../../middleware/require-role';
import { portalListQuery, profileSchema } from './portal.schema';
import * as ctrl from './portal.controller';

// Mounted at /api/portal (behind `authenticate`). Customers only; every query is scoped to their customer id. Issue #13.
export const portalRouter = Router();

portalRouter.use(portalOnly);
portalRouter.get('/summary', ctrl.summary);
portalRouter.get('/subscriptions', validate({ query: portalListQuery }), ctrl.listSubscriptions);
portalRouter.get('/subscriptions/:id', validate({ params: idParams }), ctrl.getSubscription);
portalRouter.get('/invoices', validate({ query: portalListQuery }), ctrl.listInvoices);
portalRouter.get('/invoices/:id', validate({ params: idParams }), ctrl.getInvoice);
portalRouter.get('/profile', ctrl.getProfile);
portalRouter.patch('/profile', validate({ body: profileSchema }), ctrl.updateProfile);
