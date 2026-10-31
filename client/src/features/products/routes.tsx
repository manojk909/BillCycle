import type { RouteObject } from 'react-router-dom'
import { AttributesPage } from './pages/AttributesPage'
import { ProductsListPage } from './pages/ProductsListPage'
import { ProductFormPage } from './pages/ProductFormPage'
import { VariantPickerDemoPage } from './pages/VariantPickerDemoPage'

// Paths are relative to /app. Staff can view products and attributes; only admins see edit actions.
export const productRoutes: RouteObject[] = [
  { path: 'products', element: <ProductsListPage /> },
  { path: 'products/new', element: <ProductFormPage /> },
  { path: 'products/variant-picker', element: <VariantPickerDemoPage /> },
  { path: 'products/:id', element: <ProductFormPage /> },
  { path: 'config/attributes', element: <AttributesPage /> },
]
