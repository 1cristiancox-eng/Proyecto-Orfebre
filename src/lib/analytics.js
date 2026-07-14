import { buildContext, productCost, computeOverheadAllocation, inventoryValue, finishedProductsValue } from './calc.js'
import { monthOf } from './format.js'

// Filtra por rango de fechas [from, to] (ISO YYYY-MM-DD). Vacío = sin límite.
function inRange(fecha, from, to) {
  if (!fecha) return false
  if (from && fecha < from) return false
  if (to && fecha > to) return false
  return true
}

// Analítica completa para dashboard y reportes.
export function computeAnalytics({ products = [], sales = [], expenses = [], overhead = [], materials = [], settings, from = '', to = '', canal = '', categoria = '' }) {
  const { costByProduct } = buildContext({ products, overhead, sales, settings })
  const { alloc } = computeOverheadAllocation(products, overhead, settings)
  const productById = Object.fromEntries(products.map((p) => [p.id, p]))

  // Ventas filtradas
  const ventas = sales
    .filter((s) => inRange(s.fecha, from, to))
    .filter((s) => (!canal || s.canal === canal))
    .filter((s) => {
      if (!categoria) return true
      const p = productById[s.productId]
      return p && p.categoria === categoria
    })

  // Gastos filtrados (compras)
  const gastos = expenses.filter((e) => inRange(e.fecha, from, to)).filter((e) => !categoria || e.categoria === categoria)
  // Gastos generales dentro del rango (por mes)
  const fromMes = from ? from.slice(0, 7) : ''
  const toMes = to ? to.slice(0, 7) : ''
  const generales = overhead.filter((o) => (!fromMes || o.mes >= fromMes) && (!toMes || o.mes <= toMes))

  // --- Métricas de ventas ---
  let ventasTotales = 0, ingresoNetoTotal = 0, costoVendidos = 0, costoVendidosSinOH = 0, utilidadNeta = 0, sumMargen = 0
  const perProduct = {}
  for (const s of ventas) {
    const p = productById[s.productId]
    const cost = costByProduct[s.productId] || { costoTotal: 0, costoMateriales: 0, manoObra: 0, gastosAdicionales: 0, overhead: 0 }
    const precio = Number(s.precioVenta) || 0
    const neto = precio - (Number(s.descuento) || 0) - (Number(s.comision) || 0) - (Number(s.costoEnvio) || 0) - (Number(s.otrosGastos) || 0)
    const costoSinOH = cost.costoMateriales + cost.manoObra + cost.gastosAdicionales
    const util = neto - cost.costoTotal
    const margen = neto !== 0 ? (util / neto) * 100 : 0
    ventasTotales += precio
    ingresoNetoTotal += neto
    costoVendidos += cost.costoTotal
    costoVendidosSinOH += costoSinOH
    utilidadNeta += util
    sumMargen += margen

    const key = s.productId
    if (!perProduct[key]) perProduct[key] = { product: p, cantidad: 0, ingreso: 0, utilidad: 0, horas: 0, margenSum: 0, ventas: 0 }
    perProduct[key].cantidad += 1
    perProduct[key].ventas += 1
    perProduct[key].ingreso += neto
    perProduct[key].utilidad += util
    perProduct[key].horas += p ? Number(p.horas) || 0 : 0
    perProduct[key].margenSum += margen
  }
  const utilidadBruta = ingresoNetoTotal - costoVendidosSinOH
  const margenPromedio = ventas.length ? sumMargen / ventas.length : 0

  const gastosCompras = gastos.reduce((s, e) => s + (Number(e.monto) || 0), 0)
  const gastosGenerales = generales.reduce((s, o) => s + (Number(o.monto) || 0), 0)
  const gastosTotales = gastosCompras + gastosGenerales

  // --- Series mensuales ---
  const mesesSet = new Set()
  ventas.forEach((s) => mesesSet.add(monthOf(s.fecha)))
  gastos.forEach((e) => mesesSet.add(monthOf(e.fecha)))
  generales.forEach((o) => mesesSet.add(o.mes))
  const meses = [...mesesSet].filter(Boolean).sort()
  const serieMensual = meses.map((mes) => {
    const ing = ventas.filter((s) => monthOf(s.fecha) === mes).reduce((a, s) => {
      const neto = (Number(s.precioVenta) || 0) - (Number(s.descuento) || 0) - (Number(s.comision) || 0) - (Number(s.costoEnvio) || 0) - (Number(s.otrosGastos) || 0)
      return a + neto
    }, 0)
    const gas = gastos.filter((e) => monthOf(e.fecha) === mes).reduce((a, e) => a + (Number(e.monto) || 0), 0)
      + generales.filter((o) => o.mes === mes).reduce((a, o) => a + (Number(o.monto) || 0), 0)
    return { mes, ingresos: Math.round(ing), gastos: Math.round(gas), utilidad: Math.round(ing - gas) }
  })

  // --- Rankings por producto ---
  const productos = Object.values(perProduct).map((r) => ({
    ...r,
    margen: r.ventas ? r.margenSum / r.ventas : 0,
    rentHora: r.horas > 0 ? r.utilidad / r.horas : 0,
    nombre: r.product ? r.product.nombre : 'Producto eliminado',
    codigo: r.product ? r.product.codigo : '—',
    categoria: r.product ? r.product.categoria : '—',
  }))
  const masVendidos = [...productos].sort((a, b) => b.cantidad - a.cantidad).slice(0, 8)
  const mayorUtilidad = [...productos].sort((a, b) => b.utilidad - a.utilidad).slice(0, 8)
  const mayorMargen = [...productos].sort((a, b) => b.margen - a.margen).slice(0, 8)
  const menorRentabilidad = [...productos].sort((a, b) => a.utilidad - b.utilidad).slice(0, 8)

  // --- Rentabilidad por categoría de producto ---
  const catMap = {}
  for (const r of productos) {
    const c = r.categoria
    if (!catMap[c]) catMap[c] = { categoria: c, ingreso: 0, utilidad: 0, cantidad: 0, horas: 0 }
    catMap[c].ingreso += r.ingreso
    catMap[c].utilidad += r.utilidad
    catMap[c].cantidad += r.cantidad
    catMap[c].horas += r.horas
  }
  const rentPorCategoria = Object.values(catMap).map((c) => ({ ...c, margen: c.ingreso ? (c.utilidad / c.ingreso) * 100 : 0 })).sort((a, b) => b.utilidad - a.utilidad)

  // Rentabilidad por hora global
  const totalHorasVendidas = productos.reduce((s, r) => s + r.horas, 0)
  const rentPorHoraGlobal = totalHorasVendidas > 0 ? utilidadNeta / totalHorasVendidas : 0

  // --- Distribución de gastos por categoría ---
  const gastoCatMap = {}
  for (const e of gastos) gastoCatMap[e.categoria] = (gastoCatMap[e.categoria] || 0) + (Number(e.monto) || 0)
  for (const o of generales) gastoCatMap[o.categoria] = (gastoCatMap[o.categoria] || 0) + (Number(o.monto) || 0)
  const distribucionGastos = Object.entries(gastoCatMap).map(([categoria, monto]) => ({ categoria, monto })).sort((a, b) => b.monto - a.monto)

  // --- Inventario ---
  const valorMateriales = inventoryValue(materials)
  const valorProductos = finishedProductsValue(products, costByProduct)
  const bajoStock = materials.filter((m) => (m.stock || 0) <= (m.stockMinimo || 0))

  // Horas trabajadas totales (de todos los productos en rango por fecha de inicio)
  const horasTrabajadas = products
    .filter((p) => inRange(p.fechaInicio, from, to) || !from)
    .reduce((s, p) => s + (Number(p.horas) || 0), 0)

  return {
    ventasCount: ventas.length,
    ventasTotales, ingresoNetoTotal, costoVendidos, utilidadBruta, utilidadNeta, margenPromedio,
    gastosCompras, gastosGenerales, gastosTotales,
    serieMensual, masVendidos, mayorUtilidad, mayorMargen, menorRentabilidad,
    rentPorCategoria, rentPorHoraGlobal, distribucionGastos,
    valorMateriales, valorProductos, bajoStock, horasTrabajadas,
    productos, costByProduct, alloc,
  }
}
