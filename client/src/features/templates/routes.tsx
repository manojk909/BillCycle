import type { RouteObject } from 'react-router-dom'
import { TemplatesListPage } from './pages/TemplatesListPage'
import { TemplateFormPage } from './pages/TemplateFormPage'

// Paths are relative to /app. Admins and sales staff both manage templates.
export const templateRoutes: RouteObject[] = [
  { path: 'templates', element: <TemplatesListPage /> },
  { path: 'templates/new', element: <TemplateFormPage /> },
  { path: 'templates/:id', element: <TemplateFormPage /> },
]
