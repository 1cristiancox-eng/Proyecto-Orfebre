import React, { useMemo, useState } from 'react'
import { addSale, deleteSale, MEDIOS_PAGO, CANALES_VENTA } from '../db.js'
import { useSales, useProducts, useOverhead, useSettings } from '../hooks.js'
import { fmtMoney, fmtDate, fmtPct, todayISO, monthOf } from '../lib/format.js'
import { computeOverheadAllocation, productCost, saleMetrics } from '../lib/calc.js'
import {
  Card, SectionTitle, Field, Input, Select, Textarea, Modal, Badge, EmptyState, IconButton, Icons,
} from '../components/ui.jsx'

const emptyForm = () => ({
  fecha: todayISO(),
  productId: '',
  precioVenta: '',
  medioPago: 'Transferencia',
  canal: 'Instagram',
  cliente: '',
  descuento: '',
  comision: '',
  costoEnvio: '',
  otrosGastos: '',
  observaciones: '',
})

export default function Ventas() {
  const sales = useSales()
  const products = useProducts()
  const overhead = useOverhead()
  const settings = useSettings()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(emptyForm())
  const [fMes, setFMes] = useState('')
  const [fCanal, setFCanal] = useState('')

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const { alloc } = useMemo(() => computeOverheadAllocation(products || [], overhead || [], settings || {}), [products, overhead, settings])
  const costOf = (productId) => {
    const p = (products || []).find((x) => x.id === productId)
    return p ? productCost(p, settings || {}, alloc[p.id] || 0) : null
  }
  const productOf = (productId) => (products || []).find((x) => x.id === productId)

  const meses = useMemo(() => [...new Set((sales || []).map((s) => monthOf(s.fecha)))].sort().reverse(), [sales])
  const filtered = useMemo(() => (sales || []).filter((s) => (!fMes || monthOf(s.fecha) === fMes) && (!fCanal || s.canal === fCanal)), [sales, fMes, fCanal])

  // Productos disponibles para vender (no vendidos) + el que se esté editando
  const vendibles = useMemo(
    () => (products || []).filter((p) => p.estado !== 'Vendido'),
    [products],
  )

  // Vista previa de métricas en el formulario
  const preview = useMemo(() => {
    const p = productOf(Number(form.productId))
    const cost = costOf(Number(form.productId))
    return saleMetrics(
      { precioVenta: form.precioVenta, descuento: form.descuento, comision: form.comision, costoEnvio: form.costoEnvio, otrosGastos: form.otrosGastos },
      p, cost,
    )
  }, [form, products, alloc, settings])

  const totals = useMemo(() => {
    let ingreso = 0, utilidad = 0
    for (const s of filtered) {
      const m = saleMetrics(s, productOf(s.productId), costOf(s.productId))
      ingreso += m.ingresoNeto
      utilidad += m.utilidad
    }
    return { ingreso, utilidad }
  }, [filtered, products, alloc, settings])

  function openNew() { setForm(emptyForm()); setOpen(true) }

  async function save(e) {
    e.preventDefault()
    if (!form.productId) return
    await addSale({
      fecha: form.fecha,
      productId: Number(form.productId),
      precioVenta: Number(form.precioVenta) || 0,
      medioPago: form.medioPago,
      canal: form.canal,
      cliente: form.cliente.trim(),
      descuento: Number(form.descuento) || 0,
      comision: Number(form.comision) || 0,
      costoEnvio: Number(form.costoEnvio) || 0,
      otrosGastos: Number(form.otrosGastos) || 0,
      observaciones: form.observaciones.trim(),
    })
    setOpen(false)
  }

  async function remove(s) {
    if (window.confirm('¿Eliminar esta venta? El producto volverá a estado Disponible.')) await deleteSale(s.id)
  }

  return (
    <div>
      <SectionTitle
        title="Ventas"
        subtitle="Registra cada venta y conoce su utilidad y margen al instante."
        action={<button className="btn-primary" onClick={openNew}>{Icons.plus}<span className="hidden sm:inline">Nueva venta</span></button>}
      />

      <div className="grid grid-cols-2 gap-3 mb-4">
        <Card className="!p-4"><p className="text-xs font-semibold uppercase text-ink-400">Ingreso neto</p><p className="text-xl font-extrabold text-ink-900 mt-1">{fmtMoney(totals.ingreso)}</p></Card>
        <Card className="!p-4"><p className="text-xs font-semibold uppercase text-ink-400">Utilidad</p><p className={`text-xl font-extrabold mt-1 ${totals.utilidad >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{fmtMoney(totals.utilidad)}</p></Card>
      </div>

      <Card className="mb-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Mes"><Select value={fMes} onChange={(e) => setFMes(e.target.value)} placeholder="Todos" options={meses} /></Field>
          <Field label="Canal"><Select value={fCanal} onChange={(e) => setFCanal(e.target.value)} placeholder="Todos" options={CANALES_VENTA} /></Field>
        </div>
      </Card>

      {filtered.length === 0 ? (
        <EmptyState title="Sin ventas registradas" subtitle="Registra tu primera venta para ver la rentabilidad." action={<button className="btn-primary" onClick={openNew}>{Icons.plus} Nueva venta</button>} />
      ) : (
        <div className="space-y-3">
          {filtered.map((s) => {
            const p = productOf(s.productId)
            const m = saleMetrics(s, p, costOf(s.productId))
            return (
              <div key={s.id} className="card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-ink-900 truncate">{p ? p.nombre : 'Producto eliminado'}</h3>
                      <Badge color="blue">{s.canal}</Badge>
                    </div>
                    <p className="text-xs text-ink-400 mt-0.5">{fmtDate(s.fecha)} · {s.medioPago}{s.cliente ? ` · ${s.cliente}` : ''}</p>
                  </div>
                  <IconButton tone="danger" onClick={() => remove(s)}>{Icons.trash}</IconButton>
                </div>
                <div className="mt-3 grid grid-cols-2 sm:grid-cols-5 gap-3 text-sm">
                  <Metric label="Precio venta" value={fmtMoney(s.precioVenta)} />
                  <Metric label="Ingreso neto" value={fmtMoney(m.ingresoNeto)} />
                  <Metric label="Costo producto" value={fmtMoney(m.costoProducto)} />
                  <Metric label="Utilidad" value={fmtMoney(m.utilidad)} tone={m.utilidad >= 0 ? 'pos' : 'neg'} />
                  <Metric label="Margen" value={fmtPct(m.margenPorc)} tone={m.margenPorc >= 0 ? 'pos' : 'neg'} />
                </div>
                {p && p.horas > 0 && (
                  <p className="text-xs text-ink-400 mt-2">Rentabilidad por hora: <b className="text-ink-700">{fmtMoney(m.rentabilidadHora)}/h</b></p>
                )}
              </div>
            )
          })}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Nueva venta">
        <form onSubmit={save} className="space-y-4">
          <Field label="Producto vendido">
            <Select value={form.productId} onChange={set('productId')} placeholder="Selecciona un producto…" required
              options={vendibles.map((p) => ({ value: p.id, label: `${p.codigo} · ${p.nombre} (${p.estado})` }))} />
          </Field>
          {vendibles.length === 0 && <p className="text-xs text-amber-600">No hay productos disponibles. Crea uno en la sección Productos.</p>}

          <div className="grid grid-cols-2 gap-3">
            <Field label="Fecha de venta"><Input type="date" value={form.fecha} onChange={set('fecha')} required /></Field>
            <Field label="Precio de venta (CLP)"><Input type="number" min="0" value={form.precioVenta} onChange={set('precioVenta')} placeholder="0" required /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Medio de pago"><Select value={form.medioPago} onChange={set('medioPago')} options={MEDIOS_PAGO} /></Field>
            <Field label="Canal de venta"><Select value={form.canal} onChange={set('canal')} options={CANALES_VENTA} /></Field>
          </div>
          <Field label="Cliente (opcional)"><Input value={form.cliente} onChange={set('cliente')} placeholder="Nombre del cliente" /></Field>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Field label="Descuento"><Input type="number" min="0" value={form.descuento} onChange={set('descuento')} placeholder="0" /></Field>
            <Field label="Comisión"><Input type="number" min="0" value={form.comision} onChange={set('comision')} placeholder="0" /></Field>
            <Field label="Costo envío"><Input type="number" min="0" value={form.costoEnvio} onChange={set('costoEnvio')} placeholder="0" /></Field>
            <Field label="Otros gastos"><Input type="number" min="0" value={form.otrosGastos} onChange={set('otrosGastos')} placeholder="0" /></Field>
          </div>

          <Field label="Observaciones"><Textarea value={form.observaciones} onChange={set('observaciones')} /></Field>

          {/* Vista previa */}
          {form.productId && (
            <div className="rounded-xl bg-gold-50 border border-gold-100 p-4">
              <p className="text-xs font-semibold text-gold-800 mb-2">📊 Resultado de la venta</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm">
                <SumItem label="Ingreso neto" value={fmtMoney(preview.ingresoNeto)} />
                <SumItem label="Costo producto" value={fmtMoney(preview.costoProducto)} />
                <SumItem label="Utilidad" value={fmtMoney(preview.utilidad)} tone={preview.utilidad >= 0 ? 'pos' : 'neg'} />
                <SumItem label="Margen %" value={fmtPct(preview.margenPorc)} tone={preview.margenPorc >= 0 ? 'pos' : 'neg'} />
                <SumItem label="Rent. / hora" value={fmtMoney(preview.rentabilidadHora)} />
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button type="button" className="btn-outline flex-1" onClick={() => setOpen(false)}>Cancelar</button>
            <button type="submit" className="btn-primary flex-1" disabled={!form.productId}>Registrar venta</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

function Metric({ label, value, tone }) {
  const c = tone === 'pos' ? 'text-emerald-600' : tone === 'neg' ? 'text-red-600' : 'text-ink-800'
  return (
    <div>
      <p className="text-xs text-ink-400">{label}</p>
      <p className={`font-semibold ${c}`}>{value}</p>
    </div>
  )
}
function SumItem({ label, value, tone }) {
  const c = tone === 'pos' ? 'text-emerald-600' : tone === 'neg' ? 'text-red-600' : 'text-ink-800'
  return (
    <div>
      <p className="text-xs text-ink-400">{label}</p>
      <p className={`font-bold ${c}`}>{value}</p>
    </div>
  )
}
