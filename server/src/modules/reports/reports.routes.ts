import { Router } from 'express';

// Mounted at /api/reports (already behind `authenticate`, see src/routes.ts).
// TODO(M11, Manoj, issue #11): add routes -> validate(schema) -> controller -> service.
// Spec: docs/tasks/  ·  role guards: middleware/require-role.ts
export const reportsRouter = Router();
