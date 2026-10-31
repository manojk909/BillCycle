import { Router } from 'express';

// Mounted at /api/payments (already behind `authenticate`, see src/routes.ts).
// TODO(M10, Manoj, issue #10): add routes -> validate(schema) -> controller -> service.
// Spec: docs/tasks/  ·  role guards: middleware/require-role.ts
export const paymentsRouter = Router();
