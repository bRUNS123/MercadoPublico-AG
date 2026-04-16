# 🏗️ LicitaBoard — Dashboard de Licitaciones Chile

Dashboard web para visualizar, clasificar y filtrar licitaciones de [MercadoPúblico](https://www.mercadopublico.cl/) (ChileCompra), con foco en **construcción**, **ingeniería civil** y rubros relacionados.

![Dashboard](https://img.shields.io/badge/Status-Active-22c55e) ![API](https://img.shields.io/badge/API-MercadoPúblico-0ea5e9) ![Deploy](https://img.shields.io/badge/Deploy-GitHub%20Pages-8b5cf6)

## ✨ Características

- **Dashboard en tiempo real** con KPIs, gráficos de estado y tipo de licitación
- **Explorador de licitaciones** con filtros avanzados (estado, fecha, texto, código)
- **Categorías rápidas**: Construcción, Ingeniería Civil, Mantención, Consultoría, Suministros
- **Vista detallada** de cada licitación (organismo, items, fechas, montos)
- **Indicador de días restantes** con colores (urgente/pronto/ok)
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
│   └── mercadopublico.js    # Cliente API con cache y rate limiting
├── components/
│   ├── Layout/              # Sidebar, Header, Layout
│   ├── Dashboard/           # KPICards, StatusChart, TypeChart
│   ├── Licitaciones/        # FilterBar, Table, Detail modal
│   └── Common/              # StatusBadge, Loader
├── hooks/
│   └── useLicitaciones.js   # Hook de data fetching
├── pages/
│   ├── DashboardPage.jsx    # Vista principal
│   ├── LicitacionesPage.jsx # Explorador con filtros
│   └── SettingsPage.jsx     # Configuración del ticket
└── utils/
    ├── constants.js         # Estados, tipos, monedas, categorías
    └── formatters.js        # Formateo de fechas, montos, texto
```

## 🔗 API de MercadoPúblico

La aplicación consume la [API pública de MercadoPúblico](https://api.mercadopublico.cl/):

| Endpoint | Descripción |
|---|---|
| `licitaciones.json?estado=activas` | Licitaciones publicadas actualmente |
| `licitaciones.json?fecha=ddmmaaaa` | Licitaciones de una fecha específica |
| `licitaciones.json?codigo=XXXX` | Detalle de una licitación |

**Límites**: 10.000 solicitudes por día por ticket.

## 🚢 Deploy a GitHub Pages

```bash
npm run deploy
```

Esto construye el proyecto y lo publica en la rama `gh-pages`.

## 📝 Licencia

MIT — Bruno Franco Sentis
