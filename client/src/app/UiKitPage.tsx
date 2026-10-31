import { useState } from 'react'
import { DollarSign } from 'lucide-react'
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  Checkbox,
  ConfirmDialog,
  DataTable,
  EmptyState,
  FormField,
  Input,
  KpiCard,
  Modal,
  PageHeader,
  Pagination,
  SearchInput,
  Select,
  Spinner,
  StateBadge,
  StatusBar,
  Switch,
  Tabs,
  Textarea,
  useToast,
  type Column,
} from '@/components/ui'
import { formatDate, formatMoney } from '@/lib/format'

type Row = { id: number; number: string; customer: string; state: string; total: string; date: string }

const rows: Row[] = [
  { id: 1, number: 'SUB/2026/00001', customer: 'Acme Retail', state: 'ACTIVE', total: '1760.00', date: '2026-10-01' },
  { id: 2, number: 'SUB/2026/00002', customer: 'Northwind Pvt Ltd', state: 'QUOTATION', total: '11798.82', date: '2026-10-12' },
  { id: 3, number: 'SUB/2026/00003', customer: 'Blue Mart', state: 'PAUSED', total: '999.00', date: '2026-09-20' },
]

const columns: Column<Row>[] = [
  { key: 'number', header: 'Number', render: (r) => <span className="font-medium">{r.number}</span> },
  { key: 'customer', header: 'Customer' },
  { key: 'date', header: 'Start', render: (r) => formatDate(r.date) },
  { key: 'state', header: 'Status', render: (r) => <StateBadge state={r.state} /> },
  { key: 'total', header: 'Total', align: 'right', render: (r) => formatMoney(r.total) },
]

const STATES = ['DRAFT', 'QUOTATION', 'CONFIRMED', 'ACTIVE', 'PAUSED', 'CLOSED', 'PAID', 'CANCELLED', 'OVERDUE', 'PARTIAL', 'OUTSTANDING']

/** Dev page showing every shared component (open /app/ui-kit). */
export function UiKitPage() {
  const toast = useToast()
  const [tab, setTab] = useState('all')
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [on, setOn] = useState(true)
  const [modal, setModal] = useState(false)
  const [confirm, setConfirm] = useState(false)

  return (
    <>
      <PageHeader
        title="UI kit"
        subtitle="Shared components. Use these instead of building your own."
        breadcrumbs={[{ label: 'Home', to: '/app/dashboard' }, { label: 'UI kit' }]}
        actions={<Button onClick={() => toast.success('Saved successfully')}>Primary action</Button>}
      />

      <div className="grid gap-6">
        <Card>
          <CardHeader title="Buttons" />
          <CardBody className="flex flex-wrap gap-2">
            <Button>Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="danger">Danger</Button>
            <Button variant="ghost">Ghost</Button>
            <Button loading>Saving</Button>
            <Button size="sm">Small</Button>
            <Button disabled>Disabled</Button>
            <Button variant="secondary" onClick={() => toast.error('Something went wrong')}>
              Error toast
            </Button>
            <Button variant="secondary" onClick={() => setModal(true)}>
              Open modal
            </Button>
            <Button variant="danger" onClick={() => setConfirm(true)}>
              Confirm dialog
            </Button>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Form controls" />
          <CardBody className="grid gap-4 md:grid-cols-2">
            <FormField label="Name" htmlFor="kit-name" required hint="Helper text">
              <Input id="kit-name" placeholder="Brightloop CRM" />
            </FormField>
            <FormField label="Email" htmlFor="kit-email" error="Enter a valid email address">
              <Input id="kit-email" invalid defaultValue="not-an-email" />
            </FormField>
            <FormField label="Billing period" htmlFor="kit-period">
              <Select
                id="kit-period"
                placeholder="Select…"
                options={[
                  { value: 'MONTHLY', label: 'Monthly' },
                  { value: 'YEARLY', label: 'Yearly' },
                ]}
              />
            </FormField>
            <FormField label="Start date" htmlFor="kit-date">
              <Input id="kit-date" type="date" />
            </FormField>
            <FormField label="Notes" htmlFor="kit-notes" className="md:col-span-2">
              <Textarea id="kit-notes" placeholder="Internal notes" />
            </FormField>
            <div className="flex flex-wrap items-center gap-6">
              <Checkbox id="kit-check" label="Auto-close" defaultChecked />
              <Switch id="kit-switch" checked={on} onChange={setOn} label="Pausable" />
              <Spinner />
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Status" />
          <CardBody className="space-y-4">
            <StatusBar
              current="CONFIRMED"
              steps={[
                { key: 'DRAFT', label: 'Draft' },
                { key: 'QUOTATION', label: 'Quotation' },
                { key: 'CONFIRMED', label: 'Confirmed' },
                { key: 'ACTIVE', label: 'Active' },
                { key: 'CLOSED', label: 'Closed' },
              ]}
            />
            <div className="flex flex-wrap gap-2">
              {STATES.map((s) => (
                <StateBadge key={s} state={s} />
              ))}
              <Badge tone="primary">Custom badge</Badge>
            </div>
          </CardBody>
        </Card>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard label="Active subscriptions" value="1,284" hint="+32 this month" />
          <KpiCard label="MRR" value={formatMoney(452300)} hint="ARR ₹54.3L" icon={<DollarSign className="h-4 w-4" />} />
          <KpiCard label="Collected" value={formatMoney(389120)} tone="success" />
          <KpiCard label="Overdue" value={formatMoney(42800)} hint="18 invoices" tone="danger" onClick={() => toast.info('Drill-down')} />
        </div>

        <Card>
          <CardHeader title="List" actions={<SearchInput value={search} onChange={setSearch} />} />
          <CardBody>
            <Tabs
              value={tab}
              onChange={setTab}
              tabs={[
                { key: 'all', label: 'All', count: 3 },
                { key: 'active', label: 'Active', count: 1 },
                { key: 'quotation', label: 'Quotation', count: 1 },
              ]}
            />
            <DataTable columns={columns} rows={rows} rowKey={(r) => r.id} onRowClick={(r) => toast.info(r.number)} />
            <Pagination page={page} limit={20} total={57} onChange={setPage} />
            <DataTable columns={columns} rows={[]} loading className="mt-4" />
            <DataTable columns={columns} rows={[]} emptyTitle="No subscriptions yet" emptyDescription="Create one from a quotation template." className="mt-4" />
          </CardBody>
        </Card>

        <Card>
          <EmptyState title="Empty state" description="Use this when a list or section has no data." action={<Button size="sm">Create</Button>} />
        </Card>
      </div>

      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title="Register payment"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModal(false)}>
              Cancel
            </Button>
            <Button onClick={() => setModal(false)}>Save</Button>
          </>
        }
      >
        <FormField label="Amount" htmlFor="kit-amount">
          <Input id="kit-amount" type="number" defaultValue="1760.00" />
        </FormField>
      </Modal>
      <ConfirmDialog
        open={confirm}
        title="Cancel invoice?"
        message="This cannot be undone."
        confirmLabel="Cancel invoice"
        tone="danger"
        onConfirm={() => setConfirm(false)}
        onCancel={() => setConfirm(false)}
      />
    </>
  )
}
