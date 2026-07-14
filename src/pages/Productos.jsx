import React, { useMemo, useState } from 'react'
import { saveProduct, deleteProduct, CATEGORIAS_PRODUCTO, ESTADOS_PRODUCTO, UNIDADES } from '../db.js'
import { useProducts, useMaterials, useOverhead, useSettings } from '../hooks.js'
import { fmtMoney, fmtDate, fmtNum, todayISO } from '../lib/format.js'
import { computeOverheadAllocation, productCost } from '../lib/calc.js'
import {
  Card, SectionTitle, Field, Input, Select, Textarea, Modal, Badge, EmptyState, IconButton, Icons, ESTADO_COLOR,
} from '../components/ui.jsx'

const emptyForm = () => ({
  codigo: '',
  nombre: '',
  categoria: 'Anillo',
  descripcion: '',
  fechaInicio: todayISO(),
  fechaTermino: '',
  estado: 'En fabricación',
  horas: '',
  gastosAdicionales: '',
  fotos: [],
  materiales: [],
})

export default function Productos() {
  const products = useProducts()
  const materials = useMaterials()
  const overhead = useOverhead()
  const settings = useSettings()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(emptyForm())
  const [editId, setEditId] = useState(null)
  const [prevMats, setPrevMats] = useState([])
  const [fEstado, setFEstado] = useState('')
  const [q, setQ] = useState('')

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const { alloc } = useMemo(
    () => computeOverheadAllocation(products || [], overhead || [], settings || {}),
    [products, overhead, settings],
  )

  const filtered = useMemo(() => {
    return (products || [])
      .filter((p) => (!fEstado || p.estado === fEstado) && (!q || `${p.codigo} ${p.nombre} ${p.categoria}`.toLowerCase().includes(q.toLowerCase())))
      .sort((a, b) => (b.fechaInicio || '').localeCompare(a.fechaInicio || ''))
  }, [products, fEstado, q])

  function openNew() {
    setForm(emptyForm())
    setEditId(null)
    setPrevMats([])
    setOpen(true)
  }
  function openEdit(p) {
    setForm({
      codigo: p.codigo || '', nombre: p.nombre || '', categoria: p.categoria || 'Anillo',
      descripcion: p.descripcion || '', fechaInicio: p.fechaInicio || todayISO(), fechaTermino: p.fechaTermino || '',
      estado: p.estado || 'En fabricación', horas: p.horas ?? '', gastosAdicionales: p.gastosAdicionales ?? '',
      fotos: p.fotos || [], materiales: (p.materiales || []).map((m) => ({ ...m })),
    })
    setEditId(p.id)
    setPrevMats((p.materiales || []).map((m) => ({ ...m })))
    setOpen(true)
  }

  // --- Materiales (filas) ---
  function addMatRow() {
    setForm((f) => ({ ...f, materiales: [...f.materiales, { materialId: '', nombre: '', cantidad: '', unidad: 'g', costoUnit: '' }] }))
  }
  function updateMatRow(i, patch) {
    setForm((f) => {
      const arr = [...f.materiales]
      arr[i] = { ...arr[i], ...patch }
      return { ...f, materiales: arr }
    })
  }
  function removeMatRow(i) {
    setForm((f) => ({ ...f, materiales: f.materiales.filter((_, idx) => idx !== i) }))
  }
  function onSelectMaterial(i, materialId) {
    const m = (materials || []).find((x) => x.id === Number(materialId))
    updateMatRow(i, {
      materialId: materialId ? Number(materialId) : '',
      nombre: m ? m.nombre : '',
      unidad: m ? m.unidad : 'g',
      costoUnit: m ? m.costoPromedio : '',
    })
  }

  // --- Fotos ---
  function onPhotos(e) {
    const files = Array.from(e.target.files || [])
    files.forEach((file) => {
      const reader = new FileReader()
      reader.onload = () => {
        // Redimensiona para no llenar el almacenamiento
        const img = new Image()
        img.onload = () => {
          const canvas = document.createElement('canvas')
          const max = 800
          let { width, height } = img
          if (width > max || height > max) {
            if (width > height) { height = (height * max) / width; width = max }
            else { width = (width * max) / height; height = max }
          }
          canvas.width = width; canvas.height = height
          canvas.getContext('2d').drawImage(img, 0, 0, width, height)
          const dataUrl = canvas.toDataURL('image/jpeg', 0.75)
          setForm((f) => ({ ...f, fotos: [...f.fotos, dataUrl] }))
        }
        img.src = reader.result
      }
      reader.readAsDataURL(file)
    })
    e.target.value = ''
  }
  function removePhoto(i) {
    setForm((f) => ({ ...f, fotos: f.fotos.filter((_, idx) => idx !== i) }))
  }

  // --- Cálculo en vivo ---
  const live = useMemo(() => {
    const valorHora = Number(settings?.valorHora) || 0
    let costoMateriales = 0
    for (const m of form.materiales) {
      const cant = Number(m.cantidad) || 0
      costoMateriales += cant * (Number(m.costoUnit) || 0)
    }
    const manoObra = (Number(form.horas) || 0) * valorHora
    const gastosAdicionales = Number(form.gastosAdicionales) || 0
    // Estimación de overhead: si editamos, usamos el ya calculado; si es nuevo, 0 hasta guardar
    const oh = editId ? alloc[editId] || 0 : 0
    return { costoMateriales, manoObra, gastosAdicionales, overhead: oh, total: costoMateriales + manoObra + gastosAdicionales + oh }
  }, [form.materiales, form.horas, form.gastosAdicionales, settings, alloc, editId])

  async function save(e) {
    e.preventDefault()
    await saveProduct(
      {
        id: editId || undefined,
        codigo: form.codigo.trim() || `P-${Date.now().toString().slice(-5)}`,
        nombre: form.nombre.trim(),
        categoria: form.categoria,
        descripcion: form.descripcion.trim(),
        fechaInicio: form.fechaInicio,
        fechaTermino: form.fechaTermino,
        estado: form.estado,
        horas: Number(form.horas) || 0,
        gastosAdicionales: Number(form.gastosAdicionales) || 0,
        fotos: form.fotos,
        materiales: form.materiales.map((m) => ({
          materialId: m.materialId ? Number(m.materialId) : null,
          nombre: m.nombre,
          cantidad: Number(m.cantidad) || 0,
          unidad: m.unidad,
          costoUnit: Number(m.costoUnit) || 0,
        })),
      },
      prevMats,
    )
    setOpen(false)
  }

  async function remove(p) {
    if (window.confirm(`¿Eliminar "${p.nombre}"? Se devolverán los materiales al inventario y se borrarán sus ventas.`)) {
      await deleteProduct(p.id)
    }
  }

  return (
    <div>
      <SectionTitle
        title="Productos y fabricación"
        subtitle="Cada pieza con sus materiales, horas y costo total calculado automáticamente."
        action={<button className="btn-primary" onClick={openNew}>{Icons.plus}<span className="hidden sm:inline">Nuevo producto</span></button>}
      />

      <Card className="mb-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Estado"><Select value={fEstado} onChange={(e) => setFEstado(e.target.value)} placeholder="Todos" options={ESTADOS_PRODUCTO} /></Field>
          <Field label="Buscar"><Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Código, nombre…" /></Field>
        </div>
      </Card>

      {filtered.length === 0 ? (
        <EmptyState title="Sin productos" subtitle="Crea la ficha de tu primera pieza fabricada." action={<button className="btn-primary" onClick={openNew}>{Icons.plus} Nuevo producto</button>} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((p) => {
            const cost = productCost(p, settings || {}, alloc[p.id] || 0)
            return (
              <div key={p.id} className="card overflow-hidden flex flex-col">
                <div className="aspect-[16/10] bg-ink-50 relative">
                  {p.fotos?.[0] ? (
                    <img src={p.fotos[0]} alt={p.nombre} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-ink-200">
                      <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2"><path d="M6 3h12l3 6-9 12L3 9l3-6z" /></svg>
                    </div>
                  )}
                  <div className="absolute top-2 left-2"><Badge color={ESTADO_COLOR[p.estado]}>{p.estado}</Badge></div>
                </div>
                <div className="p-4 flex-1 flex flex-col">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs text-ink-400 font-mono">{p.codigo}</p>
                      <h3 className="font-bold text-ink-900 leading-tight">{p.nombre}</h3>
                    </div>
                    <Badge>{p.categoria}</Badge>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                    <Cost label="Materiales" value={cost.costoMateriales} />
                    <Cost label="Mano de obra" value={cost.manoObra} />
                    <Cost label="Gastos grales." value={cost.overhead} />
                    <Cost label="Adicionales" value={cost.gastosAdicionales} />
                  </div>
                  <div className="mt-3 pt-3 border-t border-ink-100 flex items-end justify-between">
                    <div>
                      <p className="text-xs text-ink-400">Costo total</p>
                      <p className="text-lg font-extrabold text-gold-700">{fmtMoney(cost.costoTotal)}</p>
                    </div>
                    <p className="text-xs text-ink-400">{fmtNum(p.horas, 1)} h</p>
                  </div>
                  <div className="mt-3 flex gap-1 justify-end">
                    <IconButton title="Editar" onClick={() => openEdit(p)}>{Icons.edit}</IconButton>
                    <IconButton tone="danger" title="Eliminar" onClick={() => remove(p)}>{Icons.trash}</IconButton>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={editId ? 'Editar producto' : 'Nuevo producto'} size="xl">
        <form onSubmit={save} className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <Field label="Código"><Input value={form.codigo} onChange={set('codigo')} placeholder="AN-001" /></Field>
            <Field label="Nombre" className="col-span-1 sm:col-span-2"><Input value={form.nombre} onChange={set('nombre')} placeholder="Anillo turquesa" required /></Field>
            <Field label="Categoría"><Select value={form.categoria} onChange={set('categoria')} options={CATEGORIAS_PRODUCTO} /></Field>
            <Field label="Estado"><Select value={form.estado} onChange={set('estado')} options={ESTADOS_PRODUCTO} /></Field>
            <Field label="Horas de trabajo"><Input type="number" min="0" step="any" value={form.horas} onChange={set('horas')} placeholder="0" /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Fecha inicio"><Input type="date" value={form.fechaInicio} onChange={set('fechaInicio')} /></Field>
            <Field label="Fecha término"><Input type="date" value={form.fechaTermino} onChange={set('fechaTermino')} /></Field>
          </div>
          <Field label="Descripción"><Textarea value={form.descripcion} onChange={set('descripcion')} placeholder="Detalles de la pieza…" /></Field>

          {/* Materiales */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="label !mb-0">Materiales utilizados</label>
              <button type="button" className="text-xs font-semibold text-gold-700" onClick={addMatRow}>➕ Agregar material</button>
            </div>
            {form.materiales.length === 0 && <p className="text-sm text-ink-400 py-2">Sin materiales. Agrega los materiales usados en esta pieza.</p>}
            <div className="space-y-2">
              {form.materiales.map((m, i) => {
                const inv = (materials || []).find((x) => x.id === Number(m.materialId))
                return (
                  <div key={i} className="rounded-xl border border-ink-100 p-2.5 bg-ink-50/30">
                    <div className="grid grid-cols-12 gap-2 items-end">
                      <div className="col-span-12 sm:col-span-5">
                        <Field label="Material (inventario)">
                          <Select value={m.materialId} onChange={(e) => onSelectMaterial(i, e.target.value)} placeholder="— Material libre —"
                            options={(materials || []).map((x) => ({ value: x.id, label: `${x.nombre} · stock ${fmtNum(x.stock, 1)}${x.unidad}` }))} />
                        </Field>
                      </div>
                      {!m.materialId && (
                        <div className="col-span-6 sm:col-span-3">
                          <Field label="Nombre"><Input value={m.nombre} onChange={(e) => updateMatRow(i, { nombre: e.target.value })} placeholder="Material" /></Field>
                        </div>
                      )}
                      <div className="col-span-4 sm:col-span-2">
                        <Field label="Cantidad"><Input type="number" min="0" step="any" value={m.cantidad} onChange={(e) => updateMatRow(i, { cantidad: e.target.value })} /></Field>
                      </div>
                      <div className="col-span-4 sm:col-span-2">
                        <Field label="Costo unit."><Input type="number" min="0" step="any" value={m.costoUnit} onChange={(e) => updateMatRow(i, { costoUnit: e.target.value })} readOnly={!!m.materialId} /></Field>
                      </div>
                      <div className="col-span-4 sm:col-span-12 flex sm:justify-end">
                        <button type="button" className="btn-danger !py-2 w-full sm:w-auto" onClick={() => removeMatRow(i)}>{Icons.trash}</button>
                      </div>
                    </div>
                    <p className="text-xs text-ink-400 mt-1">
                      Subtotal: <b>{fmtMoney((Number(m.cantidad) || 0) * (Number(m.costoUnit) || 0))}</b>
                      {inv && ` · costo promedio inventario ${fmtMoney(inv.costoPromedio)}/${inv.unidad}`}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Gastos adicionales (CLP)" hint="Ej: pulido, baño de oro"><Input type="number" min="0" value={form.gastosAdicionales} onChange={set('gastosAdicionales')} placeholder="0" /></Field>
          </div>

          {/* Fotos */}
          <div>
            <label className="label">Fotografías</label>
            <div className="flex flex-wrap gap-2">
              {form.fotos.map((src, i) => (
                <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border border-ink-100">
                  <img src={src} alt="" className="w-full h-full object-cover" />
                  <button type="button" onClick={() => removePhoto(i)} className="absolute top-0.5 right-0.5 bg-ink-900/60 text-white rounded-full w-5 h-5 text-xs">×</button>
                </div>
              ))}
              <label className="w-20 h-20 rounded-lg border-2 border-dashed border-ink-200 flex items-center justify-center cursor-pointer text-ink-400 hover:border-gold-400">
                <input type="file" accept="image/*" multiple className="hidden" onChange={onPhotos} />
                {Icons.plus}
              </label>
            </div>
          </div>

          {/* Resumen de costo */}
          <div className="rounded-xl bg-gold-50 border border-gold-100 p-4">
            <p className="text-xs font-semibold text-gold-800 mb-2">💰 Costo estimado de fabricación</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
              <SumItem label="Materiales" value={live.costoMateriales} />
              <SumItem label="Mano de obra" value={live.manoObra} />
              <SumItem label="Adicionales" value={live.gastosAdicionales} />
              <SumItem label="Gastos grales." value={live.overhead} note={editId ? '' : 'al guardar'} />
            </div>
            <div className="mt-3 pt-3 border-t border-gold-200 flex justify-between items-center">
              <span className="font-semibold text-ink-700">Costo total</span>
              <span className="text-xl font-extrabold text-gold-700">{fmtMoney(live.total)}</span>
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <button type="button" className="btn-outline flex-1" onClick={() => setOpen(false)}>Cancelar</button>
            <button type="submit" className="btn-primary flex-1">{editId ? 'Guardar cambios' : 'Crear producto'}</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

function Cost({ label, value }) {
  return (
    <div className="flex justify-between">
      <span className="text-ink-400">{label}</span>
      <span className="font-medium text-ink-700">{fmtMoney(value)}</span>
    </div>
  )
}
function SumItem({ label, value, note }) {
  return (
    <div>
      <p className="text-xs text-ink-400">{label}{note ? ` (${note})` : ''}</p>
      <p className="font-bold text-ink-800">{fmtMoney(value)}</p>
    </div>
  )
}
