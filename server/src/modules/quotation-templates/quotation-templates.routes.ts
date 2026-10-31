import { Router } from 'express';

// Mounted at /api/quotation-templates (already behind `authenticate`, see src/routes.ts).
// TODO(S6, Sandhya, issue #20): add routes -> validate(schema) -> controller -> service.
// Spec: docs/tasks/  ·  role guards: middleware/require-role.ts
export const quotationTemplatesRouter = Router();
