import { Router } from 'express';

// Mounted at /api/invoices (already behind `authenticate`, see src/routes.ts).
// TODO(SK6, Shubham, issue #28): add routes -> validate(schema) -> controller -> service.
// Spec: docs/tasks/  ·  role guards: middleware/require-role.ts
export const invoicesRouter = Router();
