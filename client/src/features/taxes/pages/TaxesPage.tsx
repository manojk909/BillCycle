import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { Badge, Button, Card, DataTable, PageHeader, Pagination, SearchInput, Tabs, type Column } from '@/components/ui'
import { useAuth } from '@/app/auth-context'
import { errorMessage } from '@/lib/api'
import { formatMoney } from '@/lib/format'
import { taxes, type Tax } from '../api'
import { TaxFormModal } from '../components/TaxFormModal'
import { RemoveDialog } from '../components/RemoveDialog'

const LIMIT = 20

const TABS = [
  { key: '', label: 'All' },
  { key: 'true', label: 'Active' },
  { key: 'false', label: 'Inactive' },
]

export function TaxesPage() {
  const isAdmin = useAuth().user?.role === 'ADMIN'
  const [params, setParams] = useSearchParams()
  const [editing, setEditing] = useState<Tax | 'new' | null>(null)
  const [removing, setRemoving] = useState<Tax | null>(null)
  const page = Number(params.get('page') ?? 1)
  const q = params.get('q') ?? ''
  const active = params.get('active') ?? ''
  const { data, isLoading, isError, error } = taxes.useList({
    page,
    limit: LIMIT,
    q: q || undefined,
    active: active ? active === 'true' : undefined,
  })
  const save = taxes.useSave(removing?.id ?? null)
  const remove = taxes.useDelete()

  function setParam(key: string, value: string) {
    const p = new URLSearchParams(params)
    if (value) p.set(key, value)
    else p.delete(key)
    if (key !== 'page') p.delete('page')
    setParams(p, { replace: true })
  }

  const columns: Column<Tax>[] = [
    { key: 'name', header: 'Name', render: (t) => <span className="font-medium text-gray-900">{t.name}</span> },
    { key: 'type', header: 'Type', render: (t) => (t.type === 'PERCENT' ? 'Percentage' : 'Fixed per unit') },
    {
      key: 'rate',
      header: 'Rate',
      align: 'right',
      render: (t) => (t.type === 'PERCENT' ? `${Number(t.rate)}%` : formatMoney(t.rate)),
    },
    { key: 'usageCount', header: 'Used by', align: 'right' },
    {
      key: 'isActive',
      header: 'Status',
      render: (t) => (t.isActive ? <Badge tone="success">Active</Badge> : <Badge>Inactive</Badge>),
    },
    ...(isAdmin
      ? [
          {
            key: 'actions',
            header: '',
            align: 'right' as const,
            render: (t: Tax) => (
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
        title="Taxes"
        subtitle="Applied automatically to product and plan lines"
        actions={
          isAdmin && (
            <Button onClick={() => setEditing('new')}>
              <Plus className="h-4 w-4" /> New tax
            </Button>
          )
        }
      />
      <Card className="p-4">
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Tabs tabs={TABS} value={active} onChange={(key) => setParam('active', key)} />
          <SearchInput value={q} onChange={(v) => setParam('q', v)} placeholder="Search taxes" />
        </div>
        {isError ? (
          <p className="py-8 text-center text-sm text-danger-600">{errorMessage(error, 'Could not load taxes')}</p>
        ) : (
          <>
            <DataTable
              columns={columns}
              rows={data?.data ?? []}
              rowKey={(t) => t.id}
              loading={isLoading}
              emptyTitle={q ? 'No taxes match your search' : 'No taxes yet'}
              emptyDescription={isAdmin && !q ? 'Add a tax such as GST 18% to use it on products.' : undefined}
            />
            {data && data.meta.total > 0 && (
              <Pagination page={page} limit={LIMIT} total={data.meta.total} onChange={(p) => setParam('page', String(p))} />
            )}
          </>
        )}
      </Card>
      <TaxFormModal open={editing !== null} tax={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />
      <RemoveDialog
        item={removing}
        what="tax"
        onDelete={(id) => remove.mutateAsync(id)}
        onDeactivate={() => save.mutateAsync({ isActive: false })}
        onClose={() => setRemoving(null)}
      />
    </>
  )
}
