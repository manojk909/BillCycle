import { Router } from 'express';
import { validate } from '../../middleware/validate';
import { staff } from '../../middleware/require-role';
import * as controller from './billing.controller';
import { runBody, previewQuery, runsQuery } from './billing.schema';

// Mounted at /api/billing (already behind `authenticate`, see src/routes.ts).
// SK5 (Shubham, issue #27): billing run trigger, preview and history.
export const billingRouter = Router();

billingRouter.use(staff);

billingRouter.post('/run', validate({ body: runBody }), controller.run);
billingRouter.get('/preview', validate({ query: previewQuery }), controller.preview);
billingRouter.get('/runs', validate({ query: runsQuery }), controller.runs);
