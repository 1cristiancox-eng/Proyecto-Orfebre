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

## ☁️ Publicar en internet (para usar desde el celular)

El repositorio ya incluye la configuración lista (`netlify.toml` y `vercel.json`),
así que el despliegue es prácticamente de **un clic**. Elige una:

### Netlify
1. Entra a [app.netlify.com](https://app.netlify.com) y crea una cuenta gratis.
2. **Add new site → Import an existing project** → conecta GitHub y elige el repo
   `proyecto-orfebre`.
3. En la rama, selecciona `claude/jewelry-business-app-4cn1gv`.
4. Netlify leerá `netlify.toml` solo (build `npm run build`, publish `dist`). Pulsa
   **Deploy**.
5. Te dará una URL pública, ej. `https://tu-orfebre.netlify.app`.

### Vercel
1. Entra a [vercel.com](https://vercel.com) y crea una cuenta gratis.
2. **Add New → Project** → importa el repo `proyecto-orfebre`.
3. Elige la rama `claude/jewelry-business-app-4cn1gv`. Vercel detecta Vite y usa
   `vercel.json` automáticamente. Pulsa **Deploy**.
4. Te dará una URL pública, ej. `https://tu-orfebre.vercel.app`.

> Luego abre esa URL en el celular → menú del navegador → **"Instalar app"**.
> Cada vez que hagas cambios en la rama, el sitio se actualiza solo.

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
