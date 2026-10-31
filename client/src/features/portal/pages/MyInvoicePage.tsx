import { useParams } from 'react-router-dom'
import { Printer } from 'lucide-react'
import { Button, Card, PageHeader, PageSpinner } from '@/components/ui'
import { errorMessage } from '@/lib/api'
import { formatDate, formatMoney } from '@/lib/format'
import { useMyInvoice } from '../api'
import { InvoiceStatusBadge } from '../components/InvoiceStatusBadge'

export function MyInvoicePage() {
  const id = Number(useParams().id)
  const { data: inv, isLoading, isError, error } = useMyInvoice(id)

  if (isLoading) return <PageSpinner />
  if (isError || !inv) return <p className="py-10 text-center text-sm text-danger-600">{errorMessage(error, 'Invoice not found')}</p>

  return (
    <>
      <div className="print:hidden">
        <PageHeader
          title={inv.number}
          breadcrumbs={[{ label: 'My invoices', to: '/my/invoices' }, { label: inv.number ?? '' }]}
          actions={
            <Button variant="secondary" onClick={() => window.print()}>
              <Printer className="h-4 w-4" /> Print / Save PDF
            </Button>
          }
        />
      </div>

      <Card className="p-6 sm:p-8 print:border-0 print:shadow-none">
        <div className="flex flex-col gap-6 sm:flex-row sm:justify-between">
          <div>
            <div className="text-lg font-bold text-primary-700">Brightloop Software</div>
            <div className="text-sm text-gray-500">billing@brightloop.example</div>
          </div>
          <div className="sm:text-right">
            <div className="text-2xl font-semibold tracking-tight text-gray-900">INVOICE</div>
            <div className="font-medium text-gray-700">{inv.number}</div>
            <div className="mt-1">
              <InvoiceStatusBadge status={inv.status} />
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-6 text-sm sm:grid-cols-2">
          <div>
            <div className="text-xs font-semibold tracking-wide text-gray-500 uppercase">Bill to</div>
            <div className="mt-1 font-medium text-gray-900">{inv.billingName}</div>
            <div className="text-gray-600">{inv.billingEmail}</div>
            {inv.billingAddress && <div className="text-gray-600">{inv.billingAddress}</div>}
          </div>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1 sm:justify-self-end">
            <dt className="text-gray-500">Invoice date</dt>
            <dd className="text-right">{formatDate(inv.invoiceDate)}</dd>
            <dt className="text-gray-500">Due date</dt>
            <dd className="text-right">{formatDate(inv.dueDate)}</dd>
            <dt className="text-gray-500">Service period</dt>
            <dd className="text-right">
              {formatDate(inv.periodStart)} – {formatDate(inv.periodEnd)}
            </dd>
            <dt className="text-gray-500">Subscription</dt>
            <dd className="text-right">{inv.subscription.number}</dd>
            <dt className="text-gray-500">Payment terms</dt>
            <dd className="text-right">{inv.subscription.paymentTerm.name}</dd>
          </dl>
        </div>

        <table className="mt-8 w-full text-sm">
          <thead>
            <tr className="border-b border-gray-300 text-left text-xs tracking-wide text-gray-500 uppercase">
              <th className="py-2">Description</th>
              <th className="py-2 text-right">Qty</th>
              <th className="py-2 text-right">Unit price</th>
              <th className="py-2 text-right">Discount</th>
              <th className="py-2">Taxes</th>
              <th className="py-2 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {inv.lines.map((l) => (
              <tr key={l.id} className="border-b border-gray-100">
                <td className="py-2 pr-2">{l.description}</td>
                <td className="py-2 text-right">{l.quantity}</td>
                <td className="py-2 text-right">{formatMoney(l.unitPrice)}</td>
                <td className="py-2 text-right">{Number(l.discountAmount) ? `− ${formatMoney(l.discountAmount)}` : '—'}</td>
                <td className="py-2 pl-2">{l.taxes.map((t) => t.name).join(', ') || '—'}</td>
                <td className="py-2 text-right">{formatMoney(l.amountUntaxed)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <dl className="mt-6 ml-auto w-full max-w-xs space-y-1 text-sm">
          {(
            [
              ['Untaxed', inv.amountUntaxed],
              ...(Number(inv.amountDiscount) ? [['Discount', `-${inv.amountDiscount}`]] : []),
              ['Tax', inv.amountTax],
            ] as [string, string][]
          ).map(([k, v]) => (
            <div key={k} className="flex justify-between text-gray-600">
              <dt>{k}</dt>
              <dd>{formatMoney(v)}</dd>
            </div>
          ))}
          <div className="flex justify-between border-t border-gray-300 pt-1 text-base font-semibold text-gray-900">
            <dt>Total</dt>
            <dd>{formatMoney(inv.amountTotal)}</dd>
          </div>
          <div className="flex justify-between text-gray-600">
            <dt>Paid</dt>
            <dd>{formatMoney(inv.amountPaid)}</dd>
          </div>
          <div className="flex justify-between font-semibold text-gray-900">
            <dt>Amount due</dt>
            <dd>{formatMoney(inv.amountDue)}</dd>
          </div>
        </dl>

        {inv.payments.length > 0 && (
          <div className="mt-8 text-sm">
            <div className="mb-2 text-xs font-semibold tracking-wide text-gray-500 uppercase">Payments received</div>
            {inv.payments.map((p) => (
              <div key={p.id} className="flex justify-between border-b border-gray-100 py-1.5 text-gray-700">
                <span>
                  {formatDate(p.date)} · {p.method.name}
                </span>
                <span>{formatMoney(p.amount)}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </>
  )
}
