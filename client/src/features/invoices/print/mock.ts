import type { InvoicePrintData } from './types';

const company = {
  name: 'Brightloop Software',
  address: '4th Floor, Prestige Tech Park, Bengaluru, KA 560103, India',
  email: 'billing@brightloop.dev',
  taxId: 'GSTIN 29ABCDE1234F1Z5',
};

/** Paid invoice with a discount and two taxes applied. */
export const mockPaidInvoice: InvoicePrintData = {
  company,
  invoice: {
    number: 'INV-2026-00142',
    state: 'PAID',
    invoiceDate: '2026-11-01',
    dueDate: '2026-11-15',
    periodStart: '2026-11-01',
    periodEnd: '2026-11-30',
    subscriptionNumber: 'SUB-2026-0057',
    paymentTerm: 'Net 15',
  },
  customer: {
    name: 'Odoo India Pvt Ltd',
    email: 'accounts@odoo-india.example',
    address: '12 MG Road, Bengaluru, KA 560001, India',
  },
  lines: [
    {
      description: 'BillCycle Pro — Monthly subscription',
      quantity: 1,
      unitPrice: '4999.00',
      discount: '10%',
      taxes: ['CGST 9%', 'SGST 9%'],
      amount: '4499.10',
    },
    {
      description: 'Add-on: Priority support',
      quantity: 1,
      unitPrice: '999.00',
      discount: '-',
      taxes: ['CGST 9%', 'SGST 9%'],
      amount: '999.00',
    },
  ],
  totals: {
    untaxed: '5498.10',
    discount: '499.90',
    tax: '989.66',
    total: '6487.76',
    paid: '6487.76',
    due: '0.00',
  },
  taxBreakdown: [
    { name: 'CGST 9%', amount: '494.83' },
    { name: 'SGST 9%', amount: '494.83' },
  ],
  currency: 'INR',
};

/** Draft invoice with a long list of lines, to exercise page-break/continuation. */
export const mockDraftInvoice: InvoicePrintData = {
  company,
  invoice: {
    number: null,
    state: 'DRAFT',
    invoiceDate: '2026-11-01',
    dueDate: '2026-11-30',
    periodStart: '2026-11-01',
    periodEnd: '2026-11-30',
    subscriptionNumber: 'SUB-2026-0091',
    paymentTerm: 'Net 30',
  },
  customer: {
    name: 'Flux Robotics LLP',
    email: 'finance@fluxrobotics.example',
    address: '88 Residency Road, Pune, MH 411001, India',
  },
  lines: Array.from({ length: 40 }, (_, i) => ({
    description: `Seat — ${['Engineering', 'Design', 'Sales', 'Support', 'Operations', 'Finance'][i % 6]} #${i + 1}`,
    quantity: 1,
    unitPrice: '299.00',
    discount: '-',
    taxes: ['IGST 18%'],
    amount: '352.82',
  })),
  totals: {
    untaxed: '11960.00',
    discount: '0.00',
    tax: '2152.80',
    total: '14112.80',
    paid: '0.00',
    due: '14112.80',
  },
  taxBreakdown: [{ name: 'IGST 18%', amount: '2152.80' }],
  currency: 'INR',
};
