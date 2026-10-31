import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { Button, ConfirmDialog, DataTable, useToast, type Column } from '@/components/ui'
import { useAuth } from '@/app/auth-context'
import { errorMessage } from '@/lib/api'
import { formatDate, formatMoney } from '@/lib/format'
import { useDeletePayment, useInvoicePayments, type Payment } from '../api'

/** Payments recorded against one invoice. Used on the invoice form (SK7): <PaymentHistory invoiceId={id} /> */
export function PaymentHistory({ invoiceId }: { invoiceId: number }) {
  const { user } = useAuth()
  const toast = useToast()
  const { data = [], isLoading } = useInvoicePayments(invoiceId)
  const remove = useDeletePayment()
  const [toDelete, setToDelete] = useState<Payment | null>(null)

  async function onDelete() {
    if (!toDelete) return
    try {
      await remove.mutateAsync(toDelete.id)
      toast.success('Payment removed')
    } catch (err) {
      toast.error(errorMessage(err, 'Could not remove payment'))
    } finally {
      setToDelete(null)
    }
  }

  const columns: Column<Payment>[] = [
    { key: 'date', header: 'Date', render: (p) => formatDate(p.date) },
    { key: 'method', header: 'Method', render: (p) => p.method.name },
    { key: 'note', header: 'Note', render: (p) => p.note ?? '—', className: 'max-w-xs truncate' },
    { key: 'recordedBy', header: 'Recorded by', render: (p) => p.recordedBy?.name ?? '—' },
    { key: 'amount', header: 'Amount', align: 'right', render: (p) => formatMoney(p.amount) },
  ]
  if (user?.role === 'ADMIN') {
    columns.push({
      key: 'actions',
      header: '',
      align: 'right',
      render: (p) => (
        <Button variant="ghost" size="sm" aria-label="Remove payment" onClick={() => setToDelete(p)}>
          <Trash2 className="h-4 w-4" />
        </Button>
      ),
    })
  }

  return (
    <>
      <DataTable columns={columns} rows={data} rowKey={(p) => p.id} loading={isLoading} emptyTitle="No payments yet" />
      <ConfirmDialog
        open={!!toDelete}
        title="Remove payment?"
        message={toDelete ? `${formatMoney(toDelete.amount)} by ${toDelete.method.name} will be removed and the invoice balance updated.` : ''}
        confirmLabel="Remove"
        tone="danger"
        loading={remove.isPending}
        onConfirm={onDelete}
        onCancel={() => setToDelete(null)}
      />
    </>
  )
}
