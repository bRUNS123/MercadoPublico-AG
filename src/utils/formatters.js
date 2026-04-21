import { MONEDAS, ESTADOS, TIPOS, CATEGORIAS_INTERES } from './constants';

// ─── Valores de referencia para conversión (actualizar periódicamente) ───
// UF ~ $38.700 CLP (abril 2026 aprox)
// UTM ~ $67.000 CLP (abril 2026 aprox)
// USD ~ $940 CLP (abril 2026 aprox)
const UF_TO_CLP = 38700;
const UTM_TO_CLP = 67000;
const USD_TO_CLP = 940;

// ─── Rangos de estimación UTM (cuando MontoEstimado es null) ───
const ESTIMACION_RANGOS = {
  1: { min: 0, max: 100, label: '< 100 UTM', clpMin: 0, clpMax: 100 * UTM_TO_CLP },
  2: { min: 100, max: 1000, label: '100 – 1.000 UTM', clpMin: 100 * UTM_TO_CLP, clpMax: 1000 * UTM_TO_CLP },
  3: { min: 1000, max: 2000, label: '1.000 – 2.000 UTM', clpMin: 1000 * UTM_TO_CLP, clpMax: 2000 * UTM_TO_CLP },
  4: { min: 2000, max: 5000, label: '2.000 – 5.000 UTM', clpMin: 2000 * UTM_TO_CLP, clpMax: 5000 * UTM_TO_CLP },
  5: { min: 5000, max: null, label: '> 5.000 UTM', clpMin: 5000 * UTM_TO_CLP, clpMax: 10000 * UTM_TO_CLP },
};

/**
 * Convierte un monto a CLP según su moneda
 */
export function convertToCLP(monto, moneda) {
  if (monto == null || isNaN(monto)) return null;
  const num = Number(monto);
  if (num === 0) return 0;
  switch (moneda) {
    case 'CLF': return Math.round(num * UF_TO_CLP);
    case 'USD': return Math.round(num * USD_TO_CLP);
    case 'UTM': return Math.round(num * UTM_TO_CLP);
    case 'EUR': return Math.round(num * USD_TO_CLP * 1.08); // EUR aprox
    case 'CLP':
    default:
      return num;
  }
}

/**
 * Formatea un monto en su moneda original: $1.234.567 / UF 500 / US$10.000
 */
export function formatMonto(monto, moneda = 'CLP') {
  if (monto == null || isNaN(monto)) return '—';
  const info = MONEDAS[moneda] || MONEDAS.CLP;
  const num = Number(monto);
  if (num === 0) return '—';
  if (moneda === 'CLP') {
    return `${info.simbolo}${num.toLocaleString('es-CL', { maximumFractionDigits: 0 })}`;
  }
  return `${info.simbolo} ${num.toLocaleString('es-CL', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

/**
 * Obtiene un monto inteligente para mostrar en la tabla.
 * Prioriza: MontoEstimado (convirtiendo a CLP) > Estimación (rango UTM)
 * Retorna { display, clpValue, tooltip, isRange }
 */
export function getMontoInteligente(licitacion) {
  const monto = licitacion.MontoEstimado;
  const moneda = licitacion.Moneda || 'CLP';
  const estimacion = licitacion.Estimacion;

  // Caso 1: Tiene monto exacto
  if (monto != null && !isNaN(monto) && Number(monto) > 0) {
    const clpValue = convertToCLP(monto, moneda);
    const displayCLP = `$${clpValue.toLocaleString('es-CL', { maximumFractionDigits: 0 })}`;

    if (moneda !== 'CLP') {
      // Mostrar en CLP con indicador de moneda original
      const original = formatMonto(monto, moneda);
      return {
        display: displayCLP,
        clpValue,
        tooltip: `${original} (${MONEDAS[moneda]?.nombre || moneda})`,
        isRange: false,
        monedaOriginal: moneda,
      };
    }

    return {
      display: displayCLP,
      clpValue,
      tooltip: null,
      isRange: false,
      monedaOriginal: 'CLP',
    };
  }

  // Caso 2: No tiene monto pero tiene estimación (rango UTM)
  if (estimacion != null && ESTIMACION_RANGOS[estimacion]) {
    const rango = ESTIMACION_RANGOS[estimacion];
    const clpMid = Math.round((rango.clpMin + rango.clpMax) / 2);
    const displayMin = `$${rango.clpMin.toLocaleString('es-CL', { maximumFractionDigits: 0 })}`;
    const displayMax = rango.clpMax ? `$${rango.clpMax.toLocaleString('es-CL', { maximumFractionDigits: 0 })}` : '+';

    return {
      display: `~$${(clpMid / 1000000).toFixed(0)}M`,
      clpValue: clpMid,
      tooltip: `Rango: ${rango.label}\n≈ ${displayMin} – ${displayMax}`,
      isRange: true,
      monedaOriginal: 'UTM',
    };
  }

  // Caso 3: Sin información
  return { display: '—', clpValue: 0, tooltip: null, isRange: false, monedaOriginal: null };
}

/**
 * Formatea un valor CLP grande de forma compacta: $67M, $1.200M, $3,5B
 */
export function formatMontoCompacto(clp) {
  if (!clp || clp === 0) return '—';
  if (clp >= 1e9) return `$${(clp / 1e9).toFixed(1).replace('.0', '')}B`;
  if (clp >= 1e6) return `$${(clp / 1e6).toFixed(0)}M`;
  if (clp >= 1e3) return `$${(clp / 1e3).toFixed(0)}K`;
  return `$${clp.toLocaleString('es-CL')}`;
}

/**
 * Formatea una fecha ISO a "16 abr 2026, 14:30"
 */
export function formatFecha(fechaStr) {
  if (!fechaStr) return '—';
  const d = new Date(fechaStr);
  if (isNaN(d.getTime())) return fechaStr;
  return d.toLocaleDateString('es-CL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Formatea fecha corta: "16 abr 2026"
 */
export function formatFechaCorta(fechaStr) {
  if (!fechaStr) return '—';
  const d = new Date(fechaStr);
  if (isNaN(d.getTime())) return fechaStr;
  return d.toLocaleDateString('es-CL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Formatea fecha para API: ddmmaaaa
 */
export function formatFechaAPI(date) {
  const d = date instanceof Date ? date : new Date(date);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}${mm}${yyyy}`;
}

/**
 * Obtiene el nombre legible de un estado por código
 */
export function getEstadoNombre(codigo) {
  return ESTADOS[codigo]?.nombre || `Estado ${codigo}`;
}

/**
 * Obtiene el tipo legible de licitación
 */
export function getTipoNombre(codigo) {
  return TIPOS[codigo] || codigo;
}

/**
 * Calcula días restantes hasta cierre
 */
export function diasRestantes(fechaCierre) {
  if (!fechaCierre) return null;
  const cierre = new Date(fechaCierre);
  const ahora = new Date();
  const diff = cierre - ahora;
  if (diff < 0) return 0;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

/**
 * Trunca texto a N caracteres
 */
export function truncate(text, max = 80) {
  if (!text) return '';
  return text.length > max ? text.substring(0, max) + '…' : text;
}

/**
 * Parsea fecha input (YYYY-MM-DD) a formato API (ddmmaaaa)
 */
export function inputDateToAPI(dateStr) {
  if (!dateStr) return null;
  const [yyyy, mm, dd] = dateStr.split('-');
  return `${dd}${mm}${yyyy}`;
}

/**
 * Retorna la fecha de hoy en formato YYYY-MM-DD (para inputs)
 */
export function todayInputFormat() {
  const d = new Date();
  return d.toISOString().split('T')[0];
}

/**
 * Resta N días a una fecha YYYY-MM-DD
 */
export function subtractDays(dateStr, days) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() - days);
  return d.toISOString().split('T')[0];
}

/**
 * Genera array de fechas YYYY-MM-DD entre desde y hasta (inclusive), máx 30 días
 */
export function getDatesInRange(desde, hasta) {
  const dates = [];
  const from = new Date(desde);
  const to = new Date(hasta);
  const maxDays = 30;
  let count = 0;
  for (let d = new Date(from); d <= to && count < maxDays; d.setDate(d.getDate() + 1), count++) {
    dates.push(new Date(d).toISOString().split('T')[0]);
  }
  return dates;
}

export const norm = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

/**
 * Retorna las categorías que coinciden con una licitación y su score de coincidencia.
 * Score = (keywords encontradas / total keywords) * 100
 * Normaliza acentos en texto y keywords antes de comparar.
 */
export function getCategoryMatches(licitacion) {
  const text = norm((licitacion.Nombre || '') + ' ' + (licitacion.Descripcion || ''));
  return CATEGORIAS_INTERES
    .map(cat => {
      const matched = cat.keywords.filter(kw => text.includes(norm(kw))).length;
      if (matched === 0) return null;
      return { id: cat.id, label: cat.label, score: Math.round((matched / cat.keywords.length) * 100) };
    })
    .filter(Boolean);
}
