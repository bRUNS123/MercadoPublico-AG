/**
 * detectRegion.js — Detecta región/comuna chilena desde texto descriptivo
 * usando localidades.json (regiones + comunas de Chile).
 *
 * Uso:
 *   import { detectRegion } from '../utils/detectRegion';
 *   const resultado = await detectRegion(nombre, descripcion);
 *   // resultado: { region: "Metropolitana de Santiago", comuna: "Santiago", nombreCompleto: "Santiago, Metropolitana de Santiago" }
 */

let _localidadesCache = null;

const norm = s => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

async function loadLocalidades() {
  if (_localidadesCache) return _localidadesCache;
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}data/localidades.json`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    _localidadesCache = await res.json();
    return _localidadesCache;
  } catch {
    return null;
  }
}

/**
 * Busca región y comuna en un texto (nombre + descripción de la licitación/compra ágil).
 * Retorna { region, comuna, nombreCompleto } o null si no encuentra nada.
 */
export async function detectRegion(nombre = '', descripcion = '') {
  const data = await loadLocalidades();
  if (!data || !data.regions) return null;

  const texto = norm((nombre || '') + ' ' + (descripcion || ''));

  // Buscar primero por comuna (más específico)
  for (const region of data.regions) {
    for (const comuna of region.communes) {
      const comunaNorm = norm(comuna.name);
      // Buscar la comuna como palabra completa en el texto
      if (texto.includes(comunaNorm)) {
        return {
          region: region.name,
          comuna: comuna.name,
          nombreCompleto: `${comuna.name}, ${region.name}`,
        };
      }
    }
  }

  // Si no encuentra comuna, buscar por nombre de región
  // (algunos textos mencionan directamente la región)
  for (const region of data.regions) {
    const regionNorm = norm(region.name);
    // Fragmentos comunes de nombres de región
    const fragments = [
      regionNorm,
      regionNorm.replace('libertador gral bernardo o higgins', 'ohiggins'),
      regionNorm.replace('libertador gral bernardo o higgins', 'o\'higgins'),
      regionNorm.replace('aisen del gral carlos ibanez del campo', 'aisen'),
      regionNorm.replace('magallanes y de la antartica chilena', 'magallanes'),
    ];

    for (const frag of fragments) {
      // Buscar fragmento como palabra o frase completa
      if (texto.includes(frag)) {
        return {
          region: region.name,
          comuna: null,
          nombreCompleto: region.name,
        };
      }
    }
  }

  // Buscar por número romano de región (ej: "Región XIII", "Región Metropolitana")
  const romanoMatch = texto.match(/region\s+(x{0,3}(?:ix|iv|v?i{0,3}))/i);
  if (romanoMatch) {
    const romano = romanoMatch[1].toUpperCase();
    for (const region of data.regions) {
      if (region.romanNumber === romano) {
        return {
          region: region.name,
          comuna: null,
          nombreCompleto: region.name,
        };
      }
    }
  }

  return null;
}
