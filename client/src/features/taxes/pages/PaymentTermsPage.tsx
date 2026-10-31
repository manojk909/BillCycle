import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { Button, Card, DataTable, PageHeader, Pagination, SearchInput, type Column } from '@/components/ui'
import { useAuth } from '@/app/auth-context'
import { errorMessage } from '@/lib/api'
import { paymentTerms, type PaymentTerm } from '../api'
import { PaymentTermFormModal } from '../components/PaymentTermFormModal'
import { RemoveDialog } from '../components/RemoveDialog'

const LIMIT = 20

export function PaymentTermsPage() {
  const isAdmin = useAuth().user?.role === 'ADMIN'
  const [params, setParams] = useSearchParams()
  const [editing, setEditing] = useState<PaymentTerm | 'new' | null>(null)
  const [removing, setRemoving] = useState<PaymentTerm | null>(null)
  const page = Number(params.get('page') ?? 1)
  const q = params.get('q') ?? ''
  const { data, isLoading, isError, error } = paymentTerms.useList({ page, limit: LIMIT, q: q || undefined })
  const remove = paymentTerms.useDelete()

  function setParam(key: string, value: string) {
    const p = new URLSearchParams(params)
    if (value) p.set(key, value)
    else p.delete(key)
    if (key !== 'page') p.delete('page')
    setParams(p, { replace: true })
  }

  const columns: Column<PaymentTerm>[] = [
    { key: 'name', header: 'Name', render: (t) => <span className="font-medium text-gray-900">{t.name}</span> },
    {
      key: 'dueDays',
      header: 'Due',
      render: (t) => (t.dueDays === 0 ? 'Immediately' : `${t.dueDays} day${t.dueDays === 1 ? '' : 's'} after invoice`),
    },
    { key: 'usageCount', header: 'Subscriptions', align: 'right' },
    ...(isAdmin
      ? [
          {
            key: 'actions',
            header: '',
            align: 'right' as const,
            render: (t: PaymentTerm) => (
              <div className="flex justify-end gap-1">
                <Button variant="ghost" size="sm" onClick={() => setEditing(t)} aria-label={`Edit ${t.name}`}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setRemoving(t)} aria-label={`Delete ${t.name}`}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ),
          },
        ]
      : []),
  ]

  return (
    <>
      <PageHeader
        title="Payment terms"
        subtitle="Decide when an invoice falls due"
        actions={
          isAdmin && (
            <Button onClick={() => setEditing('new')}>
              <Plus className="h-4 w-4" /> New payment term
            </Button>
          )
        }
      />
      <Card className="p-4">
        <div className="mb-3 flex justify-end">
          <SearchInput value={q} onChange={(v) => setParam('q', v)} placeholder="Search payment terms" />
        </div>
        {isError ? (
          <p className="py-8 text-center text-sm text-danger-600">{errorMessage(error, 'Could not load payment terms')}</p>
        ) : (
          <>
            <DataTable
              columns={columns}
              rows={data?.data ?? []}
              rowKey={(t) => t.id}
              loading={isLoading}
              emptyTitle={q ? 'No payment terms match your search' : 'No payment terms yet'}
            />
            {data && data.meta.total > 0 && (
              <Pagination page={page} limit={LIMIT} total={data.meta.total} onChange={(p) => setParam('page', String(p))} />
            )}
          </>
        )}
      </Card>
      <PaymentTermFormModal open={editing !== null} term={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />
      <RemoveDialog item={removing} what="payment term" onDelete={(id) => remove.mutateAsync(id)} onClose={() => setRemoving(null)} />
    </>
  )
}
