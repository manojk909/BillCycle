import { StateBadge } from '@/components/ui'
import type { PaymentStatus } from '../api'

/** Payment status (Paid, Partial, Overdue, Outstanding) with the shared state colours */
export function InvoiceStatusBadge({ status }: { status: PaymentStatus }) {
  return <StateBadge state={status} />
}
