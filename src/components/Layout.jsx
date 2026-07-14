import React, { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'

const NAV = [
  { to: '/', label: 'Panel', icon: 'grid' },
  { to: '/gastos', label: 'Gastos', icon: 'receipt' },
  { to: '/productos', label: 'Productos', icon: 'gem' },
  { to: '/ventas', label: 'Ventas', icon: 'tag' },
  { to: '/inventario', label: 'Inventario', icon: 'box' },
  { to: '/generales', label: 'Gastos generales', icon: 'building' },
  { to: '/reportes', label: 'Reportes', icon: 'chart' },
  { to: '/configuracion', label: 'Configuración', icon: 'cog' },
]

// Barra inferior en móvil (accesos rápidos principales)
const MOBILE_NAV = ['/', '/gastos', '/productos', '/ventas', '/inventario']

function Icon({ name, className = '' }) {
  const common = { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', className }
  const paths = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
    receipt: <><path d="M5 3v18l2-1 2 1 2-1 2 1 2-1 2 1V3l-2 1-2-1-2 1-2-1-2 1-2-1z" /><path d="M9 8h6M9 12h6" /></>,
    gem: <><path d="M6 3h12l3 6-9 12L3 9l3-6zM3 9h18M9 3l3 6 3-6M12 21l-3-12M12 21l3-12" /></>,
    tag: <><path d="M20 12l-8 8-9-9V3h8l9 9z" /><circle cx="7.5" cy="7.5" r="1.5" /></>,
    box: <><path d="M21 8l-9-5-9 5 9 5 9-5zM3 8v8l9 5 9-5V8M12 13v8" /></>,
    building: <><rect x="4" y="3" width="16" height="18" rx="1" /><path d="M9 8h.01M15 8h.01M9 12h.01M15 12h.01M9 16h6" /></>,
    chart: <><path d="M3 3v18h18M8 14v4M13 9v9M18 5v13" /></>,
    cog: <><circle cx="12" cy="12" r="3" /><path d="M19 12a7 7 0 00-.1-1l2-1.5-2-3.5-2.3 1a7 7 0 00-1.7-1l-.3-2.5h-4l-.3 2.5a7 7 0 00-1.7 1l-2.3-1-2 3.5 2 1.5a7 7 0 000 2l-2 1.5 2 3.5 2.3-1a7 7 0 001.7 1l.3 2.5h4l.3-2.5a7 7 0 001.7-1l2.3 1 2-3.5-2-1.5a7 7 0 00.1-1z" /></>,
  }
  return <svg {...common}>{paths[name]}</svg>
}

export default function Layout({ children }) {
  const [open, setOpen] = useState(false)
  const location = useLocation()

  return (
    <div className="min-h-screen flex bg-gold-50">
      {/* Sidebar desktop */}
      <aside className="hidden lg:flex flex-col w-64 shrink-0 bg-white border-r border-ink-100 sticky top-0 h-screen">
        <Brand />
        <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
          {NAV.map((n) => (
            <NavItem key={n.to} {...n} />
          ))}
        </nav>
        <div className="p-4 text-xs text-ink-300">Datos guardados en tu dispositivo</div>
      </aside>

      {/* Drawer móvil */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-ink-900/40" onClick={() => setOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-72 bg-white shadow-soft flex flex-col">
            <Brand onClose={() => setOpen(false)} />
            <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto" onClick={() => setOpen(false)}>
              {NAV.map((n) => (
                <NavItem key={n.to} {...n} />
              ))}
            </nav>
          </aside>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar móvil */}
        <header className="lg:hidden sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-ink-100 flex items-center gap-3 px-4 h-14">
          <button onClick={() => setOpen(true)} className="p-2 -ml-2 text-ink-600" aria-label="Menú">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="flex items-center gap-2">
            <Diamond />
            <span className="font-bold text-ink-900">Orfebre</span>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 pb-24 lg:pb-6 max-w-7xl w-full mx-auto">{children}</main>

        {/* Bottom nav móvil */}
        <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t border-ink-100 grid grid-cols-5 pb-[env(safe-area-inset-bottom)]">
          {NAV.filter((n) => MOBILE_NAV.includes(n.to)).map((n) => {
            const active = location.pathname === n.to
            return (
              <NavLink
                key={n.to}
                to={n.to}
                className={`flex flex-col items-center justify-center py-2 gap-0.5 text-[10px] font-medium ${
                  active ? 'text-gold-700' : 'text-ink-400'
                }`}
              >
                <Icon name={n.icon} />
                {n.label}
              </NavLink>
            )
          })}
        </nav>
      </div>
    </div>
  )
}

function NavItem({ to, label, icon }) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
          isActive ? 'bg-gold-100 text-gold-800' : 'text-ink-500 hover:bg-ink-50'
        }`
      }
    >
      <Icon name={icon} />
      {label}
    </NavLink>
  )
}

function Brand({ onClose }) {
  return (
    <div className="flex items-center justify-between px-5 h-16 border-b border-ink-100">
      <div className="flex items-center gap-2.5">
        <Diamond />
        <div>
          <p className="font-extrabold text-ink-900 leading-tight">Orfebre</p>
          <p className="text-[10px] text-ink-400 -mt-0.5">Gestión del taller</p>
        </div>
      </div>
      {onClose && (
        <button onClick={onClose} className="p-2 text-ink-400" aria-label="Cerrar">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      )}
    </div>
  )
}

function Diamond() {
  return (
    <div className="w-8 h-8 rounded-lg bg-gradient-to-b from-gold-500 to-gold-800 flex items-center justify-center shadow-sm">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="#faf7f0" stroke="#e6d7ac" strokeWidth="1">
        <path d="M12 3 L20 12 L12 21 L4 12 Z" />
      </svg>
    </div>
  )
}
