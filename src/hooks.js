import { useLiveQuery } from 'dexie-react-hooks'
import { db, DEFAULT_SETTINGS } from './db.js'

// Solo lectura: nunca escribe dentro de la transacción reactiva (evita ReadOnlyError).
// La creación del registro de settings ocurre en ensureSeed/saveSettings.
export function useSettings() {
  return useLiveQuery(async () => {
    const s = await db.settings.get(1)
    return { ...DEFAULT_SETTINGS, ...(s || {}) }
  }, [], null)
}

export function useMaterials() {
  return useLiveQuery(() => db.materials.toArray(), [], [])
}

export function useExpenses() {
  return useLiveQuery(() => db.expenses.orderBy('fecha').reverse().toArray(), [], [])
}

export function useProducts() {
  return useLiveQuery(() => db.products.toArray(), [], [])
}

export function useSales() {
  return useLiveQuery(() => db.sales.orderBy('fecha').reverse().toArray(), [], [])
}

export function useOverhead() {
  return useLiveQuery(() => db.overhead.toArray(), [], [])
}

// Carga todo junto (para dashboard y reportes)
export function useAllData() {
  const settings = useSettings()
  const materials = useMaterials()
  const expenses = useExpenses()
  const products = useProducts()
  const sales = useSales()
  const overhead = useOverhead()
  const loading = !settings || !materials || !products || !sales || !overhead || !expenses
  return { settings, materials, expenses, products, sales, overhead, loading }
}
