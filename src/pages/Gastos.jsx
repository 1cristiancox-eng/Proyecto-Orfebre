import React, { useMemo, useState } from 'react'
import { db, addExpense, deleteExpense, CATEGORIAS_GASTO, TIPOS_ITEM, UNIDADES } from '../db.js'
import { useExpenses, useMaterials, useProducts } from '../hooks.js'
import { fmtMoney, fmtDate, todayISO, monthOf } from '../lib/format.js'
import {
  Card, SectionTitle, Field, Input, Select, Textarea, Modal, Badge, EmptyState, IconButton, Icons,
} from '../components/ui.jsx'

const emptyForm = () => ({
  fecha: todayISO(),
  monto: '',
  categoria: 'Plata',
  tipo: 'Material',
  proveedor: '',
  esDirecto: false,
  productId: '',
  materialId: '',
  cantidad: '',
  unidad: 'g',
  observaciones: '',
})

export default function Gastos() {
  const expenses = useExpenses()
  const materials = useMaterials()
  const products = useProducts()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(emptyForm())
  const [nuevoMat, setNuevoMat] = useState(false)
  const [matData, setMatData] = useState({ nombre: '', categoria: 'Plata', unidad: 'g', stockMinimo: '' })
  const [fMes, setFMes] = useState('')
  const [fCat, setFCat] = useState('')
  const [q, setQ] = useState('')

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const filtered = useMemo(() => {
    return (expenses || []).filter((e) => {
      if (fMes && monthOf(e.fecha) !== fMes) return false
      if (fCat && e.categoria !== fCat) return false
      if (q && !(`${e.proveedor} ${e.observaciones} ${e.categoria}`.toLowerCase().includes(q.toLowerCase()))) return false
      return true
    })
  }, [expenses, fMes, fCat, q])

  const total = filtered.reduce((s, e) => s + (Number(e.monto) || 0), 0)
  const meses = useMemo(() => [...new Set((expenses || []).map((e) => monthOf(e.fecha)))].sort().reverse(), [expenses])

  function openNew() {
    setForm(emptyForm())
    setNuevoMat(false)
    setMatData({ nombre: '', categoria: 'Plata', unidad: 'g', stockMinimo: '' })
    setOpen(true)
  }

  async function save(e) {
    e.preventDefault()
    let materialId = form.materialId ? Number(form.materialId) : null

    // Crear material nuevo en el inventario si corresponde
    if (nuevoMat && matData.nombre.trim()) {
      materialId = await db.materials.add({
        nombre: matData.nombre.trim(),
        categoria: matData.categoria,
        unidad: matData.unidad,
        stock: 0,
        stockMinimo: Number(matData.stockMinimo) || 0,
        costoPromedio: 0,
        comprado: 0,
        utilizado: 0,
      })
    }

    await addExpense({
      fecha: form.fecha,
      monto: Number(form.monto) || 0,
      categoria: form.categoria,
      tipo: form.tipo,
      proveedor: form.proveedor.trim(),
      esDirecto: !!form.esDirecto,
      productId: form.productId ? Number(form.productId) : null,
      materialId,
      cantidad: form.cantidad ? Number(form.cantidad) : null,
      unidad: form.unidad,
      observaciones: form.observaciones.trim(),
    })
    setOpen(false)
  }

  async function remove(id) {
    if (window.confirm('¿Eliminar este gasto? Si estaba asociado a inventario, se revertirá el stock.')) {
      await deleteExpense(id)
    }
  }

  const esCompraInventario = ['Material', 'Insumo'].includes(form.tipo)

  return (
    <div>
      <SectionTitle
        title="Gastos"
        subtitle="Registra compras de materiales, insumos, herramientas y servicios."
        action={
          <button className="btn-primary" onClick={openNew}>
            {Icons.plus} <span className="hidden sm:inline">Nuevo gasto</span>
          </button>
        }
      />

      {/* Filtros */}
      <Card className="mb-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Field label="Mes">
            <Select value={fMes} onChange={(e) => setFMes(e.target.value)} placeholder="Todos" options={meses} />
          </Field>
          <Field label="Categoría">
            <Select value={fCat} onChange={(e) => setFCat(e.target.value)} placeholder="Todas" options={CATEGORIAS_GASTO} />
          </Field>
          <Field label="Buscar" className="col-span-2">
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Proveedor, nota…" />
          </Field>
        </div>
      </Card>

      <div className="flex items-center justify-between mb-3 px-1">
        <p className="text-sm text-ink-500">{filtered.length} gasto(s)</p>
        <p className="text-sm font-semibold text-ink-800">
          Total: <span className="text-gold-700">{fmtMoney(total)}</span>
        </p>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="Sin gastos registrados"
          subtitle="Empieza registrando la compra de materiales para tu taller."
          action={<button className="btn-primary" onClick={openNew}>{Icons.plus} Nuevo gasto</button>}
        />
      ) : (
        <>
          {/* Tabla desktop */}
          <Card className="!p-0 overflow-hidden hidden md:block">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-ink-50/60 border-b border-ink-100">
                  <tr>
                    <th className="th">Fecha</th>
                    <th className="th">Categoría</th>
                    <th className="th">Detalle</th>
                    <th className="th">Proveedor</th>
                    <th className="th">Cant.</th>
                    <th className="th text-right">Monto</th>
                    <th className="th"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-50">
                  {filtered.map((e) => (
                    <tr key={e.id} className="hover:bg-gold-50/40">
                      <td className="td whitespace-nowrap">{fmtDate(e.fecha)}</td>
                      <td className="td"><Badge color="gold">{e.categoria}</Badge></td>
                      <td className="td">
                        <div className="font-medium text-ink-800">{materialName(e, materials) || e.tipo}</div>
                        {e.observaciones && <div className="text-xs text-ink-400">{e.observaciones}</div>}
                        <div className="flex gap-1 mt-0.5">
                          {e.esDirecto && <Badge color="blue">Directo</Badge>}
                          {e.productId && <Badge color="purple">{productName(e.productId, products)}</Badge>}
                        </div>
                      </td>
                      <td className="td">{e.proveedor || '—'}</td>
                      <td className="td whitespace-nowrap">{e.cantidad ? `${e.cantidad} ${e.unidad || ''}` : '—'}</td>
                      <td className="td text-right font-semibold whitespace-nowrap">{fmtMoney(e.monto)}</td>
                      <td className="td"><IconButton tone="danger" title="Eliminar" onClick={() => remove(e.id)}>{Icons.trash}</IconButton></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Cards móvil */}
          <div className="md:hidden space-y-2">
            {filtered.map((e) => (
              <div key={e.id} className="card p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-semibold text-ink-800">{materialName(e, materials) || e.tipo}</div>
                    <div className="text-xs text-ink-400">{fmtDate(e.fecha)} · {e.proveedor || 's/proveedor'}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-gold-700">{fmtMoney(e.monto)}</div>
                    {e.cantidad && <div className="text-xs text-ink-400">{e.cantidad} {e.unidad}</div>}
                  </div>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <div className="flex gap-1 flex-wrap">
                    <Badge color="gold">{e.categoria}</Badge>
                    {e.esDirecto && <Badge color="blue">Directo</Badge>}
                  </div>
                  <IconButton tone="danger" onClick={() => remove(e.id)}>{Icons.trash}</IconButton>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Modal */}
      <Modal open={open} onClose={() => setOpen(false)} title="Nuevo gasto">
        <form onSubmit={save} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Fecha"><Input type="date" value={form.fecha} onChange={set('fecha')} required /></Field>
            <Field label="Monto total (CLP)"><Input type="number" min="0" value={form.monto} onChange={set('monto')} placeholder="0" required /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Categoría"><Select value={form.categoria} onChange={set('categoria')} options={CATEGORIAS_GASTO} /></Field>
            <Field label="Tipo"><Select value={form.tipo} onChange={set('tipo')} options={TIPOS_ITEM} /></Field>
          </div>
          <Field label="Proveedor"><Input value={form.proveedor} onChange={set('proveedor')} placeholder="Nombre del proveedor" /></Field>

          {/* Vínculo con inventario */}
          {esCompraInventario && (
            <div className="rounded-xl bg-gold-50 border border-gold-100 p-3 space-y-3">
              <p className="text-xs font-semibold text-gold-800">📦 Registrar en inventario</p>
              {!nuevoMat ? (
                <>
                  <Field label="Material / insumo del inventario">
                    <Select
                      value={form.materialId}
                      onChange={set('materialId')}
                      placeholder="— Sin registrar en inventario —"
                      options={(materials || []).map((m) => ({ value: m.id, label: `${m.nombre} (${m.unidad})` }))}
                    />
                  </Field>
                  <button type="button" className="text-xs font-semibold text-gold-700 underline" onClick={() => setNuevoMat(true)}>
                    ➕ Crear material nuevo
                  </button>
                </>
              ) : (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <Field label="Nombre"><Input value={matData.nombre} onChange={(e) => setMatData({ ...matData, nombre: e.target.value })} placeholder="Ej: Plata 950" /></Field>
                    <Field label="Categoría"><Select value={matData.categoria} onChange={(e) => setMatData({ ...matData, categoria: e.target.value })} options={CATEGORIAS_GASTO} /></Field>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Field label="Unidad"><Select value={matData.unidad} onChange={(e) => setMatData({ ...matData, unidad: e.target.value })} options={UNIDADES} /></Field>
                    <Field label="Stock mínimo"><Input type="number" min="0" value={matData.stockMinimo} onChange={(e) => setMatData({ ...matData, stockMinimo: e.target.value })} /></Field>
                  </div>
                  <button type="button" className="text-xs font-semibold text-ink-500 underline" onClick={() => setNuevoMat(false)}>Cancelar material nuevo</button>
                </div>
              )}
              {(form.materialId || nuevoMat) && (
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Cantidad comprada"><Input type="number" min="0" step="any" value={form.cantidad} onChange={set('cantidad')} placeholder="0" /></Field>
                  <Field label="Unidad de medida"><Select value={form.unidad} onChange={set('unidad')} options={UNIDADES} /></Field>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Field label="Cantidad" className={esCompraInventario ? 'hidden' : ''}>
              <Input type="number" min="0" step="any" value={form.cantidad} onChange={set('cantidad')} placeholder="0" />
            </Field>
            <Field label="Producto asociado (opcional)" className={esCompraInventario ? 'col-span-2' : ''}>
              <Select
                value={form.productId}
                onChange={set('productId')}
                placeholder="— Gasto general —"
                options={(products || []).map((p) => ({ value: p.id, label: `${p.codigo} · ${p.nombre}` }))}
              />
            </Field>
          </div>

          <label className="flex items-center gap-2 text-sm text-ink-700">
            <input type="checkbox" checked={form.esDirecto} onChange={(e) => setForm({ ...form, esDirecto: e.target.checked })} className="w-4 h-4 accent-gold-700" />
            Gasto directo de un producto (no gasto general del negocio)
          </label>

          <Field label="Observaciones"><Textarea value={form.observaciones} onChange={set('observaciones')} placeholder="Notas opcionales…" /></Field>

          <div className="flex gap-2 pt-2">
            <button type="button" className="btn-outline flex-1" onClick={() => setOpen(false)}>Cancelar</button>
            <button type="submit" className="btn-primary flex-1">Guardar gasto</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

function materialName(expense, materials) {
  if (!expense.materialId) return ''
  const m = (materials || []).find((x) => x.id === expense.materialId)
  return m ? m.nombre : ''
}
function productName(id, products) {
  const p = (products || []).find((x) => x.id === id)
  return p ? p.codigo : 'Producto'
}
