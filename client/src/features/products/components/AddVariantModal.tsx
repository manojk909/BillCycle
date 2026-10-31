import { useEffect, useState } from 'react'
import { Button, FormField, Input, Modal, Select, useToast } from '@/components/ui'
import { ApiError, errorMessage } from '@/lib/api'
import { formatMoney } from '@/lib/format'
import { useAttributeOptions } from '../attributes-api'
import { useAddVariant, type Product } from '../api'

type Props = { open: boolean; product: Product; onClose: () => void }

/** One select per attribute ("None" allowed), so a variant can never hold two values of the same attribute. */
export function AddVariantModal({ open, product, onClose }: Props) {
  const toast = useToast()
  const { data: attributes = [], isLoading } = useAttributeOptions()
  const add = useAddVariant(product.id)
  const [picked, setPicked] = useState<Record<number, number>>({})
  const [sku, setSku] = useState('')
  const [errors, setErrors] = useState<{ valueIds?: string; sku?: string }>({})

  useEffect(() => {
    if (open) {
      setPicked({})
      setSku('')
      setErrors({})
    }
  }, [open])

  const chosen = attributes.flatMap((a) => {
    const value = a.values.find((v) => v.id === picked[a.id])
    return value ? [{ attribute: a.name, ...value }] : []
  })
  const base = Number(product.salesPrice)
  const total = chosen.reduce((sum, v) => sum + Number(v.extraPrice), base)

  async function save() {
    if (!chosen.length) {
      setErrors({ valueIds: 'Pick at least one value; the default variant already covers "no values".' })
      return
    }
    try {
      await add.mutateAsync({ valueIds: chosen.map((v) => v.id), sku })
      toast.success('Variant added')
      onClose()
    } catch (err) {
      if (err instanceof ApiError && err.fields) setErrors(err.fields)
      else toast.error(errorMessage(err, 'Could not add variant'))
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Add variant to ${product.name}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} loading={add.isPending} disabled={!attributes.length}>
            Add variant
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {isLoading ? (
          <p className="text-sm text-gray-500">Loading attributes…</p>
        ) : attributes.length === 0 ? (
          <p className="text-sm text-gray-500">No attributes yet. Create one (e.g. Brand) under Configuration → Attributes first.</p>
        ) : (
          attributes.map((a) => (
            <FormField key={a.id} label={a.name} htmlFor={`attr-${a.id}`}>
              <Select
                id={`attr-${a.id}`}
                placeholder="None"
                value={picked[a.id] ?? ''}
                options={a.values.map((v) => ({ value: v.id, label: `${v.name} (+${formatMoney(v.extraPrice)})` }))}
                onChange={(e) => {
                  const id = Number(e.target.value)
                  setPicked((p) => {
                    const next = { ...p }
                    if (id) next[a.id] = id
                    else delete next[a.id]
                    return next
                  })
                  setErrors((x) => ({ ...x, valueIds: undefined }))
                }}
              />
            </FormField>
          ))
        )}
        {errors.valueIds && (
          <p role="alert" className="text-xs text-danger-600">
            {errors.valueIds}
          </p>
        )}
        <FormField label="SKU" htmlFor="variant-sku" error={errors.sku} hint="Optional, must be unique">
          <Input id="variant-sku" value={sku} invalid={!!errors.sku} onChange={(e) => setSku(e.target.value)} placeholder="CRM-ODOO" />
        </FormField>

        <div className="rounded-md bg-gray-50 px-4 py-3 text-sm">
          <div className="text-gray-500">Variant price</div>
          <div className="mt-1 font-medium text-gray-900">
            {formatMoney(base)}
            {chosen.map((v) => (
              <span key={v.id}>
                {' + '}
                {formatMoney(v.extraPrice)} <span className="text-xs font-normal text-gray-500">({v.name})</span>
              </span>
            ))}
            {' = '}
            <span className="text-primary-700">{formatMoney(total)}</span>
          </div>
        </div>
      </div>
    </Modal>
  )
}
