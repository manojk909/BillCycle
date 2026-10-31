import { useState } from 'react'
import { Card, CardBody, CardHeader, FormField, PageHeader } from '@/components/ui'
import { VariantPicker } from '../components/VariantPicker'
import type { VariantOption } from '../api'

/** Standalone check for the picker that subscription (SK3) and template (S6) lines reuse. */
export function VariantPickerDemoPage() {
  const [value, setValue] = useState<VariantOption | null>(null)
  return (
    <>
      <PageHeader
        title="Variant picker"
        subtitle="The product picker used on subscription and quotation template lines"
        breadcrumbs={[{ label: 'Products', to: '/app/products' }, { label: 'Variant picker' }]}
      />
      <Card className="max-w-xl">
        <CardHeader title="Try it" />
        <CardBody className="space-y-4">
          <FormField label="Product" htmlFor="demo-variant">
            <VariantPicker id="demo-variant" value={value} onChange={setValue} />
          </FormField>
          <div>
            <div className="mb-1 text-xs font-medium tracking-wide text-gray-500 uppercase">Returned value</div>
            <pre className="overflow-x-auto rounded-md bg-gray-50 p-3 text-xs text-gray-800">{JSON.stringify(value, null, 2)}</pre>
          </div>
        </CardBody>
      </Card>
    </>
  )
}
