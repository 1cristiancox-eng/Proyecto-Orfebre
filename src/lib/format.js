// Formateo de moneda, números y fechas (es-CL / CLP)

const clp = new Intl.NumberFormat('es-CL', {
  style: 'currency',
  currency: 'CLP',
  maximumFractionDigits: 0,
})

const num = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 2 })

export function fmtMoney(v) {
  if (v == null || isNaN(v)) return '$0'
  return clp.format(Math.round(v))
}

export function fmtNum(v, dec = 2) {
  if (v == null || isNaN(v)) return '0'
  return new Intl.NumberFormat('es-CL', { maximumFractionDigits: dec }).format(v)
}

export function fmtPct(v) {
  if (v == null || isNaN(v)) return '0%'
  return `${num.format(v)}%`
}

export function fmtDate(iso) {
  if (!iso) return '—'
  const d = new Date(iso + (iso.length === 10 ? 'T00:00:00' : ''))
  if (isNaN(d)) return iso
  return d.toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function mesLabel(mes) {
  // mes = 'YYYY-MM'
  if (!mes) return '—'
  const [y, m] = mes.split('-')
  const d = new Date(Number(y), Number(m) - 1, 1)
  return d.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' })
}

export function todayISO() {
  const d = new Date()
  const tz = d.getTimezoneOffset() * 60000
  return new Date(d - tz).toISOString().slice(0, 10)
}

export function currentMonth() {
  return todayISO().slice(0, 7)
}

// Genera un mes 'YYYY-MM' a partir de una fecha ISO
export function monthOf(iso) {
  return iso ? iso.slice(0, 7) : ''
}
