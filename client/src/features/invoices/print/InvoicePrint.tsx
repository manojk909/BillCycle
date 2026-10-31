import './invoice-print.css';
import type { InvoicePrintData } from './types';
import { formatDate, formatMoney } from '@/lib/format';

const STAMP_LABEL: Record<InvoicePrintData['invoice']['state'], string> = {
  DRAFT: 'Draft',
  CONFIRMED: 'Confirmed',
  PAID: 'Paid',
  CANCELLED: 'Cancelled',
};

export function InvoicePrint({ data }: { data: InvoicePrintData }) {
  const { company, invoice, customer, lines, totals, taxBreakdown, currency } = data;
  const money = (value: string) => formatMoney(value, currency);
  const stampModifier = invoice.state.toLowerCase();

  return (
    <div className="invoice-print-page">
      <div className="invoice-print">
        <header className="invoice-print__header">
          <div className="invoice-print__company">
            <p className="invoice-print__company-name">{company.name}</p>
            <p className="invoice-print__company-address">{company.address}</p>
            <p className="invoice-print__company-email">{company.email}</p>
            {company.taxId && <p className="invoice-print__company-taxid">{company.taxId}</p>}
          </div>
          <div className="invoice-print__meta">
            <p className="invoice-print__title">INVOICE</p>
            <p className="invoice-print__number">{invoice.number ?? 'DRAFT'}</p>
            <div className="invoice-print__dates">
              <p>Invoice date: {formatDate(invoice.invoiceDate)}</p>
              <p>Due date: {formatDate(invoice.dueDate)}</p>
            </div>
            <span className={`invoice-print__stamp invoice-print__stamp--${stampModifier}`}>
              {STAMP_LABEL[invoice.state]}
            </span>
          </div>
        </header>

        <section className="invoice-print__parties">
          <div className="invoice-print__bill-to">
            <p className="invoice-print__block-label">Bill to</p>
            <p>
              <strong>{customer.name}</strong>
            </p>
            <p>{customer.address}</p>
            <p>{customer.email}</p>
          </div>
          <div className="invoice-print__period">
            <p className="invoice-print__block-label">Subscription</p>
            <p>
              Service period: {formatDate(invoice.periodStart)} – {formatDate(invoice.periodEnd)}
            </p>
            <p>Subscription: {invoice.subscriptionNumber}</p>
            <p>Payment term: {invoice.paymentTerm}</p>
          </div>
        </section>

        <table className="invoice-print__lines">
          <thead>
            <tr>
              <th>Description</th>
              <th className="num">Qty</th>
              <th className="num">Unit price</th>
              <th className="num">Discount</th>
              <th>Taxes</th>
              <th className="num">Amount</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line, i) => (
              <tr key={i}>
                <td>{line.description}</td>
                <td className="num">{line.quantity}</td>
                <td className="num">{money(line.unitPrice)}</td>
                <td className="num">{line.discount}</td>
                <td>{line.taxes.join(', ') || '-'}</td>
                <td className="num">{money(line.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <section className="invoice-print__summary">
          <div className="invoice-print__tax-breakdown">
            {taxBreakdown.length > 0 && (
              <>
                <p className="invoice-print__block-label">Tax breakdown</p>
                <table>
                  <tbody>
                    {taxBreakdown.map((tax) => (
                      <tr key={tax.name}>
                        <td>{tax.name}</td>
                        <td>{money(tax.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </div>
          <div className="invoice-print__totals">
            <div className="invoice-print__totals-row">
              <span>Untaxed amount</span>
              <span>{money(totals.untaxed)}</span>
            </div>
            <div className="invoice-print__totals-row">
              <span>Discount</span>
              <span>-{money(totals.discount)}</span>
            </div>
            <div className="invoice-print__totals-row">
              <span>Tax</span>
              <span>{money(totals.tax)}</span>
            </div>
            <div className="invoice-print__totals-row invoice-print__totals-row--total">
              <span>Total</span>
              <span>{money(totals.total)}</span>
            </div>
            <div className="invoice-print__totals-row">
              <span>Paid</span>
              <span>{money(totals.paid)}</span>
            </div>
            <div className="invoice-print__totals-row invoice-print__totals-row--due">
              <span>Amount due</span>
              <span>{money(totals.due)}</span>
            </div>
          </div>
        </section>

        <footer className="invoice-print__footer">
          <p>Thank you for your business. This is a system-generated invoice from BillCycle.</p>
        </footer>
      </div>
    </div>
  );
}
