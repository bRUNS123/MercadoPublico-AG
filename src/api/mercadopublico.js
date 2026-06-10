import { API_BASE_URL } from '../utils/constants';

const TICKET = import.meta.env.VITE_API_TICKET || '';

/**
 * Wrapper para la API de MercadoPúblico
 */
class MercadoPublicoAPI {
  constructor() {
    this.baseUrl = API_BASE_URL;
    this.ticket = TICKET;
    this.requestCount = this._loadRequestCount();
  }

  // ─── Request counter (protección de 10.000/día) ───
  _loadRequestCount() {
    const stored = localStorage.getItem('mp_api_requests');
    if (stored) {
      const { date, count } = JSON.parse(stored);
      if (date === new Date().toISOString().split('T')[0]) return count;
    }
    return 0;
  }

  _incrementRequestCount() {
    this.requestCount++;
    localStorage.setItem('mp_api_requests', JSON.stringify({
      date: new Date().toISOString().split('T')[0],
      count: this.requestCount,
    }));
  }

  getRequestsToday() {
    return this.requestCount;
  }

  getRequestsRemaining() {
    return Math.max(0, 10000 - this.requestCount);
  }

  // ─── Cache ───
  _getCacheKey(url) {
    return `mp_cache_${btoa(url).slice(0, 60)}`;
  }

  _getCache(url, ttlMinutes = 5) {
    try {
      const key = this._getCacheKey(url);
      const stored = localStorage.getItem(key);
      if (!stored) return null;
      const { data, timestamp } = JSON.parse(stored);
      const age = (Date.now() - timestamp) / 1000 / 60;
      if (age > ttlMinutes) {
        localStorage.removeItem(key);
        return null;
      }
      return data;
    } catch {
      return null;
    }
  }

  _setCache(url, data) {
    try {
      const key = this._getCacheKey(url);
      localStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() }));
    } catch {
      // localStorage lleno, limpiar cache viejo
      this._clearOldCache();
    }
  }

  _clearOldCache() {
    const keys = Object.keys(localStorage).filter(k => k.startsWith('mp_cache_'));
    keys.forEach(k => localStorage.removeItem(k));
  }

  // ─── Fetch con paginación automática ───
  // Obtiene todas las páginas disponibles hasta maxPages y combina los Listado
  async _fetchAllPages(endpoint, params = {}, cacheTTL = 5, maxPages = 50) {
    const allCacheKey = `${endpoint}_all?${new URLSearchParams(params).toString()}`;
    const cached = this._getCache(allCacheKey, cacheTTL);
    if (cached) return cached;

    const first = await this._fetch(endpoint, params, 0);
    const total = first?.Cantidad || 0;
    const list = first?.Listado || [];

    if (list.length === 0 || total <= list.length) {
      this._setCache(allCacheKey, first);
      return first;
    }

    const pageSize = list.length;
    const pagesNeeded = Math.min(Math.ceil(total / pageSize), maxPages) - 1;

    const rest = await Promise.all(
      Array.from({ length: pagesNeeded }, (_, i) =>
        this._fetch(endpoint, { ...params, pagina: i + 2 }, 0).catch(() => null)
      )
    );

    const combined = {
      ...first,
      Listado: [...list, ...rest.flatMap(p => p?.Listado || [])],
    };
    this._setCache(allCacheKey, combined);
    return combined;
  }

  // ─── Fetch con manejo de errores ───
  async _fetch(endpoint, params = {}, cacheTTL = 5) {
    if (!this.ticket) {
      throw new Error('No se ha configurado el ticket de API. Ve a Configuración para ingresarlo.');
    }

    // Build URL as string to support both relative (dev proxy) and absolute URLs
    const queryParams = new URLSearchParams();
    queryParams.set('ticket', this.ticket);
    Object.entries(params).forEach(([k, v]) => {
      if (v != null && v !== '') queryParams.set(k, v);
    });

    const urlStr = `${this.baseUrl}/${endpoint}?${queryParams.toString()}`;

    // Check cache
    const cached = this._getCache(urlStr, cacheTTL);
    if (cached) return cached;

    // Check request limit
    if (this.requestCount >= 10000) {
      throw new Error('Se alcanzó el límite diario de 10.000 solicitudes a la API.');
    }

    try {
      const response = await fetch(urlStr);
      this._incrementRequestCount();

      if (response.status === 500) {
        // MercadoPublico devuelve 500 cuando no hay resultados para esa fecha/filtro
        return { Cantidad: 0, Listado: [] };
      }

      if (!response.ok) {
        throw new Error(`Error HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      this._setCache(urlStr, data);
      return data;
    } catch (err) {
      if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
        throw new Error('Error de conexión. Verifica tu internet o intenta más tarde.');
      }
      throw err;
    }
  }

  // ─── Licitaciones ───

  /** Obtener licitaciones del día actual */
  async getLicitacionesHoy(estado = null) {
    const params = {};
    if (estado) params.estado = estado;
    return this._fetch('licitaciones.json', params);
  }

  /** Obtener licitaciones por fecha — todas las páginas (para búsqueda de fecha única) */
  async getLicitacionesPorFecha(fecha, estado = null) {
    const params = { fecha };
    if (estado) params.estado = estado;
    return this._fetchAllPages('licitaciones.json', params);
  }

  /** Obtener licitaciones por fecha — solo página 1 (para consultas de rango, evita saturar API) */
  async getLicitacionesPorFechaSimple(fecha, estado = null) {
    const params = { fecha };
    if (estado) params.estado = estado;
    return this._fetch('licitaciones.json', params);
  }

  /** Obtener licitaciones activas (publicadas) */
  async getLicitacionesActivas() {
    return this._fetchAllPages('licitaciones.json', { estado: 'activas' }, 10);
  }

  /** Obtener detalle de una licitación por código */
  async getLicitacionPorCodigo(codigo) {
    return this._fetch('licitaciones.json', { codigo }, 0);
  }

  /** Obtener licitaciones por organismo */
  async getLicitacionesPorOrganismo(codigoOrganismo, fecha) {
    return this._fetch('licitaciones.json', { CodigoOrganismo: codigoOrganismo, fecha });
  }

  /** Obtener licitaciones por proveedor */
  async getLicitacionesPorProveedor(codigoProveedor, fecha) {
    return this._fetch('licitaciones.json', { CodigoProveedor: codigoProveedor, fecha });
  }

  // ─── Organismos y Proveedores ───

  /** Listar todos los organismos públicos */
  async getOrganismos() {
    return this._fetch('Empresas/BuscarComprador', {}, 60);
  }

  /** Buscar proveedor por RUT */
  async buscarProveedor(rut) {
    return this._fetch('Empresas/BuscarProveedor', { rutempresaproveedor: rut }, 60);
  }

  // ─── Utilidades ───

  /** Actualizar ticket */
  setTicket(ticket) {
    this.ticket = ticket;
  }

  /** Diagnóstico completo: ticket + estado del servidor de MercadoPublico */
  async diagnosticar(ticket) {
    const t = ticket || this.ticket;
    if (!t) return { ok: false, ticketOk: false, serverOk: false, error: 'Sin ticket configurado.' };

    const url = `${this.baseUrl}/licitaciones.json?ticket=${t}&estado=activas`;
    try {
      const res = await fetch(url);
      let body = null;
      try { body = await res.json(); } catch { /* no json */ }

      // Error de servidor/DB de ChileCompra (código 10000 = SQL Server caído)
      if (body?.Codigo === 10000) {
        return {
          ok: false,
          ticketOk: true,
          serverOk: false,
          error: 'El servidor de MercadoPúblico está caído (base de datos inaccesible). El ticket es válido — espera y reintenta más tarde.',
          detail: body.Mensaje,
        };
      }

      if (res.status === 401 || res.status === 403 || body?.Codigo === 401) {
        return { ok: false, ticketOk: false, serverOk: true, error: 'Ticket inválido o sin permisos.' };
      }

      if (!res.ok && res.status !== 500) {
        return { ok: false, ticketOk: null, serverOk: false, error: `Error HTTP ${res.status} del servidor de MercadoPúblico.` };
      }

      // 500 o Cantidad=0 = servidor OK pero sin datos (feriado, rango vacío)
      const cantidad = body?.Cantidad || 0;
      return { ok: true, ticketOk: true, serverOk: true, cantidad };
    } catch {
      return { ok: false, ticketOk: null, serverOk: false, error: 'Sin conexión al servidor de MercadoPúblico.' };
    }
  }

  /** @deprecated usar diagnosticar() */
  async validarTicket(ticket) {
    const res = await this.diagnosticar(ticket);
    if (res.ok) return { valid: true, cantidad: res.cantidad };
    return { valid: false, error: res.error };
  }
}

// Singleton
const api = new MercadoPublicoAPI();
export default api;
