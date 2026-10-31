import type { LucideIcon } from 'lucide-react'
import {
  BadgePercent,
  CalendarClock,
  CreditCard,
  FileText,
  LayoutDashboard,
  Layers,
  Package,
  PlayCircle,
  Receipt,
  Repeat,
  Settings2,
  ShieldCheck,
  Tags,
  Users,
  Wallet,
} from 'lucide-react'
import type { Role } from './auth-context'

export type NavItem = { label: string; path: string; icon: LucideIcon; roles: Role[] }
export type NavSection = { title?: string; items: NavItem[] }

const STAFF: Role[] = ['ADMIN', 'INTERNAL']
const ADMIN: Role[] = ['ADMIN']

export const appNav: NavSection[] = [
  {
    items: [{ label: 'Dashboard', path: '/app/dashboard', icon: LayoutDashboard, roles: STAFF }],
  },
  {
    title: 'Sales',
    items: [
      { label: 'Subscriptions', path: '/app/subscriptions', icon: Repeat, roles: STAFF },
      { label: 'Quotation templates', path: '/app/templates', icon: FileText, roles: STAFF },
      { label: 'Customers', path: '/app/customers', icon: Users, roles: STAFF },
    ],
  },
  {
    title: 'Billing',
    items: [
      { label: 'Invoices', path: '/app/invoices', icon: Receipt, roles: STAFF },
      { label: 'Run billing', path: '/app/billing', icon: PlayCircle, roles: STAFF },
      { label: 'Payments', path: '/app/payments', icon: Wallet, roles: STAFF },
    ],
  },
  {
    title: 'Catalog',
    items: [
      { label: 'Products', path: '/app/products', icon: Package, roles: STAFF },
      { label: 'Plans', path: '/app/plans', icon: CalendarClock, roles: STAFF },
      { label: 'Discounts', path: '/app/discounts', icon: BadgePercent, roles: ADMIN },
    ],
  },
  {
    title: 'Configuration',
    items: [
      { label: 'Attributes', path: '/app/config/attributes', icon: Tags, roles: ADMIN },
      { label: 'Taxes', path: '/app/config/taxes', icon: Layers, roles: ADMIN },
      { label: 'Payment terms', path: '/app/config/payment-terms', icon: Settings2, roles: ADMIN },
      { label: 'Payment methods', path: '/app/config/payment-methods', icon: CreditCard, roles: ADMIN },
      { label: 'Users', path: '/app/users', icon: ShieldCheck, roles: ADMIN },
    ],
  },
]

export const portalNav = [
  { label: 'My subscriptions', path: '/my/subscriptions' },
  { label: 'My invoices', path: '/my/invoices' },
  { label: 'Profile', path: '/my/profile' },
]

export function navForRole(role: Role): NavSection[] {
  return appNav
    .map((section) => ({ ...section, items: section.items.filter((item) => item.roles.includes(role)) }))
    .filter((section) => section.items.length > 0)
}
