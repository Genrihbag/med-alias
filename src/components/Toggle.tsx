import type { ReactNode } from 'react'

interface ToggleProps {
  checked: boolean
  onChange: (checked: boolean) => void
  children?: ReactNode
  'aria-label'?: string
}

export const Toggle = ({ checked, onChange, children, 'aria-label': ariaLabel }: ToggleProps) => (
  <label className="flex cursor-pointer items-center gap-3">
    <span
      className={`relative inline-flex h-7 w-12 shrink-0 rounded-full transition-colors focus-within:ring-2 focus-within:ring-sky-400 focus-within:ring-offset-2 focus-within:ring-offset-slate-950 ${
        checked ? 'bg-sky-500' : 'bg-slate-700'
      }`}
    >
      <input
        type="checkbox"
        role="switch"
        aria-checked={checked}
        aria-label={ariaLabel}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="sr-only"
      />
      <span
        className={`pointer-events-none absolute top-1 left-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </span>
    {children && <span className="text-sm text-slate-200">{children}</span>}
  </label>
)
