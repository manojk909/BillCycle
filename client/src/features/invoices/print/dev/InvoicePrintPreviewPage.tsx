// Dev-only page for eyeballing the print layout against the mocks.
// Not registered in any router: `features/invoices/routes.tsx` is Shubham's
// module (SK7). Whoever wires up the real invoice detail page can import
// `<InvoicePrint data={buildInvoicePrintData(...)} />` directly; this preview
// page is just for visually checking the layout against the two mocks.
import { useState } from 'react';
import { InvoicePrint } from '../InvoicePrint';
import { mockDraftInvoice, mockPaidInvoice } from '../mock';

const MOCKS = {
  paid: { label: 'Paid (discount + 2 taxes)', data: mockPaidInvoice },
  draft: { label: 'Draft (long line list)', data: mockDraftInvoice },
} as const;

export function InvoicePrintPreviewPage() {
  const [key, setKey] = useState<keyof typeof MOCKS>('paid');

  return (
    <div>
      <div className="no-print" style={{ padding: 16, display: 'flex', gap: 8 }}>
        {(Object.keys(MOCKS) as (keyof typeof MOCKS)[]).map((k) => (
          <button key={k} type="button" onClick={() => setKey(k)} disabled={k === key}>
            {MOCKS[k].label}
          </button>
        ))}
        <button type="button" onClick={() => window.print()}>
          Print
        </button>
      </div>
      <InvoicePrint data={MOCKS[key].data} />
    </div>
  );
}
