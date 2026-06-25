import { norm } from './formatters';

// ─── Las 4 columnas del tablero "Procesos en los que participaste" ───
// Replican exactamente el Escritorio de Proveedor de MercadoPúblico.
export const PROCESO_COLUMNAS = {
  pendiente: {
    id: 'pendiente',
    label: 'Oferta pendiente de envío',
    sub: 'Siguiendo o con oferta guardada',
    icon: '📝', color: '#f97316', bg: 'rgba(249,115,22,0.12)',
  },
  abiertos: {
    id: 'abiertos',
    label: 'Abiertos con oferta enviada',
    sub: 'Publicadas, oferta enviada',
    icon: '📤', color: '#22c55e', bg: 'rgba(34,197,94,0.12)',
  },
  cerrados: {
    id: 'cerrados',
    label: 'Cerrados, esperando resultados',
    sub: 'Cerradas',
    icon: '🔒', color: '#64748b', bg: 'rgba(100,116,139,0.12)',
  },
  resultados: {
    id: 'resultados',
    label: 'Con resultados publicados',
    sub: 'Resultados / adjudicación',
    icon: '🏆', color: '#3b82f6', bg: 'rgba(59,130,246,0.12)',
  },
};

export const COLUMNAS_ORDEN = ['pendiente', 'abiertos', 'cerrados', 'resultados'];

// Claves exactas que devuelve la API del escritorio (/escritorio/oportunidades).
export const COLUMNA_POR_CLAVE = {
  followed: 'pendiente',
  published: 'abiertos',
  closed: 'cerrados',
  with_results: 'resultados',
};

// Clasifica a una de las 4 columnas a partir de texto libre (fallback cuando
// no viene agrupado por clave conocida). "cerrados" se evalúa antes que
// "resultados" porque la etapa "Cerradas, esperando resultados" contiene ambos.
export function inferColumna(texto) {
  const t = norm(String(texto || ''));
  if (!t) return null;
  if (t.includes('cerrad') || t.includes('esperando')) return 'cerrados';
  if (t.includes('resultad') || t.includes('adjudic') || t.includes('seleccionad')) return 'resultados';
  if (t.includes('abiert') || t.includes('recibiendo') || t.includes('enviad') || t.includes('publicad')) return 'abiertos';
  if (t.includes('pendiente') || t.includes('guard') || t.includes('sigu') || t.includes('borrador') || t.includes('followed')) return 'pendiente';
  return null;
}

// Primer valor definido entre varios nombres de campo posibles (case-insensitive).
function pick(obj, keys) {
  for (const k of keys) {
    const found = Object.keys(obj).find(ok => ok.toLowerCase() === k.toLowerCase());
    if (found && obj[found] != null && obj[found] !== '') return obj[found];
  }
  return undefined;
}

let _autoId = 0;

// Normaliza un proceso crudo a la forma interna. columnaForzada viene del
// nombre de la lista (followed/published/closed/with_results) cuando el JSON
// está agrupado por columna; tiene prioridad sobre la inferencia por texto.
export function normalizeProceso(raw, columnaForzada) {
  if (!raw || typeof raw !== 'object') return null;

  const codigo = pick(raw, ['codigo', 'CodigoExterno', 'codigoExterno', 'Codigo', 'numeroAdquisicion', 'idLicitacion']);
  const nombre = pick(raw, ['nombre', 'Nombre', 'nombreLicitacion', 'glosa', 'Glosa', 'descripcion', 'Descripcion']);
  const organismo = pick(raw, ['organismo', 'Organismo', 'nombreOrganismo', 'comprador', 'Comprador', 'entidad']);
  const fechaCierre = pick(raw, ['fechaCierre', 'FechaCierre', 'fecha_cierre', 'fechaCierreOferta']);
  const fechaPublicacion = pick(raw, ['fechaPublicacion', 'FechaPublicacion', 'fecha_publicacion']);
  const monto = pick(raw, ['montoOfertado', 'MontoOfertado', 'presupuesto', 'Presupuesto', 'monto', 'Monto', 'total']);
  const estadoLabel = pick(raw, ['nombreEstado', 'NombreEstado', 'etapaDelProceso', 'estadoProceso', 'situacion']);
  const mecanismo = pick(raw, ['tipoMecanismo', 'mecanismo', 'Mecanismo', 'tipo', 'Tipo']);

  const columna = columnaForzada
    || inferColumna(pick(raw, ['etapaDelProceso', 'nombreEstado']))
    || inferColumna(nombre)
    || 'pendiente';
  const codigoStr = codigo != null ? String(codigo) : '';

  const mecanismoLabel = mecanismo === 'CA' || mecanismo === 'compra_agil'
    ? 'Compra Ágil'
    : (mecanismo || (codigoStr.includes('COT') ? 'Compra Ágil' : null));

  return {
    _id: codigoStr || `proc-${++_autoId}`,
    codigo: codigoStr || '—',
    nombre: nombre || 'Sin nombre',
    organismo: organismo || '—',
    columna,
    estadoLabel: estadoLabel || '',
    fechaCierre: fechaCierre || null,
    fechaPublicacion: fechaPublicacion || null,
    monto: monto != null && monto !== '' ? Number(String(monto).replace(/[^0-9.-]/g, '')) : null,
    moneda: pick(raw, ['moneda', 'Moneda']) || 'CLP',
    mecanismo: mecanismoLabel,
    raw,
  };
}

// URL pública de detalle. Usa los mismos patrones que el resto de la app:
// Compra Ágil → ficha del buscador; licitaciones → DetailsAcquisition.
export function urlProceso(codigo, esCompraAgil) {
  if (!codigo || codigo === '—') return null;
  if (esCompraAgil || codigo.includes('COT')) {
    return `https://buscador.mercadopublico.cl/ficha?code=${encodeURIComponent(codigo)}`;
  }
  return `https://www.mercadopublico.cl/Procurement/Modules/RFB/DetailsAcquisition.aspx?idlicitacion=${encodeURIComponent(codigo)}`;
}

/**
 * Parsea el texto pegado y devuelve procesos normalizados.
 * Soporta tres formas:
 *   1. Array plano de procesos (cada uno con su estado/columna).
 *   2. Objeto con listas por columna: { "pendientes":[...], "abiertos":[...], ... }
 *   3. Objeto envuelto: { data:[...] } / { Listado:[...] } etc.
 * @returns {{ ok: boolean, procesos?: object[], error?: string }}
 */
export function parseMisProcesos(texto) {
  if (!texto || !texto.trim()) return { ok: false, error: 'Pega la respuesta JSON de tu panel de proveedor.' };

  let parsed;
  try {
    parsed = JSON.parse(texto.trim());
  } catch {
    return { ok: false, error: 'El texto pegado no es JSON válido. Copia la "Response" completa desde la pestaña Network de DevTools.' };
  }

  const procesos = [];

  if (Array.isArray(parsed)) {
    parsed.forEach(p => { const n = normalizeProceso(p); if (n) procesos.push(n); });
  } else if (parsed && typeof parsed === 'object') {
    const clavesConocidas = Object.keys(COLUMNA_POR_CLAVE).filter(k => Array.isArray(parsed[k]));

    if (clavesConocidas.length) {
      // Forma real de la API: { followed, published, closed, with_results }
      clavesConocidas.forEach(clave => {
        parsed[clave].forEach(p => {
          const n = normalizeProceso(p, COLUMNA_POR_CLAVE[clave]);
          if (n) procesos.push(n);
        });
      });
    } else {
      // Envoltura genérica
      const envoltura = ['data', 'Data', 'Listado', 'listado', 'items', 'Items', 'results', 'value']
        .map(k => parsed[k]).find(Array.isArray);
      if (envoltura) {
        envoltura.forEach(p => { const n = normalizeProceso(p); if (n) procesos.push(n); });
      } else {
        // Objeto agrupado por columna con claves no estándar
        Object.entries(parsed).forEach(([clave, valor]) => {
          if (Array.isArray(valor)) {
            const hint = inferColumna(clave);
            valor.forEach(p => { const n = normalizeProceso(p, hint); if (n) procesos.push(n); });
          }
        });
      }
    }
  }

  if (!procesos.length) return { ok: false, error: 'No se encontraron procesos en el JSON pegado.' };
  return { ok: true, procesos };
}
