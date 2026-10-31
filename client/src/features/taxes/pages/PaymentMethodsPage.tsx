import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { Badge, Button, Card, DataTable, PageHeader, Pagination, SearchInput, Tabs, type Column } from '@/components/ui'
import { useAuth } from '@/app/auth-context'
import { errorMessage } from '@/lib/api'
import { paymentMethods, type PaymentMethod } from '../api'
import { PaymentMethodFormModal } from '../components/PaymentMethodFormModal'
import { RemoveDialog } from '../components/RemoveDialog'

const LIMIT = 20

const TABS = [
  { key: '', label: 'All' },
  { key: 'true', label: 'Active' },
  { key: 'false', label: 'Inactive' },
]

export function PaymentMethodsPage() {
  const isAdmin = useAuth().user?.role === 'ADMIN'
  const [params, setParams] = useSearchParams()
  const [editing, setEditing] = useState<PaymentMethod | 'new' | null>(null)
  const [removing, setRemoving] = useState<PaymentMethod | null>(null)
  const page = Number(params.get('page') ?? 1)
  const q = params.get('q') ?? ''
  const active = params.get('active') ?? ''
  const { data, isLoading, isError, error } = paymentMethods.useList({
    page,
    limit: LIMIT,
    q: q || undefined,
    active: active ? active === 'true' : undefined,
  })
  const save = paymentMethods.useSave(removing?.id ?? null)
  const remove = paymentMethods.useDelete()

  function setParam(key: string, value: string) {
    const p = new URLSearchParams(params)
    if (value) p.set(key, value)
    else p.delete(key)
    if (key !== 'page') p.delete('page')
    setParams(p, { replace: true })
  }

  const columns: Column<PaymentMethod>[] = [
    { key: 'name', header: 'Name', render: (m) => <span className="font-medium text-gray-900">{m.name}</span> },
    { key: 'usageCount', header: 'Payments', align: 'right' },
    {
      key: 'isActive',
      header: 'Status',
      render: (m) => (m.isActive ? <Badge tone="success">Active</Badge> : <Badge>Inactive</Badge>),
    },
    ...(isAdmin
      ? [
          {
            key: 'actions',
            header: '',
            align: 'right' as const,
            render: (m: PaymentMethod) => (
              <div className="flex justify-end gap-1">
                <Button variant="ghost" size="sm" onClick={() => setEditing(m)} aria-label={`Edit ${m.name}`}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setRemoving(m)} aria-label={`Delete ${m.name}`}>
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
        title="Payment methods"
        subtitle="Ways customers pay, chosen when recording a payment"
        actions={
          isAdmin && (
            <Button onClick={() => setEditing('new')}>
              <Plus className="h-4 w-4" /> New payment method
            </Button>
          )
        }
      />
      <Card className="p-4">
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Tabs tabs={TABS} value={active} onChange={(key) => setParam('active', key)} />
          <SearchInput value={q} onChange={(v) => setParam('q', v)} placeholder="Search payment methods" />
        </div>
        {isError ? (
          <p className="py-8 text-center text-sm text-danger-600">{errorMessage(error, 'Could not load payment methods')}</p>
        ) : (
          <>
            <DataTable
              columns={columns}
              rows={data?.data ?? []}
              rowKey={(m) => m.id}
              loading={isLoading}
              emptyTitle={q ? 'No payment methods match your search' : 'No payment methods yet'}
            />
            {data && data.meta.total > 0 && (
              <Pagination page={page} limit={LIMIT} total={data.meta.total} onChange={(p) => setParam('page', String(p))} />
            )}
          </>
        )}
      </Card>
      <PaymentMethodFormModal open={editing !== null} method={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />
      <RemoveDialog
        item={removing}
        what="payment method"
        onDelete={(id) => remove.mutateAsync(id)}
        onDeactivate={() => save.mutateAsync({ isActive: false })}
        onClose={() => setRemoving(null)}
      />
    </>
  )
}
