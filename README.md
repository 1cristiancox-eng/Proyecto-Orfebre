# 💎 Orfebre · Gestión del Taller

Aplicación **web instalable (PWA)** para gestionar de forma financiera y operativa un
negocio de **orfebrería artesanal**. Permite registrar y relacionar **gastos, productos
fabricados, ventas e inventario** para conocer la **rentabilidad real** del negocio y de
cada pieza.

Pensada para una persona **sin conocimientos contables**: formularios simples, listas
desplegables y **cálculos automáticos**. Funciona en **computador y celular**, y puede
**instalarse como app** desde el navegador.

---

## ✨ Características

| Módulo | Qué hace |
|---|---|
| **Panel de control** | KPIs (ventas, gastos, utilidad, margen, rentabilidad/hora), evolución mensual, top de productos, rentabilidad por categoría, distribución de gastos, valor de inventario. Gráficos de líneas, barras y torta + filtros por fecha, categoría y canal. |
| **Gastos** | Registro de compras con fecha, monto, categoría, tipo, proveedor, producto asociado, cantidad, unidad y observaciones. Diferencia gastos **directos** de un producto vs **generales**. |
| **Productos / Fabricación** | Ficha con materiales y cantidades, horas de trabajo, fotos, estado, y **costo total calculado automáticamente** (materiales + mano de obra + prorrateo de gastos generales + adicionales). |
| **Ventas** | Precio, medio de pago, canal, cliente, descuentos, comisiones, envío. Calcula **ingreso neto, utilidad, margen $ y %, y rentabilidad por hora**. |
| **Gastos generales** | Gastos fijos mensuales (arriendo, luz, internet, marketing…) con **5 métodos de prorrateo** configurables. |
| **Inventario** | Stock, costo promedio ponderado, stock mínimo y **alertas de reposición**. El stock se **actualiza solo** al comprar y al fabricar. |
| **Reportes** | Exportación a **Excel** (multi-hoja) y **PDF**: resumen mensual, ventas, gastos, rentabilidad por producto/categoría, horas, inventario y comparación entre meses. |

### Flujo de trabajo
**Comprar materiales** (Gastos → alimenta Inventario) → **Fabricar** (Productos → consume Inventario) → **Vender** (Ventas → calcula rentabilidad).

---

## 🚀 Uso

```bash
npm install        # instalar dependencias
npm run icons      # (opcional) regenerar iconos de la PWA
npm run dev        # desarrollo -> http://localhost:5173
npm run build      # build de producción en /dist
npm run preview    # previsualizar el build
```

### Instalar en el celular
1. Abre la app en el navegador del teléfono (Chrome/Safari).
2. Menú del navegador → **"Agregar a pantalla de inicio" / "Instalar app"**.
3. Se abre como una app independiente y **funciona offline**.

---

## 🗄️ Datos y privacidad

- Todos los datos se guardan **localmente en el dispositivo** (IndexedDB). No hay servidor
  ni cuentas: es privado y funciona sin conexión.
- En **Configuración** puedes **exportar / importar un respaldo** (JSON) y cargar datos de
  ejemplo.

---

## 🛠️ Tecnologías

- **React + Vite** · **Tailwind CSS**
- **Dexie (IndexedDB)** para persistencia local
- **Recharts** para gráficos
- **SheetJS (xlsx)** y **jsPDF** para reportes
- **vite-plugin-pwa** (instalable + offline)

## 📁 Estructura

```
src/
├── db.js               # Esquema Dexie, catálogos y lógica de negocio
├── hooks.js            # Hooks reactivos (useLiveQuery)
├── lib/
│   ├── calc.js         # Costos, prorrateo y métricas de rentabilidad
│   ├── analytics.js    # Agregados para dashboard y reportes
│   ├── format.js       # Formato de moneda/fecha (es-CL / CLP)
│   └── export.js       # Exportación Excel y PDF
├── components/         # Layout responsivo y componentes UI
└── pages/              # Dashboard, Gastos, Productos, Ventas, Inventario,
                        # GastosGenerales, Reportes, Configuración
```
