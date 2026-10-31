import { useEffect } from 'react'
import { useFieldArray, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Trash2 } from 'lucide-react'
import { Button, FormField, Input, Modal, useToast } from '@/components/ui'
import { errorMessage } from '@/lib/api'
import { applyServerErrors } from '@/lib/form'
import { useSaveAttribute, type Attribute } from '../attributes-api'

const schema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(60, 'Name is too long'),
  values: z
    .array(
      z.object({
        id: z.number().optional(),
        name: z.string().trim().min(1, 'Value name is required').max(60, 'Name is too long'),
        extraPrice: z
          .string()
          .trim()
          .regex(/^\d+(\.\d{1,2})?$/, 'Enter 0 or more (up to 2 decimals)'),
      }),
    )
    .min(1, 'Add at least one value')
    .superRefine((values, ctx) => {
      const seen = new Set<string>()
      values.forEach((v, i) => {
        const key = v.name.trim().toLowerCase()
        if (key && seen.has(key)) ctx.addIssue({ code: 'custom', path: [i, 'name'], message: 'This value is already in the list' })
        seen.add(key)
      })
    }),
})
type FormValues = z.infer<typeof schema>

const emptyRow = { name: '', extraPrice: '0' }

export function AttributeFormModal({ open, attribute, onClose }: { open: boolean; attribute: Attribute | null; onClose: () => void }) {
  const toast = useToast()
  const save = useSaveAttribute(attribute?.id ?? null)
  const {
    register,
    control,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), mode: 'onBlur' })
  const { fields, append, remove } = useFieldArray({ control, name: 'values', keyName: 'key' })

  useEffect(() => {
    if (!open) return
    reset(
      attribute
        ? { name: attribute.name, values: attribute.values.map((v) => ({ id: v.id, name: v.name, extraPrice: v.extraPrice })) }
        : { name: '', values: [{ ...emptyRow }] },
    )
  }, [open, attribute, reset])

  // Stored values that variants use can't be removed (the server enforces this too).
  const usage = new Map(attribute?.values.map((v) => [v.id, v.variantCount]) ?? [])

  function removeRow(index: number) {
    const row = fields[index]
    const used = row.id ? (usage.get(row.id) ?? 0) : 0
    if (used) {
      toast.error(`${row.name} is used by ${used} product variant${used === 1 ? '' : 's'} and can't be removed`)
      return
    }
    remove(index)
  }

  async function onSubmit(values: FormValues) {
    try {
      await save.mutateAsync(values)
      toast.success(attribute ? 'Attribute updated' : 'Attribute created')
      onClose()
    } catch (err) {
      if (!applyServerErrors(err, setError)) toast.error(errorMessage(err, 'Could not save attribute'))
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={attribute ? `Edit ${attribute.name}` : 'New attribute'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit(onSubmit)} loading={isSubmitting}>
            Save
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
        <FormField label="Attribute name" htmlFor="attr-name" error={errors.name?.message} required>
          <Input id="attr-name" autoFocus placeholder="Brand" invalid={!!errors.name} {...register('name')} />
        </FormField>

        <div>
          <div className="mb-2 grid grid-cols-[1fr_9rem_2.25rem] gap-2 text-xs font-medium tracking-wide text-gray-500 uppercase">
            <span>Value</span>
            <span>Extra price (₹)</span>
            <span />
          </div>
          <div className="space-y-2">
            {fields.map((row, i) => {
              const rowErrors = errors.values?.[i]
              const used = row.id ? (usage.get(row.id) ?? 0) : 0
              return (
                <div key={row.key} className="grid grid-cols-[1fr_9rem_2.25rem] items-start gap-2">
                  <div>
                    <Input aria-label={`Value ${i + 1} name`} placeholder="Odoo" invalid={!!rowErrors?.name} {...register(`values.${i}.name`)} />
                    {rowErrors?.name && <p className="mt-1 text-xs text-danger-600">{rowErrors.name.message}</p>}
                  </div>
                  <div>
                    <Input
                      aria-label={`Value ${i + 1} extra price`}
                      inputMode="decimal"
                      invalid={!!rowErrors?.extraPrice}
                      {...register(`values.${i}.extraPrice`)}
                    />
                    {rowErrors?.extraPrice && <p className="mt-1 text-xs text-danger-600">{rowErrors.extraPrice.message}</p>}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-9"
                    onClick={() => removeRow(i)}
                    disabled={fields.length === 1}
                    title={used ? `Used by ${used} variant${used === 1 ? '' : 's'}` : 'Remove value'}
                    aria-label={`Remove value ${i + 1}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )
            })}
          </div>
          {errors.values?.root?.message && <p className="mt-2 text-xs text-danger-600">{errors.values.root.message}</p>}
          {errors.values?.message && <p className="mt-2 text-xs text-danger-600">{errors.values.message}</p>}
          <Button variant="secondary" size="sm" className="mt-3" onClick={() => append({ ...emptyRow })}>
            <Plus className="h-4 w-4" /> Add value
          </Button>
        </div>
        <button type="submit" hidden />
      </form>
    </Modal>
  )
}
