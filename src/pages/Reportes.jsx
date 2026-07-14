import React, { useMemo, useState } from 'react'
import { useAllData } from '../hooks.js'
import { computeAnalytics } from '../lib/analytics.js'
import { buildContext, productCost } from '../lib/calc.js'
import { exportExcel, exportPDF } from '../lib/export.js'
import { fmtMoney, fmtNum, fmtPct, fmtDate, mesLabel, currentMonth } from '../lib/format.js'
import { Card, SectionTitle, Field, Input, Badge } from '../components/ui.jsx'

export default function Reportes() {
  const { products, sales, expenses, overhead, materials, settings, loading } = useAllData()
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const a = useMemo(
    () => (loading ? null : computeAnalytics({ products, sales, expenses, overhead, materials, settings, from, to })),
    [products, sales, expenses, overhead, materials, settings, from, to, loading],
  )

  if (loading || !a) return <div className="py-20 text-center text-ink-400">Cargando…</div>

  const negocio = settings?.nombreNegocio || 'Taller de Orfebrería'
  const periodo = from || to ? `${from ? fmtDate(from) : 'inicio'} – ${to ? fmtDate(to) : 'hoy'}` : 'Todo el período'
  const { costByProduct } = buildContext({ products, overhead, sales, settings })

  // --- Constructores de filas para exportar ---
  function rowsResumen() {
    return [
      { Indicador: 'Ventas totales', Valor: a.ventasTotales },
      { Indicador: 'Ingreso neto', Valor: a.ingresoNetoTotal },
      { Indicador: 'Gastos en compras', Valor: a.gastosCompras },
      { Indicador: 'Gastos generales', Valor: a.gastosGenerales },
      { Indicador: 'Gastos totales', Valor: a.gastosTotales },
      { Indicador: 'Utilidad bruta', Valor: a.utilidadBruta },
      { Indicador: 'Utilidad neta', Valor: a.utilidadNeta },
      { Indicador: 'Margen promedio (%)', Valor: Number(a.margenPromedio.toFixed(1)) },
      { Indicador: 'Rentabilidad por hora', Valor: Math.round(a.rentPorHoraGlobal) },
      { Indicador: 'Horas trabajadas', Valor: a.horasTrabajadas },
      { Indicador: 'Valor inventario materiales', Valor: Math.round(a.valorMateriales) },
    ]
  }
  function rowsVentas() {
    const { productById } = buildContext({ products, overhead, sales, settings })
    return sales
      .filter((s) => (!from || s.fecha >= from) && (!to || s.fecha <= to))
      .map((s) => {
        const p = productById[s.productId]
        const cost = costByProduct[s.productId] || { costoTotal: 0 }
        const neto = (Number(s.precioVenta) || 0) - (Number(s.descuento) || 0) - (Number(s.comision) || 0) - (Number(s.costoEnvio) || 0) - (Number(s.otrosGastos) || 0)
        const util = neto - cost.costoTotal
        return {
          Fecha: s.fecha, Producto: p ? p.nombre : '—', Canal: s.canal, 'Medio pago': s.medioPago,
          Cliente: s.cliente || '', 'Precio venta': Number(s.precioVenta) || 0, 'Ingreso neto': neto,
          'Costo': Math.round(cost.costoTotal), 'Utilidad': Math.round(util), 'Margen %': neto ? Number(((util / neto) * 100).toFixed(1)) : 0,
        }
      })
  }
  function rowsGastos() {
    const compras = expenses.filter((e) => (!from || e.fecha >= from) && (!to || e.fecha <= to)).map((e) => ({
      Fecha: e.fecha, Tipo: 'Compra', Categoría: e.categoria, Detalle: e.observaciones || e.tipo, Proveedor: e.proveedor || '', Monto: Number(e.monto) || 0,
    }))
    const gen = overhead.filter((o) => (!from || o.mes >= from.slice(0, 7)) && (!to || o.mes <= to.slice(0, 7))).map((o) => ({
      Fecha: o.mes, Tipo: 'General', Categoría: o.categoria, Detalle: o.concepto || '', Proveedor: '', Monto: Number(o.monto) || 0,
    }))
    return [...compras, ...gen]
  }
  function rowsRentProducto() {
    return a.productos.map((r) => ({
      Código: r.codigo, Producto: r.nombre, Categoría: r.categoria, 'Vendidos': r.cantidad,
      'Ingreso': Math.round(r.ingreso), 'Utilidad': Math.round(r.utilidad), 'Margen %': Number(r.margen.toFixed(1)),
      'Horas': r.horas, 'Rent/hora': Math.round(r.rentHora),
    }))
  }
  function rowsRentCategoria() {
    return a.rentPorCategoria.map((c) => ({
      Categoría: c.categoria, 'Vendidos': c.cantidad, 'Ingreso': Math.round(c.ingreso),
      'Utilidad': Math.round(c.utilidad), 'Margen %': Number(c.margen.toFixed(1)), 'Horas': c.horas,
    }))
  }
  function rowsInventario() {
    return materials.map((m) => ({
      Material: m.nombre, Categoría: m.categoria, Unidad: m.unidad, 'Stock': Number(m.stock) || 0,
      'Stock mínimo': Number(m.stockMinimo) || 0, 'Costo promedio': Math.round(m.costoPromedio || 0),
      'Valor': Math.round((m.stock || 0) * (m.costoPromedio || 0)), 'Reponer': (m.stock || 0) <= (m.stockMinimo || 0) ? 'Sí' : 'No',
    }))
  }
  function rowsProductosEstado() {
    return products.map((p) => ({
      Código: p.codigo, Producto: p.nombre, Categoría: p.categoria, Estado: p.estado,
      'Inicio': p.fechaInicio || '', 'Término': p.fechaTermino || '', 'Horas': Number(p.horas) || 0,
      'Costo total': Math.round(costByProduct[p.id]?.costoTotal || 0),
    }))
  }
  function rowsHoras() {
    return products.map((p) => ({
      Código: p.codigo, Producto: p.nombre, 'Horas': Number(p.horas) || 0,
      'Valor hora': Number(settings?.valorHora) || 0, 'Mano de obra': Math.round((Number(p.horas) || 0) * (Number(settings?.valorHora) || 0)),
    }))
  }

  // --- Acciones de exportación ---
  function excelCompleto() {
    exportExcel(`reporte-orfebre-${currentMonth()}`, [
      { name: 'Resumen', rows: rowsResumen() },
      { name: 'Ventas', rows: rowsVentas() },
      { name: 'Gastos', rows: rowsGastos() },
      { name: 'Rent. Producto', rows: rowsRentProducto() },
      { name: 'Rent. Categoría', rows: rowsRentCategoria() },
      { name: 'Horas', rows: rowsHoras() },
      { name: 'Inventario', rows: rowsInventario() },
      { name: 'Productos', rows: rowsProductosEstado() },
    ])
  }

  function pdfResumen() {
    const money = (v) => fmtMoney(v)
    exportPDF(`resumen-orfebre-${currentMonth()}`, `Resumen del negocio · ${periodo}`, [
      {
        title: 'Indicadores principales',
        head: ['Indicador', 'Valor'],
        body: [
          ['Ventas totales', money(a.ventasTotales)],
          ['Gastos totales', money(a.gastosTotales)],
          ['Utilidad bruta', money(a.utilidadBruta)],
          ['Utilidad neta', money(a.utilidadNeta)],
          ['Margen promedio', fmtPct(a.margenPromedio)],
          ['Rentabilidad por hora', money(a.rentPorHoraGlobal)],
          ['Valor inventario', money(a.valorMateriales)],
        ],
      },
      {
        title: 'Rentabilidad por categoría',
        head: ['Categoría', 'Vendidos', 'Ingreso', 'Utilidad', 'Margen %'],
        body: a.rentPorCategoria.map((c) => [c.categoria, c.cantidad, money(c.ingreso), money(c.utilidad), fmtPct(c.margen)]),
      },
      {
        title: 'Productos con mayor utilidad',
        head: ['Producto', 'Vendidos', 'Utilidad', 'Margen %'],
        body: a.mayorUtilidad.slice(0, 10).map((r) => [r.nombre, r.cantidad, money(r.utilidad), fmtPct(r.margen)]),
      },
    ], { negocio })
  }

  function pdfVentas() {
    const money = (v) => fmtMoney(v)
    const rows = rowsVentas()
    exportPDF(`ventas-orfebre-${currentMonth()}`, `Detalle de ventas · ${periodo}`, [
      {
        title: `${rows.length} venta(s)`,
        head: ['Fecha', 'Producto', 'Canal', 'Precio', 'Utilidad', 'Margen'],
        body: rows.map((r) => [fmtDate(r.Fecha), r.Producto, r.Canal, money(r['Precio venta']), money(r.Utilidad), fmtPct(r['Margen %'])]),
      },
    ], { negocio })
  }

  function pdfInventario() {
    const money = (v) => fmtMoney(v)
    exportPDF(`inventario-orfebre-${currentMonth()}`, 'Inventario de materiales', [
      {
        title: 'Materiales',
        head: ['Material', 'Categoría', 'Stock', 'Mínimo', 'Costo prom.', 'Valor', 'Reponer'],
        body: materials.map((m) => [m.nombre, m.categoria, `${fmtNum(m.stock, 1)} ${m.unidad}`, fmtNum(m.stockMinimo, 0), money(m.costoPromedio), money((m.stock || 0) * (m.costoPromedio || 0)), (m.stock || 0) <= (m.stockMinimo || 0) ? 'Sí' : 'No']),
      },
    ], { negocio })
  }

  const reportes = [
    { titulo: 'Resumen mensual del negocio', desc: 'Indicadores clave, rentabilidad por categoría y top productos.', pdf: pdfResumen },
    { titulo: 'Detalle de ventas', desc: 'Todas las ventas con utilidad y margen.', pdf: pdfVentas, excel: () => exportExcel(`ventas-${currentMonth()}`, [{ name: 'Ventas', rows: rowsVentas() }]) },
    { titulo: 'Detalle de ingresos y gastos', desc: 'Compras y gastos generales del período.', excel: () => exportExcel(`gastos-${currentMonth()}`, [{ name: 'Gastos', rows: rowsGastos() }]) },
    { titulo: 'Rentabilidad por producto', desc: 'Utilidad, margen y rentabilidad por hora.', excel: () => exportExcel(`rent-producto-${currentMonth()}`, [{ name: 'Rentabilidad', rows: rowsRentProducto() }]) },
    { titulo: 'Rentabilidad por categoría', desc: 'Comparativa por tipo de pieza.', excel: () => exportExcel(`rent-categoria-${currentMonth()}`, [{ name: 'Categoría', rows: rowsRentCategoria() }]) },
    { titulo: 'Horas trabajadas', desc: 'Horas y mano de obra por producto.', excel: () => exportExcel(`horas-${currentMonth()}`, [{ name: 'Horas', rows: rowsHoras() }]) },
    { titulo: 'Inventario de materiales', desc: 'Stock, costo y valor.', pdf: pdfInventario, excel: () => exportExcel(`inventario-${currentMonth()}`, [{ name: 'Inventario', rows: rowsInventario() }]) },
    { titulo: 'Productos disponibles y vendidos', desc: 'Estado y costo de cada pieza.', excel: () => exportExcel(`productos-${currentMonth()}`, [{ name: 'Productos', rows: rowsProductosEstado() }]) },
  ]

  return (
    <div>
      <SectionTitle title="Reportes" subtitle="Genera y descarga reportes en Excel o PDF." />

      <Card className="mb-5">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 items-end">
          <Field label="Desde"><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></Field>
          <Field label="Hasta"><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></Field>
          <div className="flex items-end"><Badge color="gold">{periodo}</Badge></div>
        </div>
        <div className="mt-4">
          <button className="btn-primary" onClick={excelCompleto}>⬇️ Exportar TODO a Excel (multi-hoja)</button>
        </div>
      </Card>

      {/* Vista rápida de indicadores */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <Mini label="Ventas" value={fmtMoney(a.ventasTotales)} />
        <Mini label="Gastos" value={fmtMoney(a.gastosTotales)} />
        <Mini label="Utilidad neta" value={fmtMoney(a.utilidadNeta)} />
        <Mini label="Margen prom." value={fmtPct(a.margenPromedio)} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {reportes.map((r, i) => (
          <Card key={i} className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="font-semibold text-ink-800">{r.titulo}</p>
              <p className="text-sm text-ink-400">{r.desc}</p>
            </div>
            <div className="flex gap-2 shrink-0">
              {r.excel && <button className="btn-outline !px-3" onClick={r.excel} title="Excel">Excel</button>}
              {r.pdf && <button className="btn-outline !px-3" onClick={r.pdf} title="PDF">PDF</button>}
            </div>
          </Card>
        ))}
      </div>

      <div className="mt-6">
        <ComparativaMeses products={products} sales={sales} expenses={expenses} overhead={overhead} materials={materials} settings={settings} />
      </div>
    </div>
  )
}

function Mini({ label, value }) {
  return (
    <div className="card p-3">
      <p className="text-xs text-ink-400">{label}</p>
      <p className="font-bold text-ink-800">{value}</p>
    </div>
  )
}

// Comparación entre meses
function ComparativaMeses({ products, sales, expenses, overhead, materials, settings }) {
  const meses = useMemo(() => {
    const set = new Set()
    sales.forEach((s) => set.add(s.fecha?.slice(0, 7)))
    expenses.forEach((e) => set.add(e.fecha?.slice(0, 7)))
    overhead.forEach((o) => set.add(o.mes))
    return [...set].filter(Boolean).sort().reverse()
  }, [sales, expenses, overhead])

  const filas = meses.map((mes) => {
    const a = computeAnalytics({ products, sales, expenses, overhead, materials, settings, from: mes + '-01', to: mes + '-31' })
    return { mes, ...a }
  })

  if (filas.length === 0) return null

  return (
    <Card className="!p-0 overflow-hidden">
      <div className="p-4 border-b border-ink-100"><h3 className="font-bold text-ink-800">Comparación entre meses</h3></div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-ink-50/60"><tr>
            <th className="th">Mes</th><th className="th text-right">Ventas</th><th className="th text-right">Gastos</th><th className="th text-right">Utilidad</th><th className="th text-right">Margen</th>
          </tr></thead>
          <tbody className="divide-y divide-ink-50">
            {filas.map((f) => (
              <tr key={f.mes} className="hover:bg-gold-50/40">
                <td className="td capitalize font-medium">{mesLabel(f.mes)}</td>
                <td className="td text-right">{fmtMoney(f.ventasTotales)}</td>
                <td className="td text-right">{fmtMoney(f.gastosTotales)}</td>
                <td className={`td text-right font-semibold ${f.utilidadNeta >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{fmtMoney(f.utilidadNeta)}</td>
                <td className="td text-right">{fmtPct(f.margenPromedio)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
