import { Router } from 'express';

// Mounted at /api/products (already behind `authenticate`, see src/routes.ts).
// TODO(S2, Sandhya, issue #16): add routes -> validate(schema) -> controller -> service.
// Spec: docs/tasks/  ·  role guards: middleware/require-role.ts
export const productsRouter = Router();
