import { Router } from 'express';

// Mounted at /api/users (already behind `authenticate`, see src/routes.ts).
// TODO(M7, Manoj, issue #7): add routes -> validate(schema) -> controller -> service.
// Spec: docs/tasks/  ·  role guards: middleware/require-role.ts
export const usersRouter = Router();
