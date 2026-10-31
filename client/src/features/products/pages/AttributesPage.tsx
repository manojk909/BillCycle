import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { Badge, Button, Card, ConfirmDialog, DataTable, PageHeader, Pagination, SearchInput, useToast, type Column } from '@/components/ui'
import { useAuth } from '@/app/auth-context'
import { errorMessage } from '@/lib/api'
import { formatMoney } from '@/lib/format'
import { useAttributes, useDeleteAttribute, type Attribute } from '../attributes-api'
import { AttributeFormModal } from '../components/AttributeFormModal'

const LIMIT = 20

export function AttributesPage() {
  const isAdmin = useAuth().user?.role === 'ADMIN'
  const toast = useToast()
  const [params, setParams] = useSearchParams()
  const [editing, setEditing] = useState<Attribute | 'new' | null>(null)
  const [removing, setRemoving] = useState<Attribute | null>(null)
  const page = Number(params.get('page') ?? 1)
  const q = params.get('q') ?? ''
  const { data, isLoading, isError, error } = useAttributes({ page, limit: LIMIT, q: q || undefined })
  const remove = useDeleteAttribute()

  function setParam(key: string, value: string) {
    const p = new URLSearchParams(params)
    if (value) p.set(key, value)
    else p.delete(key)
    if (key !== 'page') p.delete('page')
    setParams(p, { replace: true })
  }

  async function onDelete() {
    if (!removing) return
    try {
      await remove.mutateAsync(removing.id)
      toast.success(`${removing.name} deleted`)
    } catch (err) {
      toast.error(errorMessage(err, 'Could not delete attribute'))
    }
    setRemoving(null)
  }

  const columns: Column<Attribute>[] = [
    { key: 'name', header: 'Attribute', render: (a) => <span className="font-medium text-gray-900">{a.name}</span> },
    {
      key: 'values',
      header: 'Values',
      render: (a) => (
        <div className="flex flex-wrap gap-1">
          {a.values.map((v) => (
            <Badge key={v.id} tone="primary">
              {v.name} (+{formatMoney(v.extraPrice)})
            </Badge>
          ))}
        </div>
      ),
    },
    ...(isAdmin
      ? [
          {
            key: 'actions',
            header: '',
            align: 'right' as const,
            render: (a: Attribute) => (
              <div className="flex justify-end gap-1">
                <Button variant="ghost" size="sm" onClick={() => setEditing(a)} aria-label={`Edit ${a.name}`}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setRemoving(a)} aria-label={`Delete ${a.name}`}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ),
          },
        ]
      : []),
  ]

  const usedBy = removing?.values.reduce((n, v) => n + v.variantCount, 0) ?? 0

  return (
    <>
      <PageHeader
        title="Attributes"
        subtitle="Variant options like Brand, each value can add to the product price"
        actions={
          isAdmin && (
            <Button onClick={() => setEditing('new')}>
              <Plus className="h-4 w-4" /> New attribute
            </Button>
          )
        }
      />
      <Card className="p-4">
        <div className="mb-3 flex justify-end">
          <SearchInput value={q} onChange={(v) => setParam('q', v)} placeholder="Search attributes or values" />
        </div>
        {isError ? (
          <p className="py-8 text-center text-sm text-danger-600">{errorMessage(error, 'Could not load attributes')}</p>
        ) : (
          <>
            <DataTable
              columns={columns}
              rows={data?.data ?? []}
              rowKey={(a) => a.id}
              loading={isLoading}
              onRowClick={isAdmin ? (a) => setEditing(a) : undefined}
              emptyTitle={q ? 'No attributes match your search' : 'No attributes yet'}
              emptyDescription={isAdmin && !q ? 'Add an attribute such as Brand with values like Odoo (+₹560).' : undefined}
            />
            {data && data.meta.total > 0 && (
              <Pagination page={page} limit={LIMIT} total={data.meta.total} onChange={(p) => setParam('page', String(p))} />
            )}
          </>
        )}
      </Card>
      <AttributeFormModal open={editing !== null} attribute={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />
      <ConfirmDialog
        open={!!removing}
        title={usedBy ? `${removing?.name} is in use` : 'Delete attribute?'}
        message={
          usedBy
            ? `Its values are used by ${usedBy} product variant${usedBy === 1 ? '' : 's'}, so it can't be deleted. Remove those variants first.`
            : `${removing?.name} and all its values will be permanently deleted.`
        }
        confirmLabel={usedBy ? 'OK' : 'Delete'}
        tone={usedBy ? 'primary' : 'danger'}
        loading={remove.isPending}
        onConfirm={usedBy ? () => setRemoving(null) : onDelete}
        onCancel={() => setRemoving(null)}
      />
    </>
  )
}
