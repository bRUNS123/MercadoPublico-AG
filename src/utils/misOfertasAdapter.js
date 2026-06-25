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

// Clasifica a una de las 4 columnas a partir de texto (estado, nombre de lista, etc.).
// El orden importa: "resultados" y "cerrados" se evalúan antes que "abiertos"
// porque ambos sub-textos contienen "publicad".
export function inferColumna(texto) {
  const t = norm(String(texto || ''));
  if (!t) return null;
  if (t.includes('resultad') || t.includes('adjudic')) return 'resultados';
  if (t.includes('cerrad') || t.includes('esperando')) return 'cerrados';
  if (t.includes('abiert') || t.includes('enviad') || (t.includes('publicad') && t.includes('ofert'))) return 'abiertos';
  if (t.includes('pendiente') || t.includes('guard') || t.includes('sigu') || t.includes('borrador')) return 'pendiente';
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

// Normaliza un proceso crudo a la forma interna. columnaHint viene del nombre
// de la lista cuando el JSON está agrupado por columna.
export function normalizeProceso(raw, columnaHint) {
  if (!raw || typeof raw !== 'object') return null;

  const codigo = pick(raw, ['codigo', 'CodigoExterno', 'codigoExterno', 'Codigo', 'numeroAdquisicion', 'idLicitacion']);
  const nombre = pick(raw, ['nombre', 'Nombre', 'nombreLicitacion', 'glosa', 'Glosa', 'descripcion', 'Descripcion']);
  const organismo = pick(raw, ['organismo', 'Organismo', 'nombreOrganismo', 'comprador', 'Comprador', 'entidad']);
  const fechaCierre = pick(raw, ['fechaCierre', 'FechaCierre', 'fecha_cierre', 'fechaCierreOferta']);
  const monto = pick(raw, ['montoOfertado', 'MontoOfertado', 'presupuesto', 'Presupuesto', 'monto', 'Monto', 'total']);
  const estadoTxt = pick(raw, ['estado', 'Estado', 'estadoProceso', 'situacion', 'columna', 'categoria']);
  const mecanismo = pick(raw, ['mecanismo', 'Mecanismo', 'tipo', 'Tipo']);

  const columna = columnaHint || inferColumna(estadoTxt) || inferColumna(nombre) || 'pendiente';
  const codigoStr = codigo != null ? String(codigo) : '';

  return {
    _id: codigoStr || `proc-${++_autoId}`,
    codigo: codigoStr || '—',
    nombre: nombre || 'Sin nombre',
    organismo: organismo || '—',
    columna,
    fechaCierre: fechaCierre || null,
    monto: monto != null && monto !== '' ? Number(String(monto).replace(/[^0-9.-]/g, '')) : null,
    moneda: pick(raw, ['moneda', 'Moneda']) || 'CLP',
    mecanismo: mecanismo || (codigoStr.includes('COT') ? 'Compra Ágil' : null),
    raw,
  };
}

// URL pública de detalle según el tipo de código.
export function urlProceso(codigo) {
  if (!codigo || codigo === '—') return null;
  if (codigo.includes('COT')) {
    // Compra Ágil — el código completo abre la cotización en el buscador público
    return `https://www.mercadopublico.cl/CompraAgil/Compra/MisCotizaciones?cotizacion=${encodeURIComponent(codigo)}`;
  }
  return `https://www.mercadopublico.cl/Procurement/Modules/RFB/DetailsAcquisition.aspx?qs=${encodeURIComponent(codigo)}`;
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
    // Busca envolturas conocidas primero
    const envoltura = ['data', 'Data', 'Listado', 'listado', 'items', 'Items', 'results', 'value']
      .map(k => parsed[k]).find(Array.isArray);

    if (envoltura) {
      envoltura.forEach(p => { const n = normalizeProceso(p); if (n) procesos.push(n); });
    } else {
      // Objeto agrupado por columna: cada clave cuyo valor sea un array es una columna
      Object.entries(parsed).forEach(([clave, valor]) => {
        if (Array.isArray(valor)) {
          const hint = inferColumna(clave);
          valor.forEach(p => { const n = normalizeProceso(p, hint); if (n) procesos.push(n); });
        }
      });
    }
  }

  if (!procesos.length) return { ok: false, error: 'No se encontraron procesos en el JSON pegado.' };
  return { ok: true, procesos };
}
