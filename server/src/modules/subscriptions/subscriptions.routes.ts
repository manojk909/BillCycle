import { Router } from 'express';

// Mounted at /api/subscriptions (already behind `authenticate`, see src/routes.ts).
// TODO(SK1/SK2/SK4, Shubham, issue #23): add routes -> validate(schema) -> controller -> service.
// Spec: docs/tasks/  ·  role guards: middleware/require-role.ts
export const subscriptionsRouter = Router();
