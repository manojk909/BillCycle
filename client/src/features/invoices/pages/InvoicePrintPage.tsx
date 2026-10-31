import { useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { PageSpinner } from '@/components/ui'
import { InvoicePrint } from '../print/InvoicePrint'
import { useInvoicePrintData } from '../api'

/** Full-page print view: renders T2's InvoicePrint from /print-data, then opens the print dialog. */
export function InvoicePrintPage() {
  const { id } = useParams()
  const { data, isLoading } = useInvoicePrintData(Number(id))

  useEffect(() => {
    if (data) {
      const t = setTimeout(() => window.print(), 300)
      return () => clearTimeout(t)
    }
  }, [data])

  if (isLoading || !data) return <PageSpinner />
  return <InvoicePrint data={data} />
}
