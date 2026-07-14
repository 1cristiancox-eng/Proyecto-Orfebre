import Dexie from 'dexie'

// ---------------------------------------------------------------------------
// Base de datos local (IndexedDB) mediante Dexie.
// Todo se guarda en el dispositivo: funciona offline y es instalable como PWA.
// ---------------------------------------------------------------------------

export const db = new Dexie('orfebreDB')

db.version(1).stores({
  // Materiales / insumos del inventario
  materials: '++id, nombre, categoria, unidad',
  // Gastos (compras de materiales, insumos, servicios, etc.)
  expenses: '++id, fecha, categoria, tipo, proveedor, productId, materialId, esDirecto',
  // Productos fabricados
  products: '++id, codigo, nombre, categoria, estado, fechaInicio, fechaTermino',
  // Ventas
  sales: '++id, fecha, productId, canal, medioPago, cliente',
  // Gastos generales mensuales del taller (arriendo, luz, internet, etc.)
  overhead: '++id, mes, categoria, concepto',
  // Configuración (un único registro con id=1)
  settings: 'id',
})

// ---------------------------------------------------------------------------
// Catálogos
// ---------------------------------------------------------------------------

export const CATEGORIAS_GASTO = [
  'Plata',
  'Oro',
  'Otros metales',
  'Piedras y accesorios',
  'Insumos de fabricación',
  'Embalaje',
  'Herramientas',
  'Gastos de taller',
  'Transporte',
  'Marketing',
  'Comisiones por venta',
  'Otros gastos',
]

export const TIPOS_ITEM = ['Material', 'Insumo', 'Herramienta', 'Servicio']

export const UNIDADES = ['g', 'kg', 'unidad', 'par', 'cm', 'm', 'ml', 'litro', 'set']

export const CATEGORIAS_PRODUCTO = [
  'Anillo',
  'Pulsera',
  'Collar',
  'Aros',
  'Colgante',
  'Cadena',
  'Broche',
  'Set',
  'Otro',
]

export const ESTADOS_PRODUCTO = [
  'En fabricación',
  'Terminado',
  'Disponible',
  'Reservado',
  'Vendido',
]

export const MEDIOS_PAGO = ['Efectivo', 'Transferencia', 'Débito', 'Crédito', 'MercadoPago', 'WebPay', 'Otro']

export const CANALES_VENTA = ['Local/Taller', 'Instagram', 'Feria', 'WhatsApp', 'Tienda online', 'Marketplace', 'Otro']

// Métodos de prorrateo de gastos generales
export const METODOS_PRORRATEO = [
  { id: 'horas', label: 'Por horas trabajadas' },
  { id: 'cantidad', label: 'Por cantidad de productos' },
  { id: 'materiales', label: 'Por costo de materiales' },
  { id: 'porcentaje', label: 'Porcentaje fijo sobre costo directo' },
  { id: 'manual', label: 'Distribución manual (usar gastos adicionales)' },
]

export const DEFAULT_SETTINGS = {
  id: 1,
  valorHora: 8000, // CLP por hora de trabajo
  metodoProrrateo: 'horas',
  porcentajeProrrateo: 15, // usado cuando metodo = 'porcentaje'
  nombreNegocio: 'Mi Taller de Orfebrería',
  moneda: 'CLP',
}

// ---------------------------------------------------------------------------
// Configuración
// ---------------------------------------------------------------------------

export async function getSettings() {
  let s = await db.settings.get(1)
  if (!s) {
    await db.settings.put(DEFAULT_SETTINGS)
    s = DEFAULT_SETTINGS
  }
  return { ...DEFAULT_SETTINGS, ...s }
}

export async function saveSettings(patch) {
  const current = await getSettings()
  await db.settings.put({ ...current, ...patch, id: 1 })
}

// ---------------------------------------------------------------------------
// Inventario: movimientos automáticos de stock y costo promedio ponderado
// ---------------------------------------------------------------------------

// Registra una compra: aumenta stock y recalcula costo promedio ponderado.
export async function comprarMaterial(materialId, cantidad, costoTotal) {
  if (!materialId || !cantidad) return
  const m = await db.materials.get(materialId)
  if (!m) return
  const stockPrevio = m.stock || 0
  const valorPrevio = stockPrevio * (m.costoPromedio || 0)
  const nuevoStock = stockPrevio + cantidad
  const nuevoValor = valorPrevio + (costoTotal || 0)
  await db.materials.update(materialId, {
    stock: nuevoStock,
    comprado: (m.comprado || 0) + cantidad,
    costoPromedio: nuevoStock > 0 ? nuevoValor / nuevoStock : m.costoPromedio || 0,
  })
}

// Consume material del inventario (fabricación). Devuelve el costo consumido.
export async function consumirMaterial(materialId, cantidad) {
  const m = await db.materials.get(materialId)
  if (!m) return 0
  const costo = (m.costoPromedio || 0) * cantidad
  await db.materials.update(materialId, {
    stock: Math.max(0, (m.stock || 0) - cantidad),
    utilizado: (m.utilizado || 0) + cantidad,
  })
  return costo
}

// Devuelve material al inventario (al editar/eliminar un producto).
export async function devolverMaterial(materialId, cantidad) {
  const m = await db.materials.get(materialId)
  if (!m) return
  await db.materials.update(materialId, {
    stock: (m.stock || 0) + cantidad,
    utilizado: Math.max(0, (m.utilizado || 0) - cantidad),
  })
}

// ---------------------------------------------------------------------------
// Gastos: al crear un gasto de tipo material asociado a un material del
// inventario, se registra la compra automáticamente.
// ---------------------------------------------------------------------------

export async function addExpense(expense) {
  const id = await db.expenses.add(expense)
  if (expense.materialId && expense.cantidad) {
    await comprarMaterial(expense.materialId, Number(expense.cantidad), Number(expense.monto) || 0)
  }
  return id
}

export async function deleteExpense(id) {
  const e = await db.expenses.get(id)
  if (e?.materialId && e?.cantidad) {
    // Revertir la compra del inventario
    const m = await db.materials.get(e.materialId)
    if (m) {
      const nuevoStock = Math.max(0, (m.stock || 0) - Number(e.cantidad))
      await db.materials.update(e.materialId, {
        stock: nuevoStock,
        comprado: Math.max(0, (m.comprado || 0) - Number(e.cantidad)),
      })
    }
  }
  await db.expenses.delete(id)
}

// ---------------------------------------------------------------------------
// Productos: guardar aplicando el consumo de inventario correspondiente
// ---------------------------------------------------------------------------

// Aplica la diferencia de consumo entre el estado anterior y el nuevo.
export async function saveProduct(product, prevMateriales = []) {
  // Devolver lo previamente consumido
  for (const pm of prevMateriales) {
    if (pm.materialId) await devolverMaterial(pm.materialId, Number(pm.cantidad) || 0)
  }
  // Consumir lo nuevo y calcular costo real de materiales según costo promedio
  let costoMateriales = 0
  const materiales = []
  for (const m of product.materiales || []) {
    if (m.materialId) {
      const costo = await consumirMaterial(m.materialId, Number(m.cantidad) || 0)
      costoMateriales += costo
      materiales.push({ ...m, costo })
    } else {
      // Material libre (no del inventario): usa costo unitario ingresado
      const costo = (Number(m.cantidad) || 0) * (Number(m.costoUnit) || 0)
      costoMateriales += costo
      materiales.push({ ...m, costo })
    }
  }
  const toSave = { ...product, materiales, costoMateriales }
  if (product.id) {
    await db.products.update(product.id, toSave)
    return product.id
  }
  return await db.products.add(toSave)
}

export async function deleteProduct(id) {
  const p = await db.products.get(id)
  if (p?.materiales) {
    for (const m of p.materiales) {
      if (m.materialId) await devolverMaterial(m.materialId, Number(m.cantidad) || 0)
    }
  }
  // Eliminar ventas asociadas
  const ventas = await db.sales.where('productId').equals(id).toArray()
  for (const v of ventas) await db.sales.delete(v.id)
  await db.products.delete(id)
}

// ---------------------------------------------------------------------------
// Ventas
// ---------------------------------------------------------------------------

export async function addSale(sale) {
  const id = await db.sales.add(sale)
  if (sale.productId) {
    await db.products.update(sale.productId, { estado: 'Vendido' })
  }
  return id
}

export async function deleteSale(id) {
  const s = await db.sales.get(id)
  if (s?.productId) {
    const p = await db.products.get(s.productId)
    if (p && p.estado === 'Vendido') {
      await db.products.update(s.productId, { estado: 'Disponible' })
    }
  }
  await db.sales.delete(id)
}

// ---------------------------------------------------------------------------
// Datos de ejemplo (solo si la base está vacía)
// ---------------------------------------------------------------------------

export async function ensureSeed() {
  const count = await db.products.count()
  const mCount = await db.materials.count()
  await getSettings()
  if (count > 0 || mCount > 0) return

  try {
    // Materiales
    const plataId = await db.materials.add({
      nombre: 'Plata 950',
      categoria: 'Plata',
      unidad: 'g',
      stock: 0,
      stockMinimo: 50,
      costoPromedio: 0,
      comprado: 0,
      utilizado: 0,
    })
    const piedraId = await db.materials.add({
      nombre: 'Piedra turquesa',
      categoria: 'Piedras y accesorios',
      unidad: 'unidad',
      stock: 0,
      stockMinimo: 5,
      costoPromedio: 0,
      comprado: 0,
      utilizado: 0,
    })
    const cierreId = await db.materials.add({
      nombre: 'Cierre mosquetón plata',
      categoria: 'Insumos de fabricación',
      unidad: 'unidad',
      stock: 0,
      stockMinimo: 10,
      costoPromedio: 0,
      comprado: 0,
      utilizado: 0,
    })

    // Compras (gastos) -> alimentan inventario
    await addExpense({
      fecha: '2026-06-02',
      monto: 90000,
      categoria: 'Plata',
      tipo: 'Material',
      proveedor: 'Metales del Sur',
      productId: null,
      materialId: plataId,
      cantidad: 100,
      unidad: 'g',
      esDirecto: false,
      observaciones: 'Lámina y alambre de plata',
    })
    await addExpense({
      fecha: '2026-06-05',
      monto: 24000,
      categoria: 'Piedras y accesorios',
      tipo: 'Material',
      proveedor: 'Piedras Andinas',
      productId: null,
      materialId: piedraId,
      cantidad: 12,
      unidad: 'unidad',
      esDirecto: false,
      observaciones: 'Turquesas pequeñas',
    })
    await addExpense({
      fecha: '2026-06-05',
      monto: 15000,
      categoria: 'Insumos de fabricación',
      tipo: 'Insumo',
      proveedor: 'Piedras Andinas',
      productId: null,
      materialId: cierreId,
      cantidad: 15,
      unidad: 'unidad',
      esDirecto: false,
      observaciones: '',
    })

    // Gastos generales del taller (junio)
    await db.overhead.bulkAdd([
      { mes: '2026-06', categoria: 'Gastos de taller', concepto: 'Arriendo taller', monto: 120000 },
      { mes: '2026-06', categoria: 'Gastos de taller', concepto: 'Electricidad', monto: 28000 },
      { mes: '2026-06', categoria: 'Gastos de taller', concepto: 'Internet', monto: 22000 },
      { mes: '2026-06', categoria: 'Marketing', concepto: 'Publicidad Instagram', monto: 20000 },
    ])

    // Productos
    const anilloId = await saveProduct({
      codigo: 'AN-001',
      nombre: 'Anillo turquesa',
      categoria: 'Anillo',
      descripcion: 'Anillo de plata 950 con piedra turquesa engastada.',
      fechaInicio: '2026-06-08',
      fechaTermino: '2026-06-10',
      estado: 'Vendido',
      horas: 4,
      gastosAdicionales: 2000,
      fotos: [],
      materiales: [
        { materialId: plataId, nombre: 'Plata 950', cantidad: 12, unidad: 'g' },
        { materialId: piedraId, nombre: 'Piedra turquesa', cantidad: 1, unidad: 'unidad' },
      ],
    })
    const pulseraId = await saveProduct({
      codigo: 'PU-001',
      nombre: 'Pulsera eslabones',
      categoria: 'Pulsera',
      descripcion: 'Pulsera de plata con cierre mosquetón.',
      fechaInicio: '2026-06-12',
      fechaTermino: '2026-06-15',
      estado: 'Disponible',
      horas: 6,
      gastosAdicionales: 1500,
      fotos: [],
      materiales: [
        { materialId: plataId, nombre: 'Plata 950', cantidad: 20, unidad: 'g' },
        { materialId: cierreId, nombre: 'Cierre mosquetón plata', cantidad: 1, unidad: 'unidad' },
      ],
    })
    await saveProduct({
      codigo: 'AR-001',
      nombre: 'Aros gota',
      categoria: 'Aros',
      descripcion: 'Aros colgantes en forma de gota.',
      fechaInicio: '2026-06-20',
      fechaTermino: '',
      estado: 'En fabricación',
      horas: 2,
      gastosAdicionales: 0,
      fotos: [],
      materiales: [{ materialId: plataId, nombre: 'Plata 950', cantidad: 8, unidad: 'g' }],
    })

    // Ventas
    await addSale({
      fecha: '2026-06-14',
      productId: anilloId,
      precioVenta: 38000,
      medioPago: 'Transferencia',
      canal: 'Instagram',
      cliente: 'María López',
      descuento: 0,
      comision: 0,
      costoEnvio: 0,
      otrosGastos: 0,
      observaciones: '',
    })
    // Marcar pulsera como disponible (no vendida aún)
    await db.products.update(pulseraId, { estado: 'Disponible' })
  } catch (err) {
    console.error('Error al cargar datos de ejemplo:', err)
  }
}

// Borra toda la base (para reiniciar desde configuración).
export async function resetDatabase() {
  await Promise.all([
    db.materials.clear(),
    db.expenses.clear(),
    db.products.clear(),
    db.sales.clear(),
    db.overhead.clear(),
  ])
}
