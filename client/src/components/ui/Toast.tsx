import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { CheckCircle2, XCircle, Info, X } from 'lucide-react'
import { cn } from '@/lib/cn'

type ToastKind = 'success' | 'error' | 'info'
type ToastItem = { id: number; kind: ToastKind; message: string }

type ToastApi = {
  success: (message: string) => void
  error: (message: string) => void
  info: (message: string) => void
}

const ToastContext = createContext<ToastApi | null>(null)

let nextId = 1

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const dismiss = useCallback((id: number) => setToasts((list) => list.filter((t) => t.id !== id)), [])

  const push = useCallback(
    (kind: ToastKind, message: string) => {
      const id = nextId++
      setToasts((list) => [...list, { id, kind, message }])
      setTimeout(() => dismiss(id), kind === 'error' ? 6000 : 3500)
    },
    [dismiss],
  )

  const api = useMemo<ToastApi>(
    () => ({
      success: (m) => push('success', m),
      error: (m) => push('error', m),
      info: (m) => push('info', m),
    }),
    [push],
  )

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed right-4 bottom-4 z-[60] flex w-full max-w-sm flex-col gap-2" aria-live="polite">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              'pointer-events-auto flex items-start gap-3 rounded-lg border bg-white px-4 py-3 text-sm shadow-lg',
              t.kind === 'success' && 'border-success-600/30',
              t.kind === 'error' && 'border-danger-600/30',
              t.kind === 'info' && 'border-info-600/30',
            )}
          >
            {t.kind === 'success' && <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success-600" />}
            {t.kind === 'error' && <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-danger-600" />}
            {t.kind === 'info' && <Info className="mt-0.5 h-4 w-4 shrink-0 text-info-600" />}
            <p className="flex-1 text-gray-800">{t.message}</p>
            <button type="button" onClick={() => dismiss(t.id)} className="text-gray-400 hover:text-gray-600" aria-label="Dismiss">
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>')
  return ctx
}
