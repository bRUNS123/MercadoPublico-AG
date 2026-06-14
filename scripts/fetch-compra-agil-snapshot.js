// Script standalone (Node) que genera un snapshot estático de las oportunidades
// "publicada" de Compra Ágil para que la versión publicada (GitHub Pages) pueda
// mostrarlas sin depender de llamadas en vivo a api2.mercadopublico.cl (bloqueadas
// por WAF para IPs no chilenas).
//
// Uso: node scripts/fetch-compra-agil-snapshot.js
// Requiere VITE_API_TICKET (o VITE_API_TICKET_COMPRA_AGIL) en .env.local.

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const BASE_URL = 'https://api2.mercadopublico.cl';
const PAGE_SIZE = 50;
const MAX_PAGES = Number(process.env.SNAPSHOT_MAX_PAGES || 20);
const DELAY_MS = Number(process.env.SNAPSHOT_DELAY_MS || 400);
const MAX_RETRIES = 3;

function loadEnvLocal() {
  const env = {};
  try {
    const content = readFileSync(resolve(ROOT, '.env.local'), 'utf-8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq === -1) continue;
      env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
    }
  } catch {
    // .env.local no existe — se usan variables de entorno del proceso
  }
  return env;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchPage(ticket, numeroPagina) {
  const url = `${BASE_URL}/v2/compra-agil?estado=publicada&tamano_pagina=${PAGE_SIZE}&numero_pagina=${numeroPagina}`;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const res = await fetch(url, { headers: { ticket } });
    if (res.ok) {
      if (attempt > 1) fetchPage.retriedPages++;
      return res.json();
    }

    if (res.status === 429 && attempt < MAX_RETRIES) {
      const retryAfter = Number(res.headers.get('retry-after'));
      const waitMs = retryAfter > 0 ? retryAfter * 1000 : 1000 * attempt;
      console.warn(`  Aviso: HTTP 429 en página ${numeroPagina}, reintentando en ${waitMs}ms (intento ${attempt}/${MAX_RETRIES})...`);
      await sleep(waitMs);
      continue;
    }

    throw new Error(`HTTP ${res.status} en página ${numeroPagina}`);
  }
}
fetchPage.retriedPages = 0;

async function main() {
  const env = loadEnvLocal();
  const ticket = process.env.VITE_API_TICKET_COMPRA_AGIL || env.VITE_API_TICKET_COMPRA_AGIL
    || process.env.VITE_API_TICKET || env.VITE_API_TICKET;

  if (!ticket) {
    console.error('Falta VITE_API_TICKET (o VITE_API_TICKET_COMPRA_AGIL) en .env.local');
    process.exit(1);
  }

  console.log('Obteniendo página 1...');
  const first = await fetchPage(ticket, 1);
  const items = first?.payload?.items || [];
  const totalPaginas = first?.payload?.paginacion?.total_paginas || 1;
  const totalResultados = first?.payload?.paginacion?.total_resultados ?? items.length;

  const pagesToFetch = Math.min(totalPaginas, MAX_PAGES);
  console.log(`Total disponible: ${totalResultados} resultados en ${totalPaginas} páginas. Descargando ${pagesToFetch} página(s)...`);

  const omittedPages = [];
  for (let p = 2; p <= pagesToFetch; p++) {
    await sleep(DELAY_MS);
    console.log(`Obteniendo página ${p}/${pagesToFetch}...`);
    try {
      const data = await fetchPage(ticket, p);
      items.push(...(data?.payload?.items || []));
    } catch (err) {
      console.warn(`  Aviso: falló la página ${p} (${err.message}), se omite.`);
      omittedPages.push(p);
    }
  }

  if (fetchPage.retriedPages > 0) {
    console.log(`Páginas que requirieron reintento por 429: ${fetchPage.retriedPages}`);
  }
  if (omittedPages.length > 0) {
    console.warn(`Páginas omitidas tras agotar reintentos: ${omittedPages.join(', ')}`);
  }

  // Dedup por código (el listado "publicada" cambia entre páginas durante la descarga)
  const seen = new Set();
  const dedupedItems = items.filter(item => {
    if (seen.has(item.codigo)) return false;
    seen.add(item.codigo);
    return true;
  });

  const snapshot = {
    fetchedAt: new Date().toISOString(),
    totalResultados,
    items: dedupedItems,
  };

  const outDir = resolve(ROOT, 'public', 'data');
  mkdirSync(outDir, { recursive: true });
  const outPath = resolve(outDir, 'compra-agil-publicada.json');
  writeFileSync(outPath, JSON.stringify(snapshot));

  console.log(`Listo: ${dedupedItems.length} oportunidades guardadas en ${outPath}`);
}

main().catch(err => {
  console.error('Error al generar el snapshot:', err.message);
  process.exit(1);
});
