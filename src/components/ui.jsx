import React from 'react'

export function Card({ children, className = '' }) {
  return <div className={`card p-5 ${className}`}>{children}</div>
}

export function SectionTitle({ title, subtitle, action }) {
  return (
    <div className="flex items-end justify-between gap-4 mb-4">
      <div>
        <h2 className="text-lg font-bold text-ink-900">{title}</h2>
        {subtitle && <p className="text-sm text-ink-400 mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

export function Field({ label, children, hint, className = '' }) {
  return (
    <div className={className}>
      {label && <label className="label">{label}</label>}
      {children}
      {hint && <p className="text-xs text-ink-400 mt-1">{hint}</p>}
    </div>
  )
}

export function Input(props) {
  return <input {...props} className={`input ${props.className || ''}`} />
}

export function Select({ options, placeholder, ...props }) {
  return (
    <select {...props} className={`input ${props.className || ''}`}>
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((o) => {
        const val = typeof o === 'object' ? o.value : o
        const lab = typeof o === 'object' ? o.label : o
        return (
          <option key={val} value={val}>
            {lab}
          </option>
        )
      })}
    </select>
  )
}

export function Textarea(props) {
  return <textarea {...props} className={`input min-h-[80px] resize-y ${props.className || ''}`} />
}

export function Modal({ open, onClose, title, children, size = 'lg' }) {
  if (!open) return null
  const maxW = size === 'sm' ? 'max-w-md' : size === 'xl' ? 'max-w-4xl' : 'max-w-2xl'
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-ink-900/40 backdrop-blur-sm" onClick={onClose} />
      <div
        className={`relative w-full ${maxW} bg-white rounded-t-3xl sm:rounded-2xl shadow-soft max-h-[92vh] overflow-hidden flex flex-col`}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-ink-100">
          <h3 className="font-bold text-ink-900">{title}</h3>
          <button onClick={onClose} className="btn-ghost !p-2 rounded-lg text-ink-400" aria-label="Cerrar">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-5">{children}</div>
      </div>
    </div>
  )
}

export function Badge({ children, color = 'gray' }) {
  const colors = {
    gray: 'bg-ink-100 text-ink-600',
    green: 'bg-emerald-100 text-emerald-700',
    amber: 'bg-amber-100 text-amber-700',
    blue: 'bg-blue-100 text-blue-700',
    red: 'bg-red-100 text-red-700',
    gold: 'bg-gold-100 text-gold-800',
    purple: 'bg-purple-100 text-purple-700',
  }
  return <span className={`chip ${colors[color] || colors.gray}`}>{children}</span>
}

export const ESTADO_COLOR = {
  'En fabricación': 'amber',
  Terminado: 'blue',
  Disponible: 'green',
  Reservado: 'purple',
  Vendido: 'gray',
}

export function Stat({ label, value, sub, tone = 'default', icon }) {
  const tones = {
    default: 'text-ink-900',
    positive: 'text-emerald-600',
    negative: 'text-red-600',
    gold: 'text-gold-700',
  }
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">{label}</p>
        {icon && <span className="text-ink-300">{icon}</span>}
      </div>
      <p className={`mt-2 text-2xl font-extrabold ${tones[tone]}`}>{value}</p>
      {sub && <p className="text-xs text-ink-400 mt-1">{sub}</p>}
    </div>
  )
}

export function EmptyState({ title, subtitle, action }) {
  return (
    <div className="card p-10 text-center">
      <div className="mx-auto w-12 h-12 rounded-full bg-gold-100 flex items-center justify-center mb-3">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#8a6d1a" strokeWidth="1.8">
          <path d="M12 3l9 6-9 6-9-6 9-6zM3 15l9 6 9-6" />
        </svg>
      </div>
      <p className="font-semibold text-ink-800">{title}</p>
      {subtitle && <p className="text-sm text-ink-400 mt-1">{subtitle}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function IconButton({ onClick, title, children, tone = 'ghost' }) {
  const cls = tone === 'danger' ? 'text-red-500 hover:bg-red-50' : 'text-ink-400 hover:bg-ink-100'
  return (
    <button onClick={onClick} title={title} className={`p-2 rounded-lg transition-colors ${cls}`}>
      {children}
    </button>
  )
}

export const Icons = {
  edit: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4 12.5-12.5z" />
    </svg>
  ),
  trash: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 6h18M8 6V4a1 1 0 011-1h6a1 1 0 011 1v2m2 0v14a1 1 0 01-1 1H7a1 1 0 01-1-1V6" />
    </svg>
  ),
  plus: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
      <path d="M12 5v14M5 12h14" />
    </svg>
  ),
  download: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 3v12m0 0l-4-4m4 4l4-4M4 21h16" />
    </svg>
  ),
}

// Confirmación simple
export function useConfirm() {
  return (msg) => window.confirm(msg)
}
