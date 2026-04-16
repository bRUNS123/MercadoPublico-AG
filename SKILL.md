# Skill: MercadoPúblico Dashboard (LicitaBoard)

## Contexto del Proyecto
Dashboard web (Vite + React) para visualizar licitaciones de MercadoPúblico (ChileCompra).
- **Workspace**: `d:\PROGRAMACION\MercadoPublico-AG (API)`
- **Repo GitHub**: `https://github.com/bRUNS123/MercadoPublico-AG`
- **Usuario**: Bruno Franco Sentis (bRUNS123)
- **Foco**: Construcción, ingeniería civil, mantención

## API de Referencia
- **Base URL**: `https://api.mercadopublico.cl/servicios/v1/publico/`
- **Docs oficiales**: https://api.mercadopublico.cl
- **Guía PDF Licitaciones**: http://www.chilecompra.cl/wp-content/uploads/2026/03/Documentacion-API-Mercado-Publico-Licitaciones.pdf
- **Guía PDF Órdenes**: http://www.chilecompra.cl/wp-content/uploads/2026/03/Documentacion-API-Mercado-Publico-oc.pdf
- **Ticket**: Variable `VITE_API_TICKET` en `.env`
- **Límite**: 10.000 req/día por ticket
- **Horario masivo**: 22:00 - 07:00

## Endpoints Principales

### Licitaciones
```
GET /licitaciones.json?ticket={ticket}                          → Día actual
GET /licitaciones.json?estado=activas&ticket={ticket}           → Publicadas activas
GET /licitaciones.json?fecha={ddmmaaaa}&ticket={ticket}         → Por fecha
GET /licitaciones.json?codigo={codigo}&ticket={ticket}          → Por código (detalle completo)
GET /licitaciones.json?estado={estado}&ticket={ticket}          → Por estado
GET /licitaciones.json?fecha={f}&estado={e}&ticket={ticket}     → Fecha + estado
GET /licitaciones.json?fecha={f}&CodigoOrganismo={c}&ticket={t} → Por organismo
GET /licitaciones.json?fecha={f}&CodigoProveedor={c}&ticket={t} → Por proveedor
```

### Auxiliares
```
GET /Empresas/BuscarComprador?ticket={ticket}                        → Listar organismos
GET /Empresas/BuscarProveedor?rutempresaproveedor={rut}&ticket={t}   → Buscar proveedor
GET /ordenesdecompra.json?fecha={f}&ticket={ticket}                  → Órdenes de compra
```

## Estados de Licitaciones
| Código | Estado | Param API |
|--------|--------|-----------|
| 5 | Publicada | `publicada` |
| 6 | Cerrada | `cerrada` |
| 7 | Desierta | `desierta` |
| 8 | Adjudicada | `adjudicada` |
| 18 | Revocada | `revocada` |
| 19 | Suspendida | `suspendida` |
| - | Todas activas | `activas` |
| - | Todos los estados | `todos` |

## Tipos de Licitación
| Código | Tipo |
|--------|------|
| L1 | Licitación Pública < 100 UTM |
| LE | Licitación Pública 100–1000 UTM |
| LP | Licitación Pública > 1000 UTM |
| LS | Servicios personales especializados |
| CO | Lic. Privada 100–1000 UTM |
| B2 | Lic. Privada > 1000 UTM |
| D1 | Trato Directo (proveedor único) |
| C1 | Compra Directa (OC) |
| R1 | OC menor a 3 UTM |

## Monedas
CLP (Peso), CLF (UF), USD (Dólar), UTM, EUR (Euro)

## Formato Fecha API
`ddmmaaaa` → Ejemplo: `16042026` = 16 de abril de 2026

## Respuesta JSON
```json
{
  "Cantidad": int,
  "FechaCreacion": "datetime",
  "Version": "v1",
  "Listado": [
    {
      "CodigoExterno": "1234-5-LE26",
      "Nombre": "string",
      "CodigoEstado": 5,
      "Estado": "Publicada",
      "Descripcion": "string",
      "FechaCierre": "datetime",
      "FechaPublicacion": "datetime",
      "MontoEstimado": number,
      "Moneda": "CLP",
      "Tipo": "LE",
      "Comprador": {
        "NombreOrganismo": "string",
        "NombreUnidad": "string",
        "RutUnidad": "string",
        "RegionUnidad": "string",
        "ComunaUnidad": "string"
      },
      "Items": { "Listado": [...] }
    }
  ]
}
```

## Stack Tecnológico
- **Vite** + **React 19** (SPA)
- **Vanilla CSS** (dark mode, glassmorphism)
- **Chart.js** (react-chartjs-2)
- **React Router v7** (HashRouter para GitHub Pages)
- **Deploy**: GitHub Pages via `gh-pages`

## Estructura de Archivos Clave
```
src/api/mercadopublico.js    → Cliente API singleton con cache
src/utils/constants.js       → Todos los mapeos de estados/tipos/monedas
src/utils/formatters.js      → Formateo de fechas, montos, texto
src/hooks/useLicitaciones.js → Hook principal de data fetching
src/pages/DashboardPage.jsx  → Dashboard con KPIs y gráficos
src/pages/LicitacionesPage.jsx → Explorador con filtros
src/components/Licitaciones/FilterBar.jsx → Barra de filtros con categorías
```

## Convenciones
- API wrapper: classe `MercadoPublicoAPI` en `src/api/mercadopublico.js`
- Constantes centralizadas en `src/utils/constants.js`
- Custom hooks para data fetching (hooks/)
- CSS variables para theming (`:root` en `index.css`)
- HashRouter para compatibilidad con GitHub Pages
- Cache con localStorage (TTL configurable)
- Rate limiting local (10.000 req tracking)

## Categorías de Interés (filtros rápidos)
- **Construcción**: construcci, obra, edifici, paviment, demolici
- **Ingeniería Civil**: ingenier, estructur, cálculo, civil, topograf, geotecn
- **Mantención**: mantenci, mantenimi, reparaci, mejorami
- **Consultoría**: consultor, asesor, estudio, informe
- **Suministros**: suministr, material, insumo, herramient, equip
