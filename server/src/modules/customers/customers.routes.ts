import { Router } from 'express';

// Mounted at /api/customers (already behind `authenticate`, see src/routes.ts).
// TODO(M9, Manoj, issue #9): add routes -> validate(schema) -> controller -> service.
// Spec: docs/tasks/  ·  role guards: middleware/require-role.ts
export const customersRouter = Router();
