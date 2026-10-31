export type InvoicePrintData = {
  company: { name: string; address: string; email: string; taxId?: string };
  invoice: {
    number: string | null;
    state: 'DRAFT' | 'CONFIRMED' | 'PAID' | 'CANCELLED';
    invoiceDate: string;
    dueDate: string;
    periodStart: string;
    periodEnd: string;
    subscriptionNumber: string;
    paymentTerm: string;
  };
  customer: { name: string; email: string; address: string };
  lines: {
    description: string;
    quantity: number;
    unitPrice: string;
    discount: string;
    taxes: string[];
    amount: string;
  }[];
  totals: { untaxed: string; discount: string; tax: string; total: string; paid: string; due: string };
  taxBreakdown: { name: string; amount: string }[];
  currency: string; // "INR"
};
