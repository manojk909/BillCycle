import { useNavigate, useSearchParams } from 'react-router-dom'
import { FilePlus2, Plus } from 'lucide-react'
import { Button, Card, DataTable, PageHeader, Pagination, SearchInput, type Column } from '@/components/ui'
import { errorMessage } from '@/lib/api'
import { formatMoney, formatPeriod } from '@/lib/format'
import { useTemplates, type TemplateRow } from '../api'

const LIMIT = 20

export function TemplatesListPage() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const page = Number(params.get('page') ?? 1)
  const q = params.get('q') ?? ''
  const { data, isLoading, isError, error } = useTemplates({ page, limit: LIMIT, q: q || undefined })

  function setParam(key: string, value: string) {
    const p = new URLSearchParams(params)
    if (value) p.set(key, value)
    else p.delete(key)
    if (key !== 'page') p.delete('page')
    setParams(p, { replace: true })
  }

  const columns: Column<TemplateRow>[] = [
    { key: 'name', header: 'Template', render: (t) => <span className="font-medium text-gray-900">{t.name}</span> },
    {
      key: 'plan',
      header: 'Plan',
      render: (t) => (
        <div>
          <div>{t.plan.name}</div>
          <div className="text-xs text-gray-500">
            {formatMoney(t.plan.price)} / {formatPeriod(t.plan.billingPeriod, t.plan.billingInterval)}
          </div>
        </div>
      ),
    },
    { key: 'lineCount', header: 'Add-on lines', align: 'right' },
    { key: 'validityDays', header: 'Valid for', render: (t) => `${t.validityDays} day${t.validityDays === 1 ? '' : 's'}` },
    { key: 'subscriptionCount', header: 'Used', align: 'right' },
    {
      key: 'use',
      header: '',
      align: 'right',
      render: (t) => (
        <Button
          variant="secondary"
          size="sm"
          disabled={!t.plan.isActive}
          title={t.plan.isActive ? undefined : 'The plan is archived'}
          onClick={(e) => {
            e.stopPropagation()
            navigate(`/app/subscriptions/new?templateId=${t.id}`)
          }}
        >
          <FilePlus2 className="h-4 w-4" /> Use template
        </Button>
      ),
    },
  ]

  return (
    <>
      <PageHeader
        title="Quotation templates"
        subtitle="Ready-made plan and product lines to start a quotation quickly"
        actions={
          <Button onClick={() => navigate('/app/templates/new')}>
            <Plus className="h-4 w-4" /> New template
          </Button>
        }
      />
      <Card className="p-4">
        <div className="mb-3 flex justify-end">
          <SearchInput value={q} onChange={(v) => setParam('q', v)} placeholder="Search template or plan" />
        </div>
        {isError ? (
          <p className="py-8 text-center text-sm text-danger-600">{errorMessage(error, 'Could not load templates')}</p>
        ) : (
          <>
            <DataTable
              columns={columns}
              rows={data?.data ?? []}
              rowKey={(t) => t.id}
              loading={isLoading}
              onRowClick={(t) => navigate(`/app/templates/${t.id}`)}
              emptyTitle={q ? 'No templates match your search' : 'No quotation templates yet'}
              emptyDescription={q ? undefined : 'Save a plan with its usual add-ons to reuse it for every new quotation.'}
            />
            {data && data.meta.total > 0 && (
              <Pagination page={page} limit={LIMIT} total={data.meta.total} onChange={(p) => setParam('page', String(p))} />
            )}
          </>
        )}
      </Card>
    </>
  )
}
