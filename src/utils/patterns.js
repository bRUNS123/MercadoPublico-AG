const STOP_WORDS = new Set([
  'de', 'la', 'el', 'en', 'y', 'a', 'los', 'del', 'las', 'un', 'una', 'por', 'con', 'para',
  'su', 'se', 'al', 'es', 'que', 'no', 'lo', 'le', 'si', 'mas', 'pero', 'sus', 'como',
  'me', 'te', 'mi', 'o', 'e', 'ni', 'ha', 'hay', 'son', 'ser', 'esta', 'este', 'esto',
  'eso', 'esa', 'estos', 'esas', 'ese', 'sin', 'sobre', 'entre', 'hasta', 'desde',
  'hacia', 'ante', 'bajo', 'cada', 'todo', 'toda', 'todos', 'todas', 'otro', 'otra',
  'proyecto', 'servicio', 'servicios', 'contrato', 'obras', 'obra', 'licitacion',
]);

export function extractWords(text) {
  if (!text) return [];
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .split(/[^a-z0-9]+/)
    .filter(w => w.length >= 4 && !STOP_WORDS.has(w));
}

// Construye patrones desde tres fuentes:
// 1. Licitaciones con rating >= 5 Y categoría confirmada (señal fuerte positiva)
// 2. Licitaciones con 2+ votos de categoría aunque rating sea bajo (señal comunidad)
// 3. Licitaciones descartadas → patrones negativos (_noise)
// favoritos:   { [codigo]: { rating, licitacion } }
// catVotes:    { "codigo__catId": { [deviceId]: true } }
// descartados: { [codigo]: { licitacion } }
export function buildPatterns(favoritos, catVotes, descartados = {}) {
  const patterns = {};

  // Índice inverso: codigo → licitacion (para acceder desde catVotes)
  const licitacionByCode = {};
  Object.values(favoritos).forEach(({ licitacion }) => {
    if (licitacion?.CodigoExterno) licitacionByCode[licitacion.CodigoExterno] = licitacion;
  });

  // Fuente 1: favoritos con rating >= 5 + categoría confirmada
  Object.values(favoritos).forEach(({ rating, licitacion }) => {
    if (!licitacion || rating < 5) return;
    const codigo = licitacion.CodigoExterno;
    if (!codigo) return;

    Object.entries(catVotes).forEach(([key, votes]) => {
      if (!key.startsWith(codigo + '__')) return;
      const catId = key.slice(codigo.length + 2);
      const confirmed = Object.values(votes).filter(Boolean).length;
      if (confirmed === 0) return;
      _addToPattern(patterns, catId, licitacion, 1);
    });
  });

  // Fuente 2: cualquier licitación con 2+ votos en la misma categoría
  Object.entries(catVotes).forEach(([key, votes]) => {
    const sep = key.indexOf('__');
    if (sep === -1) return;
    const codigo = key.slice(0, sep);
    const catId = key.slice(sep + 2);
    const confirmed = Object.values(votes).filter(Boolean).length;
    if (confirmed < 2) return;

    const lic = licitacionByCode[codigo];
    if (!lic) return;

    const weight = confirmed >= 3 ? 2 : 1;
    _addToPattern(patterns, catId, lic, weight);
  });

  // Fuente 3: patrones negativos desde descartadas (palabras frecuentes → ruido)
  const noise = {};
  Object.values(descartados).forEach(({ licitacion }) => {
    if (!licitacion) return;
    const words = extractWords((licitacion.Nombre || '') + ' ' + (licitacion.Descripcion || ''));
    words.forEach(w => { noise[w] = (noise[w] || 0) + 1; });
  });

  return { ...patterns, _noise: noise, _noiseCount: Object.keys(descartados).length };
}

function _addToPattern(patterns, catId, licitacion, weight) {
  if (!patterns[catId]) patterns[catId] = { __count: 0 };
  patterns[catId].__count += weight;
  const words = extractWords(
    (licitacion.Nombre || '') + ' ' + (licitacion.Descripcion || '')
  );
  words.forEach(w => {
    patterns[catId][w] = (patterns[catId][w] || 0) + weight;
  });
}

// Score comunitario para una licitación dado los patrones aprendidos.
// Retorna también si la detección es por comunidad (source: 'community') o automática.
const MIN_SAMPLES = 2;

export function getCommunityScores(licitacion, patterns) {
  const wordArr = extractWords((licitacion.Nombre || '') + ' ' + (licitacion.Descripcion || ''));
  const words = new Set(wordArr);
  const noise = patterns._noise || {};
  const noiseCount = patterns._noiseCount || 0;

  // Factor de penalización: cuántas palabras de esta licitación aparecen frecuentemente en descartadas
  let noisePenalty = 1;
  if (noiseCount >= 3 && wordArr.length > 0) {
    const noiseMatches = wordArr.filter(w => (noise[w] || 0) >= 2).length;
    noisePenalty = Math.max(0.15, 1 - (noiseMatches / wordArr.length) * 1.5);
  }

  const result = {};
  Object.entries(patterns).forEach(([catId, wordFreqs]) => {
    if (catId.startsWith('_')) return;
    const count = wordFreqs.__count || 0;
    if (count < MIN_SAMPLES) return;

    const entries = Object.entries(wordFreqs).filter(([k]) => k !== '__count');
    if (entries.length === 0) return;

    const totalFreq = entries.reduce((s, [, f]) => s + f, 0);
    const matchedFreq = entries
      .filter(([w]) => words.has(w))
      .reduce((s, [, f]) => s + f, 0);

    const rawScore = totalFreq > 0 ? (matchedFreq / totalFreq) * 100 : 0;
    const score = Math.round(rawScore * noisePenalty);

    if (score > 0) {
      result[catId] = { score, sampleSize: count };
    }
  });

  return result;
}

// Retorna las palabras más frecuentes aprendidas para una categoría (para debug/display)
export function getTopPatternWords(patterns, catId, n = 10) {
  const wordFreqs = patterns[catId];
  if (!wordFreqs) return [];
  return Object.entries(wordFreqs)
    .filter(([k]) => k !== '__count')
    .sort(([, a], [, b]) => b - a)
    .slice(0, n)
    .map(([word, freq]) => ({ word, freq }));
}
