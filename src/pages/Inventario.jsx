import React, { useMemo, useState } from 'react'
import { db, CATEGORIAS_GASTO, UNIDADES } from '../db.js'
import { useMaterials, useProducts } from '../hooks.js'
import { fmtMoney, fmtNum } from '../lib/format.js'
import { inventoryValue } from '../lib/calc.js'
import {
  Card, SectionTitle, Field, Input, Select, Modal, Badge, EmptyState, IconButton, Icons, Stat,
} from '../components/ui.jsx'

const emptyForm = () => ({ nombre: '', categoria: 'Plata', unidad: 'g', stock: '', stockMinimo: '', costoPromedio: '' })

export default function Inventario() {
  const materials = useMaterials()
  const products = useProducts()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(emptyForm())
  const [editId, setEditId] = useState(null)

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const valorInventario = useMemo(() => inventoryValue(materials || []), [materials])
  const bajoStock = useMemo(() => (materials || []).filter((m) => (m.stock || 0) <= (m.stockMinimo || 0)), [materials])

  const disponibles = useMemo(
    () => (products || []).filter((p) => ['Terminado', 'Disponible', 'Reservado'].includes(p.estado)),
    [products],
  )

  function openNew() { setForm(emptyForm()); setEditId(null); setOpen(true) }
  function openEdit(m) {
    setForm({ nombre: m.nombre, categoria: m.categoria, unidad: m.unidad, stock: m.stock ?? '', stockMinimo: m.stockMinimo ?? '', costoPromedio: m.costoPromedio ?? '' })
    setEditId(m.id); setOpen(true)
  }
  async function save(e) {
    e.preventDefault()
    const data = {
      nombre: form.nombre.trim(), categoria: form.categoria, unidad: form.unidad,
      stock: Number(form.stock) || 0, stockMinimo: Number(form.stockMinimo) || 0, costoPromedio: Number(form.costoPromedio) || 0,
    }
    if (editId) await db.materials.update(editId, data)
    else await db.materials.add({ ...data, comprado: data.stock, utilizado: 0 })
    setOpen(false)
  }
  async function remove(m) {
    if (window.confirm(`¿Eliminar "${m.nombre}" del inventario?`)) await db.materials.delete(m.id)
  }

  return (
    <div>
      <SectionTitle
        title="Inventario"
        subtitle="Materiales disponibles y productos terminados listos para vender."
        action={<button className="btn-primary" onClick={openNew}>{Icons.plus}<span className="hidden sm:inline">Nuevo material</span></button>}
      />

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
        <Stat label="Valor materiales" value={fmtMoney(valorInventario)} tone="gold" />
        <Stat label="Materiales" value={(materials || []).length} sub="registrados" />
        <Stat label="Por reponer" value={bajoStock.length} tone={bajoStock.length ? 'negative' : 'default'} sub="bajo stock mínimo" />
      </div>

      {bajoStock.length > 0 && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 mb-4 flex items-start gap-2">
          <span className="text-amber-500 mt-0.5">⚠️</span>
          <div className="text-sm text-amber-800">
            <b>Materiales a reponer:</b> {bajoStock.map((m) => m.nombre).join(', ')}
          </div>
        </div>
      )}

      <h3 className="font-bold text-ink-800 mb-2">Materiales</h3>
      {(materials || []).length === 0 ? (
        <EmptyState title="Sin materiales" subtitle="Los materiales se crean al registrar compras en Gastos, o agrégalos aquí." action={<button className="btn-primary" onClick={openNew}>{Icons.plus} Nuevo material</button>} />
      ) : (
        <Card className="!p-0 overflow-hidden mb-6">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-ink-50/60 border-b border-ink-100">
                <tr>
                  <th className="th">Material</th>
                  <th className="th">Categoría</th>
                  <th className="th text-right">Stock</th>
                  <th className="th text-right">Mínimo</th>
                  <th className="th text-right">Costo prom.</th>
                  <th className="th text-right">Valor</th>
                  <th className="th"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-50">
                {(materials || []).map((m) => {
                  const low = (m.stock || 0) <= (m.stockMinimo || 0)
                  return (
                    <tr key={m.id} className="hover:bg-gold-50/40">
                      <td className="td font-medium text-ink-800">{m.nombre}</td>
                      <td className="td"><Badge color="gold">{m.categoria}</Badge></td>
                      <td className="td text-right">
                        <span className={low ? 'text-red-600 font-semibold' : ''}>{fmtNum(m.stock, 2)} {m.unidad}</span>
                        {low && <span className="ml-1">⚠️</span>}
                      </td>
                      <td className="td text-right text-ink-400">{fmtNum(m.stockMinimo, 0)}</td>
                      <td className="td text-right">{fmtMoney(m.costoPromedio)}</td>
                      <td className="td text-right font-semibold">{fmtMoney((m.stock || 0) * (m.costoPromedio || 0))}</td>
                      <td className="td">
                        <div className="flex gap-1">
                          <IconButton title="Editar" onClick={() => openEdit(m)}>{Icons.edit}</IconButton>
                          <IconButton tone="danger" onClick={() => remove(m)}>{Icons.trash}</IconButton>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <h3 className="font-bold text-ink-800 mb-2">Productos terminados disponibles ({disponibles.length})</h3>
      {disponibles.length === 0 ? (
        <p className="text-sm text-ink-400">No hay productos disponibles para la venta.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {disponibles.map((p) => (
            <div key={p.id} className="card p-3 flex items-center gap-3">
              <div className="w-14 h-14 rounded-lg bg-ink-50 overflow-hidden shrink-0">
                {p.fotos?.[0] ? <img src={p.fotos[0]} className="w-full h-full object-cover" alt="" /> : <div className="w-full h-full flex items-center justify-center text-ink-200">💎</div>}
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-ink-800 truncate">{p.nombre}</p>
                <p className="text-xs text-ink-400">{p.codigo}</p>
                <Badge color={p.estado === 'Reservado' ? 'purple' : 'green'}>{p.estado}</Badge>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={editId ? 'Editar material' : 'Nuevo material'}>
        <form onSubmit={save} className="space-y-4">
          <Field label="Nombre"><Input value={form.nombre} onChange={set('nombre')} placeholder="Ej: Plata 950" required /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Categoría"><Select value={form.categoria} onChange={set('categoria')} options={CATEGORIAS_GASTO} /></Field>
            <Field label="Unidad"><Select value={form.unidad} onChange={set('unidad')} options={UNIDADES} /></Field>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Stock actual"><Input type="number" min="0" step="any" value={form.stock} onChange={set('stock')} /></Field>
            <Field label="Stock mínimo"><Input type="number" min="0" step="any" value={form.stockMinimo} onChange={set('stockMinimo')} /></Field>
            <Field label="Costo prom."><Input type="number" min="0" step="any" value={form.costoPromedio} onChange={set('costoPromedio')} /></Field>
          </div>
          <p className="text-xs text-ink-400">Consejo: registra las compras desde <b>Gastos</b> para actualizar el stock y el costo promedio automáticamente.</p>
          <div className="flex gap-2 pt-1">
            <button type="button" className="btn-outline flex-1" onClick={() => setOpen(false)}>Cancelar</button>
            <button type="submit" className="btn-primary flex-1">{editId ? 'Guardar' : 'Crear material'}</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
