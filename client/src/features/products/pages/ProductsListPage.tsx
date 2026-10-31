import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { Badge, Button, Card, ConfirmDialog, DataTable, PageHeader, Pagination, SearchInput, Switch, Tabs, useToast, type Column } from '@/components/ui'
import { useAuth } from '@/app/auth-context'
import { errorMessage } from '@/lib/api'
import { formatMoney } from '@/lib/format'
import { useProducts, useSetProductActive, type ProductRow, type ProductType } from '../api'

const LIMIT = 20

const TABS = [
  { key: '', label: 'All' },
  { key: 'SERVICE', label: 'Services' },
  { key: 'GOODS', label: 'Goods' },
]

export function ProductsListPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const isAdmin = useAuth().user?.role === 'ADMIN'
  const [params, setParams] = useSearchParams()
  const [toggling, setToggling] = useState<ProductRow | null>(null)
  const page = Number(params.get('page') ?? 1)
  const q = params.get('q') ?? ''
  const type = (params.get('type') ?? '') as ProductType | ''
  const { data, isLoading, isError, error } = useProducts({ page, limit: LIMIT, q: q || undefined, type: type || undefined })
  const setActive = useSetProductActive()

  function setParam(key: string, value: string) {
    const p = new URLSearchParams(params)
    if (value) p.set(key, value)
    else p.delete(key)
    if (key !== 'page') p.delete('page')
    setParams(p, { replace: true })
  }

  async function confirmToggle() {
    if (!toggling) return
    try {
      await setActive.mutateAsync({ id: toggling.id, isActive: !toggling.isActive })
      toast.success(`${toggling.name} ${toggling.isActive ? 'archived' : 'restored'}`)
    } catch (err) {
      toast.error(errorMessage(err, 'Could not update product'))
    }
    setToggling(null)
  }

  const columns: Column<ProductRow>[] = [
    {
      key: 'name',
      header: 'Product',
      render: (p) => (
        <div>
          <div className="font-medium text-gray-900">{p.name}</div>
          {p.notes && <div className="max-w-xs truncate text-xs text-gray-500">{p.notes}</div>}
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      render: (p) => <Badge tone={p.type === 'SERVICE' ? 'info' : 'gray'}>{p.type === 'SERVICE' ? 'Service' : 'Goods'}</Badge>,
    },
    { key: 'salesPrice', header: 'Sales price', align: 'right', render: (p) => formatMoney(p.salesPrice) },
    { key: 'variantCount', header: 'Variants', align: 'right' },
    {
      key: 'isActive',
      header: 'Active',
      render: (p) =>
        isAdmin ? (
          // Stop the row click so toggling doesn't also open the product.
          <div onClick={(e) => e.stopPropagation()}>
            <Switch checked={p.isActive} onChange={() => setToggling(p)} label={<span className="sr-only">Active</span>} />
          </div>
        ) : p.isActive ? (
          <Badge tone="success">Active</Badge>
        ) : (
          <Badge>Archived</Badge>
        ),
    },
  ]

  return (
    <>
      <PageHeader
        title="Products"
        subtitle="What Brightloop sells, with variants like Brand: Odoo (+₹560)"
        actions={
          isAdmin && (
            <Button onClick={() => navigate('/app/products/new')}>
              <Plus className="h-4 w-4" /> New product
            </Button>
          )
        }
      />
      <Card className="p-4">
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Tabs tabs={TABS} value={type} onChange={(key) => setParam('type', key)} />
          <SearchInput value={q} onChange={(v) => setParam('q', v)} placeholder="Search products" />
        </div>
        {isError ? (
          <p className="py-8 text-center text-sm text-danger-600">{errorMessage(error, 'Could not load products')}</p>
        ) : (
          <>
            <DataTable
              columns={columns}
              rows={data?.data ?? []}
              rowKey={(p) => p.id}
              loading={isLoading}
              onRowClick={(p) => navigate(`/app/products/${p.id}`)}
              emptyTitle={q || type ? 'No products match these filters' : 'No products yet'}
              emptyDescription={isAdmin && !q ? 'Add a product such as Brightloop CRM to sell it on subscriptions.' : undefined}
            />
            {data && data.meta.total > 0 && (
              <Pagination page={page} limit={LIMIT} total={data.meta.total} onChange={(p) => setParam('page', String(p))} />
            )}
          </>
        )}
      </Card>
      <ConfirmDialog
        open={!!toggling}
        title={toggling?.isActive ? 'Archive product?' : 'Restore product?'}
        message={
          toggling?.isActive
            ? `${toggling.name} will no longer be offered on new subscriptions. Existing subscriptions keep it.`
            : `${toggling?.name} will be available on new subscriptions again.`
        }
        confirmLabel={toggling?.isActive ? 'Archive' : 'Restore'}
        loading={setActive.isPending}
        onConfirm={confirmToggle}
        onCancel={() => setToggling(null)}
      />
    </>
  )
}
