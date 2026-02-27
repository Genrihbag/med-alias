import type { ReactNode } from 'react'

interface RulesModalProps {
  title: string
  children: ReactNode
  onClose: () => void
}

export const RulesModal = ({ title, children, onClose }: RulesModalProps) => (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 p-4"
    role="dialog"
    aria-modal="true"
    aria-labelledby="rules-title"
    onClick={(e) => e.target === e.currentTarget && onClose()}
  >
    <div
      className="max-h-[85vh] w-full max-w-lg overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between border-b border-slate-700 px-4 py-3">
        <h2 id="rules-title" className="text-lg font-semibold text-slate-100">
          {title}
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="rounded-xl px-2 py-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
          aria-label="Закрыть"
        >
          ✕
        </button>
      </div>
      <div className="max-h-[60vh] overflow-y-auto px-4 py-4 text-sm leading-relaxed text-slate-300 whitespace-pre-wrap">
        {children}
      </div>
      <div className="border-t border-slate-700 px-4 py-3">
        <button
          type="button"
          onClick={onClose}
          className="w-full rounded-xl bg-slate-700 px-4 py-2 text-sm font-medium text-slate-100 hover:bg-slate-600"
        >
          Закрыть
        </button>
      </div>
    </div>
  </div>
)
