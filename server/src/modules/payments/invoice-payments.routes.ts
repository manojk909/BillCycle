import { Router } from 'express';

// Mounted at /api/invoices/:invoiceId/payments (already behind `authenticate`, see src/routes.ts).
// TODO(M10, Manoj, issue #10): add routes -> validate(schema) -> controller -> service.
// Spec: docs/tasks/  ·  role guards: middleware/require-role.ts
export const invoicePaymentsRouter = Router({ mergeParams: true });
