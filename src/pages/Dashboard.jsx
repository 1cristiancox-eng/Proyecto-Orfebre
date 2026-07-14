import React, { useMemo, useState } from 'react'
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts'
import { useAllData } from '../hooks.js'
import { computeAnalytics } from '../lib/analytics.js'
import { fmtMoney, fmtPct, fmtNum, mesLabel, currentMonth } from '../lib/format.js'
import { CANALES_VENTA, CATEGORIAS_PRODUCTO } from '../db.js'
import { Card, SectionTitle, Field, Select, Input, Stat, Badge } from '../components/ui.jsx'

const PALETTE = ['#c9a227', '#8a6d1a', '#4c8577', '#3f6b8a', '#a2506e', '#6d5aa2', '#b07d3c', '#7c7f8a']
const money = (v) => fmtMoney(v)

export default function Dashboard() {
  const { products, sales, expenses, overhead, materials, settings, loading } = useAllData()
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [canal, setCanal] = useState('')
  const [categoria, setCategoria] = useState('')

  const a = useMemo(
    () => (loading ? null : computeAnalytics({ products, sales, expenses, overhead, materials, settings, from, to, canal, categoria })),
    [products, sales, expenses, overhead, materials, settings, from, to, canal, categoria, loading],
  )

  if (loading || !a) return <div className="py-20 text-center text-ink-400">Cargando…</div>

  const serie = a.serieMensual.map((s) => ({ ...s, label: mesLabel(s.mes).replace(/ de /, ' ') }))

  return (
    <div>
      <SectionTitle title={`Hola 👋 ${settings?.nombreNegocio || ''}`} subtitle="Resumen de la salud financiera de tu taller." />

      {/* Filtros */}
      <Card className="mb-5">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Field label="Desde"><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></Field>
          <Field label="Hasta"><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></Field>
          <Field label="Canal"><Select value={canal} onChange={(e) => setCanal(e.target.value)} placeholder="Todos" options={CANALES_VENTA} /></Field>
          <Field label="Categoría"><Select value={categoria} onChange={(e) => setCategoria(e.target.value)} placeholder="Todas" options={CATEGORIAS_PRODUCTO} /></Field>
        </div>
        <div className="flex gap-2 mt-3 flex-wrap">
          <QuickRange label="Este mes" onClick={() => { setFrom(currentMonth() + '-01'); setTo('') }} />
          <QuickRange label="Este año" onClick={() => { setFrom(currentMonth().slice(0, 4) + '-01-01'); setTo('') }} />
          <QuickRange label="Todo" onClick={() => { setFrom(''); setTo(''); setCanal(''); setCategoria('') }} />
        </div>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <Stat label="Ventas totales" value={money(a.ventasTotales)} sub={`${a.ventasCount} venta(s)`} tone="gold" />
        <Stat label="Gastos totales" value={money(a.gastosTotales)} sub={`Compras ${money(a.gastosCompras)} · Grales ${money(a.gastosGenerales)}`} />
        <Stat label="Utilidad neta" value={money(a.utilidadNeta)} tone={a.utilidadNeta >= 0 ? 'positive' : 'negative'} sub={`Bruta ${money(a.utilidadBruta)}`} />
        <Stat label="Margen promedio" value={fmtPct(a.margenPromedio)} tone={a.margenPromedio >= 0 ? 'positive' : 'negative'} />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <Stat label="Rent. por hora" value={money(a.rentPorHoraGlobal)} sub="utilidad / hora vendida" />
        <Stat label="Valor inventario" value={money(a.valorMateriales)} sub="materiales en stock" />
        <Stat label="Prod. disponibles" value={money(a.valorProductos)} sub="costo terminados" />
        <Stat label="Por reponer" value={a.bajoStock.length} tone={a.bajoStock.length ? 'negative' : 'default'} sub="materiales bajo mínimo" />
      </div>

      {/* Evolución mensual */}
      <Card className="mb-5">
        <h3 className="font-bold text-ink-800 mb-4">Evolución mensual</h3>
        {serie.length === 0 ? <Empty /> : (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={serie} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#7c7f8a' }} />
              <YAxis tick={{ fontSize: 11, fill: '#7c7f8a' }} tickFormatter={(v) => (v >= 1000 ? `${v / 1000}k` : v)} width={44} />
              <Tooltip formatter={(v) => money(v)} contentStyle={{ borderRadius: 12, border: '1px solid #eee', fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="ingresos" name="Ingresos" stroke="#4c8577" strokeWidth={2.5} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="gastos" name="Gastos" stroke="#a2506e" strokeWidth={2.5} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="utilidad" name="Utilidad" stroke="#c9a227" strokeWidth={2.5} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </Card>

      <div className="grid lg:grid-cols-2 gap-5 mb-5">
        {/* Productos más vendidos */}
        <Card>
          <h3 className="font-bold text-ink-800 mb-4">Productos más vendidos</h3>
          {a.masVendidos.length === 0 ? <Empty /> : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={a.masVendidos} layout="vertical" margin={{ left: 10, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#7c7f8a' }} allowDecimals={false} />
                <YAxis type="category" dataKey="nombre" tick={{ fontSize: 11, fill: '#7c7f8a' }} width={90} />
                <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} formatter={(v) => `${v} unidad(es)`} />
                <Bar dataKey="cantidad" name="Vendidos" fill="#c9a227" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Distribución de gastos */}
        <Card>
          <h3 className="font-bold text-ink-800 mb-4">Distribución de gastos por categoría</h3>
          {a.distribucionGastos.length === 0 ? <Empty /> : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={a.distribucionGastos} dataKey="monto" nameKey="categoria" cx="50%" cy="50%" outerRadius={90} innerRadius={45} paddingAngle={2}>
                  {a.distribucionGastos.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => money(v)} contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Mayor utilidad */}
        <Card>
          <h3 className="font-bold text-ink-800 mb-4">Productos con mayor utilidad</h3>
          {a.mayorUtilidad.length === 0 ? <Empty /> : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={a.mayorUtilidad} layout="vertical" margin={{ left: 10, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#7c7f8a' }} tickFormatter={(v) => (Math.abs(v) >= 1000 ? `${v / 1000}k` : v)} />
                <YAxis type="category" dataKey="nombre" tick={{ fontSize: 11, fill: '#7c7f8a' }} width={90} />
                <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} formatter={(v) => money(v)} />
                <Bar dataKey="utilidad" name="Utilidad" radius={[0, 6, 6, 0]}>
                  {a.mayorUtilidad.map((r, i) => <Cell key={i} fill={r.utilidad >= 0 ? '#4c8577' : '#a2506e'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Rentabilidad por categoría */}
        <Card>
          <h3 className="font-bold text-ink-800 mb-4">Rentabilidad por categoría</h3>
          {a.rentPorCategoria.length === 0 ? <Empty /> : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={a.rentPorCategoria} margin={{ left: 0, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" vertical={false} />
                <XAxis dataKey="categoria" tick={{ fontSize: 10, fill: '#7c7f8a' }} />
                <YAxis tick={{ fontSize: 11, fill: '#7c7f8a' }} tickFormatter={(v) => (Math.abs(v) >= 1000 ? `${v / 1000}k` : v)} width={44} />
                <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} formatter={(v) => money(v)} />
                <Bar dataKey="utilidad" name="Utilidad" fill="#8a6d1a" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      {/* Tablas de ranking */}
      <div className="grid lg:grid-cols-2 gap-5">
        <RankTable title="Mayor margen porcentual" rows={a.mayorMargen} value={(r) => fmtPct(r.margen)} positive />
        <RankTable title="Menor rentabilidad" rows={a.menorRentabilidad} value={(r) => money(r.utilidad)} />
      </div>
    </div>
  )
}

function QuickRange({ label, onClick }) {
  return <button onClick={onClick} className="text-xs font-semibold px-3 py-1.5 rounded-full bg-ink-100 text-ink-600 hover:bg-gold-100 hover:text-gold-800 transition-colors">{label}</button>
}

function Empty() {
  return <div className="h-[200px] flex items-center justify-center text-sm text-ink-300">Sin datos en este período</div>
}

function RankTable({ title, rows, value, positive }) {
  return (
    <Card>
      <h3 className="font-bold text-ink-800 mb-3">{title}</h3>
      {rows.length === 0 ? <Empty /> : (
        <div className="divide-y divide-ink-50">
          {rows.map((r, i) => (
            <div key={i} className="flex items-center justify-between py-2.5">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs font-mono text-ink-300 w-5">{i + 1}</span>
                <div className="min-w-0">
                  <p className="font-medium text-ink-800 truncate">{r.nombre}</p>
                  <p className="text-xs text-ink-400">{r.codigo} · {r.cantidad} vendido(s)</p>
                </div>
              </div>
              <span className={`font-bold text-sm shrink-0 ${positive ? 'text-emerald-600' : r.utilidad >= 0 ? 'text-ink-800' : 'text-red-600'}`}>{value(r)}</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}
