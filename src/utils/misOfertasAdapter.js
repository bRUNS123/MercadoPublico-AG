import { norm } from './formatters';

// ─── Estados de la OFERTA del proveedor (distintos al estado de la licitación) ───
// Reflejan el ciclo de vida de "en qué he licitado" en el Escritorio del Proveedor.
export const OFERTA_ESTADOS = {
  guardada:      { label: 'Guardada',       icon: '📝', color: '#94a3b8', bg: 'rgba(148,163,184,0.15)' },
  enviada:       { label: 'Enviada',        icon: '📤', color: '#0ea5e9', bg: 'rgba(14,165,233,0.15)' },
  en_evaluacion: { label: 'En Evaluación',  icon: '🔍', color: '#eab308', bg: 'rgba(234,179,8,0.15)' },
  adjudicada:    { label: 'Adjudicada',     icon: '🏆', color: '#22c55e', bg: 'rgba(34,197,94,0.15)' },
  no_adjudicada: { label: 'No Adjudicada',  icon: '❌', color: '#ef4444', bg: 'rgba(239,68,68,0.15)' },
  desierta:      { label: 'Desierta',       icon: '🌫️', color: '#94a3b8', bg: 'rgba(148,163,184,0.15)' },
  cerrada:       { label: 'Cerrada',        icon: '🔒', color: '#f97316', bg: 'rgba(249,115,22,0.15)' },
  desconocido:   { label: 'Sin estado',     icon: '❔', color: '#94a3b8', bg: 'rgba(148,163,184,0.15)' },
};

// Mapea texto libre del estado de la oferta a una clave canónica de OFERTA_ESTADOS.
export function inferEstadoOferta(texto) {
  const t = norm(String(texto || ''));
  if (!t) return 'desconocido';
  if (t.includes('adjudic') && (t.includes('no') || t.includes('rechaz') || t.includes('perd'))) return 'no_adjudicada';
  if (t.includes('adjudic')) return 'adjudicada';
  if (t.includes('evalua')) return 'en_evaluacion';
  if (t.includes('desiert')) return 'desierta';
  if (t.includes('guard') || t.includes('borrador')) return 'guardada';
  if (t.includes('envi') || t.includes('ofert') || t.includes('postul') || t.includes('present')) return 'enviada';
  if (t.includes('cerrad')) return 'cerrada';
  return 'desconocido';
}

// Devuelve el primer valor definido entre varios posibles nombres de campo (case-insensitive).
function pick(obj, keys) {
  for (const k of keys) {
    if (obj[k] != null && obj[k] !== '') return obj[k];
    // búsqueda case-insensitive
    const found = Object.keys(obj).find(ok => ok.toLowerCase() === k.toLowerCase());
    if (found && obj[found] != null && obj[found] !== '') return obj[found];
  }
  return undefined;
}

// Extrae el array de ofertas desde distintas envolturas posibles de la respuesta pegada.
function extractList(parsed) {
  if (Array.isArray(parsed)) return parsed;
  if (!parsed || typeof parsed !== 'object') return [];
  const candidatos = ['Listado', 'listado', 'data', 'Data', 'items', 'Items',
    'ofertas', 'Ofertas', 'results', 'Results', 'rows', 'Rows', 'value'];
  for (const c of candidatos) {
    if (Array.isArray(parsed[c])) return parsed[c];
  }
  // Si algún valor de primer nivel es un array, úsalo
  const arr = Object.values(parsed).find(v => Array.isArray(v));
  return arr || [parsed];
}

let _autoId = 0;

// Normaliza un objeto crudo de oferta a la forma interna que consume la UI.
export function normalizeOferta(raw) {
  if (!raw || typeof raw !== 'object') return null;

  const codigo = pick(raw, ['CodigoExterno', 'codigoExterno', 'codigo', 'Codigo', 'idLicitacion', 'IdLicitacion', 'numeroAdquisicion']);
  const nombre = pick(raw, ['Nombre', 'nombre', 'nombreLicitacion', 'NombreLicitacion', 'glosa', 'Glosa', 'descripcion', 'Descripcion']);
  const organismo = pick(raw, ['Organismo', 'organismo', 'NombreOrganismo', 'nombreOrganismo', 'comprador', 'Comprador', 'entidad', 'Entidad']);
  const estadoOfertaTxt = pick(raw, ['EstadoOferta', 'estadoOferta', 'estadoPostulacion', 'EstadoPostulacion', 'estado', 'Estado', 'estadoLicitacion']);
  const fechaPostulacion = pick(raw, ['FechaPostulacion', 'fechaPostulacion', 'fechaEnvio', 'FechaEnvio', 'fechaOferta', 'FechaOferta']);
  const fechaCierre = pick(raw, ['FechaCierre', 'fechaCierre', 'fechaCierreOferta', 'FechaCierreOferta']);
  const monto = pick(raw, ['MontoOfertado', 'montoOfertado', 'MontoEstimado', 'montoEstimado', 'monto', 'Monto', 'total', 'Total']);
  const moneda = pick(raw, ['Moneda', 'moneda', 'MonedaOferta']) || 'CLP';
  const tipo = pick(raw, ['Tipo', 'tipo', 'TipoLicitacion', 'tipoLicitacion']);

  return {
    _id: codigo || `oferta-${++_autoId}`,
    codigo: codigo || '—',
    nombre: nombre || 'Sin nombre',
    organismo: organismo || '—',
    estadoOferta: inferEstadoOferta(estadoOfertaTxt),
    estadoOfertaTexto: estadoOfertaTxt || '',
    fechaPostulacion: fechaPostulacion || null,
    fechaCierre: fechaCierre || null,
    monto: monto != null && monto !== '' ? Number(String(monto).replace(/[^0-9.-]/g, '')) : null,
    moneda,
    tipo: tipo || null,
    raw,
  };
}

/**
 * Parsea el texto pegado (JSON de la respuesta del panel) y devuelve ofertas normalizadas.
 * @returns {{ ok: boolean, ofertas?: object[], error?: string }}
 */
export function parseMisOfertas(texto) {
  if (!texto || !texto.trim()) return { ok: false, error: 'Pega la respuesta JSON de tu panel de ofertas.' };

  let parsed;
  try {
    parsed = JSON.parse(texto.trim());
  } catch {
    return { ok: false, error: 'El texto pegado no es JSON válido. Asegúrate de copiar la "Response" completa desde la pestaña Network de DevTools.' };
  }

  const lista = extractList(parsed);
  if (!lista.length) return { ok: false, error: 'No se encontraron ofertas en el JSON pegado.' };

  const ofertas = lista.map(normalizeOferta).filter(Boolean);
  if (!ofertas.length) return { ok: false, error: 'No se pudieron normalizar las ofertas. Revisa el formato.' };

  return { ok: true, ofertas };
}
