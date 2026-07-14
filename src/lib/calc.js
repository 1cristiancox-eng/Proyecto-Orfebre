// ---------------------------------------------------------------------------
// Motor de cálculo: costos de producto, prorrateo de gastos generales
// y métricas de rentabilidad de ventas.
// ---------------------------------------------------------------------------

// Calcula cuánto gasto general (overhead) le corresponde a cada producto
// según el método elegido. Devuelve un mapa { productId: montoAsignado }.
export function computeOverheadAllocation(products, overheadList, settings) {
  const totalOverhead = (overheadList || []).reduce((s, o) => s + (Number(o.monto) || 0), 0)
  const alloc = {}
  const metodo = settings?.metodoProrrateo || 'horas'
  const valorHora = Number(settings?.valorHora) || 0

  if (metodo === 'manual') {
    for (const p of products) alloc[p.id] = 0
    return { alloc, totalOverhead }
  }

  if (metodo === 'porcentaje') {
    const pct = Number(settings?.porcentajeProrrateo) || 0
    for (const p of products) {
      const directo = (Number(p.costoMateriales) || 0) + (Number(p.horas) || 0) * valorHora
      alloc[p.id] = (directo * pct) / 100
    }
    return { alloc, totalOverhead }
  }

  // Métodos que reparten el pool total según un "driver"
  let totalDriver = 0
  const driver = {}
  for (const p of products) {
    let d = 0
    if (metodo === 'horas') d = Number(p.horas) || 0
    else if (metodo === 'cantidad') d = 1
    else if (metodo === 'materiales') d = Number(p.costoMateriales) || 0
    driver[p.id] = d
    totalDriver += d
  }
  for (const p of products) {
    alloc[p.id] = totalDriver > 0 ? (totalOverhead * driver[p.id]) / totalDriver : 0
  }
  return { alloc, totalOverhead }
}

// Desglose de costo de un producto.
export function productCost(p, settings, allocOverhead = 0) {
  const valorHora = Number(settings?.valorHora) || 0
  const costoMateriales = Number(p.costoMateriales) || 0
  const horas = Number(p.horas) || 0
  const manoObra = horas * valorHora
  const gastosAdicionales = Number(p.gastosAdicionales) || 0
  const overhead = Number(allocOverhead) || 0
  const costoTotal = costoMateriales + manoObra + gastosAdicionales + overhead
  return { costoMateriales, manoObra, horas, gastosAdicionales, overhead, costoTotal }
}

// Métricas de una venta respecto al producto vendido.
export function saleMetrics(sale, product, cost) {
  const precioVenta = Number(sale.precioVenta) || 0
  const descuento = Number(sale.descuento) || 0
  const comision = Number(sale.comision) || 0
  const costoEnvio = Number(sale.costoEnvio) || 0
  const otrosGastos = Number(sale.otrosGastos) || 0

  const ingresoNeto = precioVenta - descuento - comision - costoEnvio - otrosGastos
  const costoProducto = cost ? cost.costoTotal : 0
  const utilidad = ingresoNeto - costoProducto
  const base = ingresoNeto !== 0 ? ingresoNeto : precioVenta
  const margenPorc = base !== 0 ? (utilidad / base) * 100 : 0
  const horas = product ? Number(product.horas) || 0 : 0
  const rentabilidadHora = horas > 0 ? utilidad / horas : 0

  return {
    precioVenta,
    descuento,
    comision,
    costoEnvio,
    otrosGastos,
    ingresoNeto,
    costoProducto,
    utilidad,
    margenPesos: utilidad,
    margenPorc,
    rentabilidadHora,
  }
}

// Construye un contexto de cálculo reutilizable a partir de todos los datos.
// Devuelve helpers y mapas ya calculados.
export function buildContext({ products = [], overhead = [], sales = [], settings }) {
  const { alloc } = computeOverheadAllocation(products, overhead, settings)
  const costByProduct = {}
  for (const p of products) {
    costByProduct[p.id] = productCost(p, settings, alloc[p.id] || 0)
  }
  const productById = {}
  for (const p of products) productById[p.id] = p

  const saleRows = sales.map((s) => {
    const product = productById[s.productId]
    const cost = costByProduct[s.productId]
    return { sale: s, product, cost, metrics: saleMetrics(s, product, cost) }
  })

  return { alloc, costByProduct, productById, saleRows }
}

// Valor de inventario disponible (materiales en stock a costo promedio).
export function inventoryValue(materials) {
  return (materials || []).reduce((s, m) => s + (Number(m.stock) || 0) * (Number(m.costoPromedio) || 0), 0)
}

// Valor del inventario de productos terminados (disponibles/reservados).
export function finishedProductsValue(products, costByProduct) {
  return (products || [])
    .filter((p) => ['Terminado', 'Disponible', 'Reservado'].includes(p.estado))
    .reduce((s, p) => s + (costByProduct[p.id]?.costoTotal || 0), 0)
}
