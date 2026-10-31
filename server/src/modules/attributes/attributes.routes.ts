import { Router } from 'express';

// Mounted at /api/attributes (already behind `authenticate`, see src/routes.ts).
// TODO(S1, Sandhya, issue #15): add routes -> validate(schema) -> controller -> service.
// Spec: docs/tasks/  ·  role guards: middleware/require-role.ts
export const attributesRouter = Router();
