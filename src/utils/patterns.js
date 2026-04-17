const STOP_WORDS = new Set([
  'de', 'la', 'el', 'en', 'y', 'a', 'los', 'del', 'las', 'un', 'una', 'por', 'con', 'para',
  'su', 'se', 'al', 'es', 'que', 'no', 'lo', 'le', 'si', 'mas', 'pero', 'sus', 'como',
  'me', 'te', 'mi', 'o', 'e', 'ni', 'ha', 'hay', 'son', 'ser', 'esta', 'este', 'esto',
  'eso', 'esa', 'estos', 'esas', 'ese', 'sin', 'sobre', 'entre', 'hasta', 'desde',
  'hacia', 'ante', 'bajo', 'cada', 'todo', 'toda', 'todos', 'todas', 'otro', 'otra',
]);

// Tokeniza texto quitando acentos, stopwords y palabras cortas
export function extractWords(text) {
  if (!text) return [];
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .split(/[^a-z0-9]+/)
    .filter(w => w.length >= 4 && !STOP_WORDS.has(w));
}

// Construye patrones a partir de licitaciones bien puntuadas (rating >= 7) con categoría confirmada
// favoritos: { [codigo]: { rating, licitacion } }
// catVotes: { "codigo__catId": { [deviceId]: true } }
export function buildPatterns(favoritos, catVotes) {
  const patterns = {};

  Object.values(favoritos).forEach(({ rating, licitacion }) => {
    if (!licitacion || rating < 7) return;
    const codigo = licitacion.CodigoExterno;
    if (!codigo) return;

    // Buscar categorías confirmadas para esta licitación
    const confirmedCats = [];
    Object.entries(catVotes).forEach(([key, votes]) => {
      if (!key.startsWith(codigo + '__')) return;
      const catId = key.slice(codigo.length + 2);
      if (Object.values(votes).some(Boolean)) confirmedCats.push(catId);
    });

    if (confirmedCats.length === 0) return;

    const words = extractWords(
      (licitacion.Nombre || '') + ' ' + (licitacion.Descripcion || '')
    );

    confirmedCats.forEach(catId => {
      if (!patterns[catId]) patterns[catId] = { __count: 0 };
      patterns[catId].__count += 1;
      words.forEach(w => {
        patterns[catId][w] = (patterns[catId][w] || 0) + 1;
      });
    });
  });

  return patterns;
}

// Calcula el score comunitario de una licitación para cada categoría con patrones aprendidos.
// Requiere al menos MIN_SAMPLES buenos ejemplos para reportar un score.
const MIN_SAMPLES = 3;

export function getCommunityScores(licitacion, patterns) {
  const words = new Set(extractWords(
    (licitacion.Nombre || '') + ' ' + (licitacion.Descripcion || '')
  ));

  const result = {};
  Object.entries(patterns).forEach(([catId, wordFreqs]) => {
    const count = wordFreqs.__count || 0;
    if (count < MIN_SAMPLES) return;

    const entries = Object.entries(wordFreqs).filter(([k]) => k !== '__count');
    if (entries.length === 0) return;

    const totalFreq = entries.reduce((s, [, f]) => s + f, 0);
    const matchedFreq = entries
      .filter(([w]) => words.has(w))
      .reduce((s, [, f]) => s + f, 0);

    result[catId] = {
      score: totalFreq > 0 ? Math.round((matchedFreq / totalFreq) * 100) : 0,
      sampleSize: count,
    };
  });

  return result;
}
