import { Router } from 'express';

// Mounted at /api/plans (already behind `authenticate`, see src/routes.ts).
// TODO(S5, Sandhya, issue #19): add routes -> validate(schema) -> controller -> service.
// Spec: docs/tasks/  ·  role guards: middleware/require-role.ts
export const plansRouter = Router();
