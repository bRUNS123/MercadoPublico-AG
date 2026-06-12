# 🏗️ LicitaBoard — Dashboard de Licitaciones Chile

Dashboard web para visualizar, clasificar y filtrar licitaciones de [MercadoPúblico](https://www.mercadopublico.cl/) (ChileCompra), con foco en **construcción**, **ingeniería civil** y rubros relacionados.

![Dashboard](https://img.shields.io/badge/Status-Active-22c55e) ![API](https://img.shields.io/badge/API-MercadoPúblico-0ea5e9) ![Deploy](https://img.shields.io/badge/Deploy-GitHub%20Pages-8b5cf6)

## ✨ Características

- **Dashboard en tiempo real** con KPIs, gráficos de estado y tipo de licitación
- **Explorador de licitaciones** con filtros avanzados (estado, fecha, texto, código)
- **Categorías rápidas**: Construcción, Ingeniería Civil, Mantención, Consultoría, Suministros
- **Vista detallada** de cada licitación (organismo, items, fechas, montos)
- **Indicador de días restantes** con colores (urgente/pronto/ok)
- **Compras Ágiles**: explorador de oportunidades abiertas de Compra Ágil (API v2 Beta de ChileCompra)
- **Cache inteligente** para optimizar el uso de la API (límite 10.000 req/día)
- **Dark mode premium** con glassmorphism y animaciones suaves

## 🚀 Inicio Rápido

### 1. Clonar el repositorio
```bash
git clone https://github.com/bRUNS123/MercadoPublico-AG.git
cd MercadoPublico-AG
```

### 2. Instalar dependencias
```bash
npm install
```

### 3. Configurar el ticket de API
Crea un archivo `.env` en la raíz del proyecto:
```bash
VITE_API_TICKET=TU_TICKET_AQUI

# Opcional, para la sección "Compras Ágiles" (ver más abajo)
VITE_API_TICKET_COMPRA_AGIL=
```
> **¿No tienes ticket?** Solicítalo gratis en [api.mercadopublico.cl](https://api.mercadopublico.cl/modules/IniciarSesion.aspx) con tu ClaveÚnica.

### 4. Iniciar el servidor de desarrollo
```bash
npm run dev
```
Abre `http://localhost:5173/MercadoPublico-AG/` en tu navegador.

## 📦 Stack Tecnológico

| Tecnología | Uso |
|---|---|
| **Vite** | Build tool y dev server |
| **React 19** | UI framework |
| **React Router 7** | Navegación SPA |
| **Chart.js** | Gráficos (doughnut, bar) |
| **Vanilla CSS** | Estilos premium con design system |
| **GitHub Pages** | Deploy gratuito |

## 📁 Estructura del Proyecto

```
src/
├── api/
│   ├── mercadopublico.js    # Cliente API Licitaciones, con cache y rate limiting
│   └── compraAgil.js        # Cliente API Compra Ágil v2 (Beta)
├── components/
│   ├── Layout/              # Sidebar, Header, Layout
│   ├── Dashboard/           # KPICards, StatusChart, TypeChart
│   ├── Licitaciones/        # FilterBar(s), Table, Detail modal
│   └── Common/              # StatusBadge, Loader
├── hooks/
│   ├── useLicitaciones.js   # Hook de data fetching (Licitaciones)
│   └── useComprasAgiles.js  # Hook de data fetching (Compra Ágil)
├── pages/
│   ├── DashboardPage.jsx    # Vista principal
│   ├── LicitacionesPage.jsx # Explorador con filtros
│   ├── ComprasAgilesPage.jsx # Explorador de Compras Ágiles abiertas
│   └── SettingsPage.jsx     # Configuración de tickets
└── utils/
    ├── constants.js         # Estados, tipos, monedas, categorías, regiones
    ├── formatters.js         # Formateo de fechas, montos, texto
    └── compraAgilAdapter.js  # Adapta respuestas de Compra Ágil al formato de Licitación
```

## 🔗 API de MercadoPúblico

La aplicación consume la [API pública de MercadoPúblico](https://api.mercadopublico.cl/):

| Endpoint | Descripción |
|---|---|
| `licitaciones.json?estado=activas` | Licitaciones publicadas actualmente |
| `licitaciones.json?fecha=ddmmaaaa` | Licitaciones de una fecha específica |
| `licitaciones.json?codigo=XXXX` | Detalle de una licitación |

**Límites**: 10.000 solicitudes por día por ticket.

## ⚡ API Compra Ágil v2 (Beta)

La sección "Compras Ágiles" consume la nueva [API Compra Ágil v2 Beta](https://api2.mercadopublico.cl) de ChileCompra (lanzada en mayo 2026):

| Endpoint | Descripción |
|---|---|
| `/v2/compra-agil?estado=publicada` | Oportunidades de Compra Ágil actualmente abiertas |
| `/v2/compra-agil/{codigo}` | Detalle de una Compra Ágil |

**Ticket**: usa **el mismo ticket** de la API de Licitaciones (`VITE_API_TICKET`) — confirmado que funciona contra `api2.mercadopublico.cl`. Si ChileCompra te entrega un ticket distinto para Compra Ágil, puedes configurarlo aparte en `VITE_API_TICKET_COMPRA_AGIL` o desde **Configuración** en la app.

> **⚠️ Limitación conocida**: `api2.mercadopublico.cl` no envía cabeceras
> `Access-Control-Allow-Origin` y, además, su WAF responde `403 Forbidden` a peticiones que
> no provienen de IPs chilenas — esto bloquea por igual cualquier proxy serverless gratuito
> (Cloudflare Workers, Vercel, Netlify, etc.), ya que ninguno garantiza una IP residencial
> chilena.
>
> En **desarrollo local** (`npm run dev`) esto no es un problema: se usa el proxy de Vite
> `/api-ca` configurado en `vite.config.js`, que sale con la IP real del equipo.
>
> En la **versión publicada (GitHub Pages)** se muestra un snapshot estático en
> `public/data/compra-agil-publicada.json`, generado periódicamente desde un equipo con IP
> chilena (ver siguiente sección).

### 📡 Snapshot de Compra Ágil para producción

Como `api2.mercadopublico.cl` bloquea producción, los datos de la sección "Compras Ágiles"
en GitHub Pages provienen de un snapshot JSON estático (`public/data/compra-agil-publicada.json`,
con `{ fetchedAt, totalResultados, items }`) generado por `scripts/fetch-compra-agil-snapshot.js`
desde un equipo con IP chilena.

**Regenerar y publicar el snapshot manualmente**:

```bash
npm run deploy:snapshot
```

Esto descarga hasta 1000 oportunidades "publicada" (20 páginas de 50), las guarda en
`public/data/compra-agil-publicada.json` y ejecuta `npm run deploy` (build + publicación en
`gh-pages`). El archivo del snapshot **no se commitea en `master`** (está en `.gitignore`),
solo viaja en la rama `gh-pages`.

**Automatizar con el Programador de tareas de Windows** (ejecutar unas 4-10 veces al día
desde el equipo con IP chilena que actúa como servidor):

```cmd
schtasks /create /tn "LicitaBoard - Snapshot Compra Agil" /tr "\"D:\PROGRAMACION\MercadoPublico-AG (API)\scripts\update-compra-agil.cmd\"" /sc daily /st 08:00 /ri 120 /du 14:00 /f
```

Esto crea una tarea que corre cada 2 horas entre las 08:00 y las 22:00 (7 veces al día),
registrando el resultado en `scripts/update-compra-agil.log`.

## 🚢 Deploy a GitHub Pages

```bash
npm run deploy
```

Esto construye el proyecto y lo publica en la rama `gh-pages`.

## 📝 Licencia

MIT — Bruno Franco Sentis
