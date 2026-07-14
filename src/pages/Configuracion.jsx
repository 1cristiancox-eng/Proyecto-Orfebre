import React, { useState, useEffect } from 'react'
import { saveSettings, resetDatabase, ensureSeed, db, METODOS_PRORRATEO } from '../db.js'
import { useSettings } from '../hooks.js'
import { Card, SectionTitle, Field, Input, Select } from '../components/ui.jsx'
import { fmtMoney } from '../lib/format.js'

export default function Configuracion() {
  const settings = useSettings()
  const [local, setLocal] = useState(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => { if (settings) setLocal(settings) }, [settings])
  if (!local) return null

  const set = (k) => (e) => setLocal({ ...local, [k]: e.target.value })

  async function save() {
    await saveSettings({
      nombreNegocio: local.nombreNegocio,
      valorHora: Number(local.valorHora) || 0,
      metodoProrrateo: local.metodoProrrateo,
      porcentajeProrrateo: Number(local.porcentajeProrrateo) || 0,
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function exportBackup() {
    const data = {
      version: 1,
      exportedAt: new Date().toISOString(),
      settings: await db.settings.toArray(),
      materials: await db.materials.toArray(),
      expenses: await db.expenses.toArray(),
      products: await db.products.toArray(),
      sales: await db.sales.toArray(),
      overhead: await db.overhead.toArray(),
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `respaldo-orfebre-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function importBackup(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!window.confirm('Esto reemplazará todos los datos actuales. ¿Continuar?')) { e.target.value = ''; return }
    try {
      const data = JSON.parse(await file.text())
      await resetDatabase()
      await db.settings.clear()
      if (data.settings) await db.settings.bulkPut(data.settings)
      if (data.materials) await db.materials.bulkAdd(data.materials)
      if (data.expenses) await db.expenses.bulkAdd(data.expenses)
      if (data.products) await db.products.bulkAdd(data.products)
      if (data.sales) await db.sales.bulkAdd(data.sales)
      if (data.overhead) await db.overhead.bulkAdd(data.overhead)
      alert('Datos importados correctamente.')
    } catch (err) {
      alert('No se pudo importar el archivo: ' + err.message)
    }
    e.target.value = ''
  }

  async function reset() {
    if (window.confirm('¿Borrar TODOS los datos? Esta acción no se puede deshacer.')) {
      await resetDatabase()
      alert('Datos eliminados. La app quedará vacía.')
    }
  }

  async function loadDemo() {
    if (window.confirm('¿Cargar datos de ejemplo? (solo si la app está vacía)')) {
      await ensureSeed()
    }
  }

  return (
    <div>
      <SectionTitle title="Configuración" subtitle="Ajusta los parámetros de tu negocio." />

      <Card className="mb-4 space-y-4">
        <Field label="Nombre del negocio"><Input value={local.nombreNegocio || ''} onChange={set('nombreNegocio')} /></Field>
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Valor de la hora de trabajo (CLP)" hint="Se usa para calcular la mano de obra.">
            <Input type="number" min="0" value={local.valorHora} onChange={set('valorHora')} />
          </Field>
          <Field label="Método de prorrateo de gastos generales">
            <Select value={local.metodoProrrateo} onChange={set('metodoProrrateo')} options={METODOS_PRORRATEO.map((m) => ({ value: m.id, label: m.label }))} />
          </Field>
          {local.metodoProrrateo === 'porcentaje' && (
            <Field label="Porcentaje (%)"><Input type="number" min="0" value={local.porcentajeProrrateo} onChange={set('porcentajeProrrateo')} /></Field>
          )}
        </div>
        <p className="text-sm text-ink-500">Ejemplo: con {fmtMoney(local.valorHora)}/hora, una pieza de 5 horas suma <b>{fmtMoney((Number(local.valorHora) || 0) * 5)}</b> de mano de obra.</p>
        <div className="flex items-center gap-3">
          <button className="btn-primary" onClick={save}>Guardar cambios</button>
          {saved && <span className="text-sm text-emerald-600 font-medium">✓ Guardado</span>}
        </div>
      </Card>

      <Card className="mb-4">
        <h3 className="font-bold text-ink-800 mb-1">Respaldo de datos</h3>
        <p className="text-sm text-ink-400 mb-3">Tus datos viven en este dispositivo. Exporta un respaldo para no perderlos.</p>
        <div className="flex flex-wrap gap-2">
          <button className="btn-outline" onClick={exportBackup}>⬇️ Exportar respaldo (JSON)</button>
          <label className="btn-outline cursor-pointer">
            ⬆️ Importar respaldo
            <input type="file" accept="application/json" className="hidden" onChange={importBackup} />
          </label>
        </div>
      </Card>

      <Card>
        <h3 className="font-bold text-ink-800 mb-1">Datos</h3>
        <div className="flex flex-wrap gap-2 mt-2">
          <button className="btn-outline" onClick={loadDemo}>Cargar datos de ejemplo</button>
          <button className="btn-danger" onClick={reset}>Borrar todos los datos</button>
        </div>
      </Card>

      <p className="text-center text-xs text-ink-300 mt-6">Orfebre · App instalable (PWA) · v1.0</p>
    </div>
  )
}
