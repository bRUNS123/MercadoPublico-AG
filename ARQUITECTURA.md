# 🏗️ Arquitectura de LicitaBoard — guía de referencia

Resumen de cómo está armada esta web, pensado como plantilla de referencia para
construir otro dashboard con estructura similar (consume una API pública, cachea,
filtra/clasifica datos y permite colaboración entre varios usuarios sin backend propio).

## 1. Stack

| Capa | Tecnología | Por qué |
|---|---|---|
| UI | React 19 + Vite | SPA rápida, sin SSR, build estático |
| Routing | React Router 7 (`HashRouter`) | Necesario porque se publica en GitHub Pages (sin servidor que reescriba rutas) |
| Gráficos | Chart.js + react-chartjs-2 | KPIs y distribuciones |
| Estilos | CSS plano (`index.css`) con variables/design tokens, dark mode | Sin dependencia de un framework de UI |
| Persistencia colaborativa | Firestore (opcional) con fallback a `localStorage` | Permite favoritos/votos compartidos entre colegas sin backend propio |
| Deploy | `gh-pages` (rama `gh-pages`) | Hosting gratuito, build estático |

## 2. Estructura de carpetas

```
src/
├── api/                 # Clientes de APIs externas (fetch + cache + rate limit)
├── hooks/               # Lógica de datos/estado reutilizable (data fetching, voto, filtros)
├── pages/               # Una página por ruta (orquestan hooks + componentes)
├── components/
│   ├── Layout/          # Sidebar, Header, shell de la app
│   ├── Dashboard/        # Widgets de KPIs/gráficos
│   ├── Licitaciones/     # Tablas, filtros, modal de detalle (genérico, reutilizado por 2 secciones)
│   └── Common/           # Componentes pequeños reutilizables (Loader, Badge)
└── utils/               # Constantes, formatters, adapters (normalización de datos)
```

**Idea clave**: cada "fuente de datos" (Licitaciones, Compra Ágil) tiene su propio
cliente en `api/`, su propio hook en `hooks/`, y un *adapter* en `utils/` que normaliza
la respuesta cruda al mismo "shape" interno (`Licitacion`), para que los componentes de
tabla/detalle/filtros sean **compartidos** entre ambas fuentes.

## 3. Flujo de datos (patrón por sección)

```
api/xxx.js  →  hooks/useXxx.js  →  pages/XxxPage.jsx  →  components/.../Table + Detail
   ↑                                      ↓
 cache + rate limit              utils/xxxAdapter.js (normaliza al shape común)
```

- **`api/*.js`**: clase con `fetch()`, cache en `localStorage` con TTL (ej. 5 min),
  contador de requests/día para no exceder cuotas de la API externa, paginación
  automática (`_fetchAllPages`).
- **`hooks/use*.js`**: expone `{ data, loading, error, refresh }`. Decide *cuándo* y
  *cómo* pedir datos (debounce de filtros, etc.). **Aquí también vive el branching
  DEV/PROD** cuando una API bloquea producción (ver punto 5).
- **`utils/*Adapter.js`**: convierte la respuesta cruda de cada API al shape común
  (`Licitacion`), guardando el original en `_raw` y un flag de origen (`_esCompraAgil`)
  para que la UI pueda diferenciar cuando sea necesario (ej. distinto link "ver
  original").
- **`pages/*.jsx`**: arman filtros, paginación visual y pasan los datos a los
  componentes de tabla/detalle compartidos.

## 4. Colaboración sin backend propio (`api/firebase.js`)

Patrón "interfaz única con fallback":

- Si hay credenciales de Firebase configuradas → usa Firestore (`onSnapshot` para
  tiempo real + `persistentLocalCache` para offline).
- Si no → usa `localStorage` + evento `storage` para simular el mismo API
  (`subscribeToVotes`, `setVotes`, `replaceVotes`, `deleteVoteKey`).
- Los hooks (`useFavoritos`, `useDescartados`, `useCategoryVotes`, `useSeguimiento`)
  consumen siempre esta interfaz, sin saber si hay Firebase o no.
- `roomId` (parámetro `?sala=` en la URL) particiona los datos → varias
  personas pueden compartir o no la misma "sala" de favoritos.

Ventaja: **cero código de backend**, pero con opción de tiempo real entre colegas si se
configura un proyecto Firebase gratuito (capa Spark).

## 5. Cuando una API externa bloquea producción: snapshot estático

Caso real: `api2.mercadopublico.cl` (Compra Ágil) no manda cabeceras CORS y su WAF
devuelve 403 a IPs no chilenas — bloquea cualquier proxy serverless gratuito.

**Solución aplicada** (reutilizable para cualquier API con la misma limitación):

1. **DEV**: el hook llama la API en vivo a través del proxy de Vite (`vite.config.js`
   → `server.proxy`), que sale con la IP real del equipo de desarrollo.
2. **PROD**: un script Node standalone (`scripts/fetch-*.js`) corre *fuera* de la app,
   desde un equipo con la IP "permitida", y genera un JSON estático
   (`public/data/*.json` con `{ fetchedAt, items }`). El hook, en `import.meta.env.DEV
   === false`, hace `fetch()` de ese JSON en vez de llamar la API.
3. Ese JSON **no se versiona en `master`** (está en `.gitignore`) — se genera y se
   publica junto al build en la rama `gh-pages` via `npm run deploy:snapshot`
   (`snapshot:compra-agil && deploy`).
4. Se programa con el Programador de tareas de Windows (`schtasks`) en el equipo con
   la IP correcta, corriendo unas pocas veces al día.
5. La UI muestra un banner informando la fecha de última actualización (`fetchedAt`)
   para que quede claro que los datos no son en vivo.

## 6. Convenciones generales

- **Variables de entorno** (`.env`, `.env.local`, no versionados): tickets/API keys,
  `VITE_*` para que Vite las expone al cliente.
- **`base: '/repo-name/'`** en `vite.config.js` + `HashRouter` → requisito para que
  GitHub Pages sirva una SPA con rutas funcionando.
- **Naming en español** para dominio (Licitacion, Compra Ágil, etc.), código en inglés
  para utilidades genéricas (formatters, adapters).
- **Componentes de tabla/detalle/filtros genéricos**, alimentados por datos ya
  normalizados — evita duplicar UI por cada fuente de datos.

---

Para replicar esta estructura en otro proyecto: empezar por el adapter + shape común,
luego el cliente API con cache/rate-limit, el hook con el branching DEV/PROD si aplica,
y reutilizar Layout/Common tal cual.
