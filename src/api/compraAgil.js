import { API_BASE_URL_COMPRA_AGIL } from '../utils/constants';

// El ticket de Compra Ágil parece ser el mismo que el de la API de Licitaciones (confirmado
// empíricamente: el ticket de VITE_API_TICKET funciona contra api2.mercadopublico.cl). Si se
// configura VITE_API_TICKET_COMPRA_AGIL por separado, ese tiene prioridad.
const TICKET = import.meta.env.VITE_API_TICKET_COMPRA_AGIL || import.meta.env.VITE_API_TICKET || '';

/**
 * Wrapper para la API Compra Ágil v2 (Beta) de MercadoPúblico — api2.mercadopublico.cl
 */
class CompraAgilAPI {
  constructor() {
    this.baseUrl = API_BASE_URL_COMPRA_AGIL;
    this.ticket = TICKET;
    this.requestCount = this._loadRequestCount();
  }

  // ─── Request counter (protección de 10.000/día) ───
  _loadRequestCount() {
    const stored = localStorage.getItem('mp_ca_api_requests');
    if (stored) {
      const { date, count } = JSON.parse(stored);
      if (date === new Date().toISOString().split('T')[0]) return count;
    }
    return 0;
  }

  _incrementRequestCount() {
    this.requestCount++;
    localStorage.setItem('mp_ca_api_requests', JSON.stringify({
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
    return `mp_ca_cache_${btoa(url).slice(0, 60)}`;
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
    const keys = Object.keys(localStorage).filter(k => k.startsWith('mp_ca_cache_'));
    keys.forEach(k => localStorage.removeItem(k));
  }

  // ─── Fetch con manejo de errores ───
  async _fetch(endpoint, params = {}, cacheTTL = 5) {
    if (!this.ticket) {
      throw new Error('No se ha configurado el ticket de Compra Ágil. Ve a Configuración para ingresarlo.');
    }

    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v != null && v !== '') queryParams.set(k, v);
    });

    const qs = queryParams.toString();
    const urlStr = `${this.baseUrl}/${endpoint}${qs ? `?${qs}` : ''}`;

    // Check cache
    const cached = this._getCache(urlStr, cacheTTL);
    if (cached) return cached;

    // Check request limit
    if (this.requestCount >= 10000) {
      throw new Error('Se alcanzó el límite diario de 10.000 solicitudes a la API de Compra Ágil.');
    }

    try {
      // El ticket se envía como header HTTP (requerido por la API v2 según documentación oficial)
      const response = await fetch(urlStr, { headers: { ticket: this.ticket } });
      this._incrementRequestCount();

      if (response.status === 401 || response.status === 403) {
        throw new Error('Ticket de Compra Ágil inválido o sin permisos.');
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

  // ─── Compra Ágil ───

  /** Obtener todas las páginas de /v2/compra-agil para los parámetros dados (máx. tamaño de página, hasta maxPages) */
  async _fetchAllPages(params = {}, cacheTTL = 5, maxPages = 10) {
    const first = await this._fetch('v2/compra-agil', { tamano_pagina: 50, numero_pagina: 1, ...params }, cacheTTL);
    const items = first?.payload?.items || [];
    const totalPaginas = first?.payload?.paginacion?.total_paginas || 1;

    if (totalPaginas <= 1) return first;

    const pagesToFetch = Math.min(totalPaginas, maxPages) - 1;
    const rest = await Promise.all(
      Array.from({ length: pagesToFetch }, (_, i) =>
        this._fetch('v2/compra-agil', { tamano_pagina: 50, numero_pagina: i + 2, ...params }, cacheTTL)
          .catch(() => null)
      )
    );

    return {
      ...first,
      payload: {
        ...first.payload,
        items: [...items, ...rest.flatMap(p => p?.payload?.items || [])],
      },
    };
  }

  /** Obtener oportunidades de Compra Ágil abiertas (publicadas) */
  async getComprasAgilesAbiertas(params = {}) {
    return this._fetchAllPages({ estado: 'publicada', ...params }, 5);
  }

  /** Obtener detalle de una Compra Ágil por código */
  async getCompraAgilPorCodigo(codigo) {
    return this._fetch(`v2/compra-agil/${codigo}`, {}, 0);
  }

  // ─── Utilidades ───

  /** Actualizar ticket */
  setTicket(ticket) {
    this.ticket = ticket;
  }

  /** Diagnóstico: ticket + estado del servidor de la API Compra Ágil */
  async diagnosticar(ticket) {
    const t = ticket || this.ticket;
    if (!t) return { ok: false, ticketOk: false, serverOk: false, error: 'Sin ticket configurado.' };

    const url = `${this.baseUrl}/v2/compra-agil?estado=publicada&tamano_pagina=10`;
    try {
      const res = await fetch(url, { headers: { ticket: t } });
      let body = null;
      try { body = await res.json(); } catch { /* no json */ }

      if (res.status === 401 || res.status === 403) {
        return { ok: false, ticketOk: false, serverOk: true, error: 'Ticket de Compra Ágil inválido o sin permisos.' };
      }

      if (!res.ok) {
        return { ok: false, ticketOk: null, serverOk: false, error: `Error HTTP ${res.status} del servidor de Compra Ágil.` };
      }

      const cantidad = body?.payload?.paginacion?.total_resultados ?? body?.payload?.items?.length ?? 0;
      return { ok: true, ticketOk: true, serverOk: true, cantidad };
    } catch {
      return { ok: false, ticketOk: null, serverOk: false, error: 'Sin conexión al servidor de Compra Ágil.' };
    }
  }
}

// Singleton
const compraAgilApi = new CompraAgilAPI();
export default compraAgilApi;
