import { Router } from 'express';

// Mounted at /api/discounts (already behind `authenticate`, see src/routes.ts).
// TODO(S7, Sandhya, issue #21): add routes -> validate(schema) -> controller -> service.
// Spec: docs/tasks/  ·  role guards: middleware/require-role.ts
export const discountsRouter = Router();
