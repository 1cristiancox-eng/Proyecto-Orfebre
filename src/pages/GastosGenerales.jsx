import React, { useMemo, useState } from 'react'
import { db, CATEGORIAS_GASTO, METODOS_PRORRATEO, saveSettings } from '../db.js'
import { useOverhead, useSettings, useProducts } from '../hooks.js'
import { fmtMoney, mesLabel, currentMonth } from '../lib/format.js'
import { computeOverheadAllocation } from '../lib/calc.js'
import {
  Card, SectionTitle, Field, Input, Select, Modal, Badge, EmptyState, IconButton, Icons,
} from '../components/ui.jsx'

const emptyForm = () => ({ mes: currentMonth(), categoria: 'Gastos de taller', concepto: '', monto: '' })

export default function GastosGenerales() {
  const overhead = useOverhead()
  const settings = useSettings()
  const products = useProducts()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(emptyForm())
  const [fMes, setFMes] = useState('')

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const meses = useMemo(() => [...new Set((overhead || []).map((o) => o.mes))].sort().reverse(), [overhead])
  const filtered = useMemo(() => (overhead || []).filter((o) => !fMes || o.mes === fMes), [overhead, fMes])
  const total = filtered.reduce((s, o) => s + (Number(o.monto) || 0), 0)

  const { alloc } = useMemo(() => computeOverheadAllocation(products || [], overhead || [], settings || {}), [products, overhead, settings])

  async function updateMetodo(patch) {
    await saveSettings(patch)
  }

  function openNew() { setForm(emptyForm()); setOpen(true) }
  async function save(e) {
    e.preventDefault()
    await db.overhead.add({ mes: form.mes, categoria: form.categoria, concepto: form.concepto.trim(), monto: Number(form.monto) || 0 })
    setOpen(false)
  }
  async function remove(id) {
    if (window.confirm('¿Eliminar este gasto general?')) await db.overhead.delete(id)
  }

  const metodoActual = settings?.metodoProrrateo || 'horas'

  return (
    <div>
      <SectionTitle
        title="Gastos generales del taller"
        subtitle="Arriendo, luz, internet, marketing… y cómo repartirlos entre tus productos."
        action={<button className="btn-primary" onClick={openNew}>{Icons.plus}<span className="hidden sm:inline">Nuevo gasto general</span></button>}
      />

      {/* Método de prorrateo */}
      <Card className="mb-5">
        <p className="font-semibold text-ink-800 mb-1">Método de distribución (prorrateo)</p>
        <p className="text-sm text-ink-400 mb-3">Define cómo se reparten estos gastos en el costo de cada producto.</p>
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Método">
            <Select value={metodoActual} onChange={(e) => updateMetodo({ metodoProrrateo: e.target.value })}
              options={METODOS_PRORRATEO.map((m) => ({ value: m.id, label: m.label }))} />
          </Field>
          {metodoActual === 'porcentaje' && (
            <Field label="Porcentaje sobre costo directo (%)">
              <Input type="number" min="0" value={settings?.porcentajeProrrateo ?? 15} onChange={(e) => updateMetodo({ porcentajeProrrateo: Number(e.target.value) || 0 })} />
            </Field>
          )}
        </div>

        {/* Vista previa de distribución */}
        {(products || []).length > 0 && metodoActual !== 'manual' && (
          <div className="mt-4">
            <p className="text-xs font-semibold text-ink-400 uppercase mb-2">Así se reparte hoy</p>
            <div className="space-y-1.5">
              {(products || []).map((p) => (
                <div key={p.id} className="flex items-center justify-between text-sm">
                  <span className="text-ink-600 truncate">{p.codigo} · {p.nombre}</span>
                  <span className="font-semibold text-gold-700">{fmtMoney(alloc[p.id] || 0)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {metodoActual === 'manual' && <p className="text-sm text-ink-400 mt-3">Modo manual: ingresa los gastos generales de cada pieza en el campo <b>Gastos adicionales</b> del producto.</p>}
      </Card>

      <Card className="mb-4">
        <Field label="Filtrar por mes"><Select value={fMes} onChange={(e) => setFMes(e.target.value)} placeholder="Todos" options={meses.map((m) => ({ value: m, label: mesLabel(m) }))} /></Field>
      </Card>

      <div className="flex items-center justify-between mb-3 px-1">
        <p className="text-sm text-ink-500">{filtered.length} registro(s)</p>
        <p className="text-sm font-semibold">Total: <span className="text-gold-700">{fmtMoney(total)}</span></p>
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="Sin gastos generales" subtitle="Registra los gastos fijos mensuales de tu taller." action={<button className="btn-primary" onClick={openNew}>{Icons.plus} Nuevo gasto general</button>} />
      ) : (
        <Card className="!p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-ink-50/60 border-b border-ink-100">
                <tr><th className="th">Mes</th><th className="th">Categoría</th><th className="th">Concepto</th><th className="th text-right">Monto</th><th className="th"></th></tr>
              </thead>
              <tbody className="divide-y divide-ink-50">
                {filtered.map((o) => (
                  <tr key={o.id} className="hover:bg-gold-50/40">
                    <td className="td whitespace-nowrap capitalize">{mesLabel(o.mes)}</td>
                    <td className="td"><Badge color="gold">{o.categoria}</Badge></td>
                    <td className="td font-medium text-ink-800">{o.concepto || '—'}</td>
                    <td className="td text-right font-semibold">{fmtMoney(o.monto)}</td>
                    <td className="td"><IconButton tone="danger" onClick={() => remove(o.id)}>{Icons.trash}</IconButton></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Nuevo gasto general">
        <form onSubmit={save} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Mes"><Input type="month" value={form.mes} onChange={set('mes')} required /></Field>
            <Field label="Monto (CLP)"><Input type="number" min="0" value={form.monto} onChange={set('monto')} placeholder="0" required /></Field>
          </div>
          <Field label="Categoría"><Select value={form.categoria} onChange={set('categoria')} options={CATEGORIAS_GASTO} /></Field>
          <Field label="Concepto"><Input value={form.concepto} onChange={set('concepto')} placeholder="Ej: Arriendo taller, Electricidad…" /></Field>
          <div className="flex gap-2 pt-1">
            <button type="button" className="btn-outline flex-1" onClick={() => setOpen(false)}>Cancelar</button>
            <button type="submit" className="btn-primary flex-1">Guardar</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
