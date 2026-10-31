import { useState } from 'react'
import { Eye, EyeOff, Check, X } from 'lucide-react'
import { Input, type InputProps } from '@/components/ui/Input'
import { cn } from '@/lib/cn'
import { passwordChecks } from '@/lib/validators'

export function PasswordInput({ ref, ...props }: InputProps & { ref?: React.Ref<HTMLInputElement> }) {
  const [visible, setVisible] = useState(false)
  return (
    <div className="relative">
      <Input ref={ref} type={visible ? 'text' : 'password'} className="pr-10" {...props} />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-gray-400 hover:text-gray-600"
        aria-label={visible ? 'Hide password' : 'Show password'}
        tabIndex={-1}
      >
        {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  )
}

/** Live checklist of the password rules, shown under the field while typing. */
export function PasswordChecklist({ password }: { password: string }) {
  return (
    <ul className="grid grid-cols-1 gap-1 sm:grid-cols-2" aria-label="Password requirements">
      {passwordChecks(password).map((c) => (
        <li key={c.label} className={cn('flex items-center gap-1.5 text-xs', c.ok ? 'text-success-700' : 'text-gray-500')}>
          {c.ok ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
          {c.label}
        </li>
      ))}
    </ul>
  )
}
