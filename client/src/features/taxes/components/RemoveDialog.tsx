import { useEffect, useState } from 'react'
import { ConfirmDialog, useToast } from '@/components/ui'
import { ApiError, errorMessage } from '@/lib/api'

type Item = { id: number; name: string; usageCount: number; isActive?: boolean }

type Props = {
  item: Item | null
  what: string
  onDelete: (id: number) => Promise<unknown>
  /** Omit for records without an active flag; in-use records can then only be kept. */
  onDeactivate?: (id: number) => Promise<unknown>
  onClose: () => void
}

/** Delete when unused; when in use, offer to deactivate instead (the server also enforces this with 409 IN_USE). */
export function RemoveDialog({ item, what, onDelete, onDeactivate, onClose }: Props) {
  const toast = useToast()
  const [inUse, setInUse] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => setInUse(!!item && item.usageCount > 0), [item])

  if (!item) return null
  const canDeactivate = !!onDeactivate && item.isActive !== false

  async function run() {
    if (!item) return
    setBusy(true)
    try {
      if (inUse) {
        if (canDeactivate) {
          await onDeactivate!(item.id)
          toast.success(`${item.name} deactivated`)
        }
      } else {
        await onDelete(item.id)
        toast.success(`${item.name} deleted`)
      }
      onClose()
    } catch (err) {
      if (err instanceof ApiError && err.code === 'IN_USE') setInUse(true)
      else toast.error(errorMessage(err, `Could not remove ${what}`))
    } finally {
      setBusy(false)
    }
  }

  if (inUse) {
    return (
      <ConfirmDialog
        open
        title={`${item.name} is in use`}
        message={
          canDeactivate
            ? `This ${what} is used by other records, so it can't be deleted. Deactivate it instead? It stays on existing records but can't be picked for new ones.`
            : `This ${what} is used by other records, so it can't be deleted.`
        }
        confirmLabel={canDeactivate ? 'Deactivate' : 'OK'}
        loading={busy}
        onConfirm={canDeactivate ? run : onClose}
        onCancel={onClose}
      />
    )
  }

  return (
    <ConfirmDialog
      open
      title={`Delete ${what}?`}
      message={`${item.name} will be permanently deleted.`}
      confirmLabel="Delete"
      tone="danger"
      loading={busy}
      onConfirm={run}
      onCancel={onClose}
    />
  )
}
