import { Router } from 'express';

// Mounted at /api/billing (already behind `authenticate`, see src/routes.ts).
// TODO(SK5, Shubham, issue #27): add routes -> validate(schema) -> controller -> service.
// Spec: docs/tasks/  ·  role guards: middleware/require-role.ts
export const billingRouter = Router();
