import { Router } from 'express';

// Mounted at /api/payment-methods (already behind `authenticate`, see src/routes.ts).
// TODO(S4, Sandhya, issue #18): add routes -> validate(schema) -> controller -> service.
// Spec: docs/tasks/  ·  role guards: middleware/require-role.ts
export const paymentMethodsRouter = Router();
