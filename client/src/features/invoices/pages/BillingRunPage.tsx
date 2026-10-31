import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Button, Card, CardBody, CardHeader, DataTable, FormField, Input, PageHeader, useToast, type Column } from '@/components/ui'
import { api, errorMessage, type ApiItem, type ApiList } from '@/lib/api'
import { formatDate, toDateInput } from '@/lib/format'

type Preview = { subscriptions: number; periods: number }
type RunResult = { runId: number; created: number; skipped: number; failed: number; errors: { subscriptionId: number; error: string }[] }
type BillingRun = {
  id: number
  upTo: string
  startedAt: string
  finishedAt: string | null
  created: number
  skipped: number
  failed: number
  triggeredBy: { id: number; name: string } | null
}

function useRuns() {
  return useQuery({
    queryKey: ['billing', 'runs'],
    queryFn: () => api.get<ApiList<BillingRun>>('/billing/runs', { limit: 20 }),
  })
}

export function BillingRunPage() {
  const toast = useToast()
  const [upTo, setUpTo] = useState(toDateInput(new Date()))
  const [preview, setPreview] = useState<Preview | null>(null)
  const [result, setResult] = useState<RunResult | null>(null)
  const runs = useRuns()

  const previewMut = useMutation({
    mutationFn: () => api.get<ApiItem<Preview>>('/billing/preview', { upTo }).then((r) => r.data),
    onSuccess: (p) => setPreview(p),
    onError: (e) => toast.error(errorMessage(e, 'Could not preview')),
  })

  const runMut = useMutation({
    mutationFn: () => api.post<ApiItem<RunResult>>('/billing/run', { upTo }).then((r) => r.data),
    onSuccess: (r) => {
      setResult(r)
      toast.success(`Billing complete: ${r.created} created, ${r.skipped} skipped, ${r.failed} failed`)
      runs.refetch()
    },
    onError: (e) => toast.error(errorMessage(e, 'Billing run failed')),
  })

  const columns: Column<BillingRun>[] = [
    { key: 'upTo', header: 'Up to', render: (r) => formatDate(r.upTo) },
    { key: 'startedAt', header: 'Started', render: (r) => formatDate(r.startedAt) },
    { key: 'created', header: 'Created', align: 'right' },
    { key: 'skipped', header: 'Skipped', align: 'right' },
    { key: 'failed', header: 'Failed', align: 'right' },
    { key: 'finishedAt', header: 'Status', render: (r) => (r.finishedAt ? 'Done' : 'Running…') },
    { key: 'triggeredBy', header: 'By', render: (r) => r.triggeredBy?.name ?? 'System' },
  ]

  return (
    <>
      <PageHeader title="Run billing" subtitle="Generate invoices for every subscription due up to a date" />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader title="New run" />
          <CardBody className="space-y-4">
            <FormField label="Bill up to" required>
              <Input type="date" value={upTo} onChange={(e) => setUpTo(e.target.value)} />
            </FormField>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => previewMut.mutate()} loading={previewMut.isPending}>
                Preview
              </Button>
              <Button onClick={() => runMut.mutate()} loading={runMut.isPending}>
                Run billing
              </Button>
            </div>
            {preview && (
              <p className="rounded-md bg-gray-50 px-3 py-2 text-sm text-gray-700">
                <strong>{preview.subscriptions}</strong> subscription(s) due, <strong>{preview.periods}</strong> period(s) to bill.
              </p>
            )}
            {result && (
              <div className="rounded-md border border-gray-200 p-3 text-sm">
                <p className="font-medium text-gray-900">Last run</p>
                <p className="text-success-700">{result.created} created</p>
                <p className="text-gray-600">{result.skipped} skipped</p>
                {result.failed > 0 && <p className="text-danger-600">{result.failed} failed</p>}
                {result.errors.slice(0, 5).map((e) => (
                  <p key={e.subscriptionId} className="mt-1 text-xs text-danger-600">
                    #{e.subscriptionId}: {e.error}
                  </p>
                ))}
              </div>
            )}
          </CardBody>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title="History" />
          <CardBody>
            <DataTable columns={columns} rows={runs.data?.data ?? []} rowKey={(r) => r.id} loading={runs.isLoading} emptyTitle="No billing runs yet" />
          </CardBody>
        </Card>
      </div>
    </>
  )
}
