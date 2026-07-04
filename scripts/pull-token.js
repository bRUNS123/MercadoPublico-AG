// Baja el token del escritorio desde el relay del Worker (KV) y lo guarda en
// scripts/.escritorio-token, para que la detección de adjudicaciones lo use.
// Lo corre hermes antes de detectar. La clave secreta (x-relay-key) va en
// scripts/.relay-key (gitignored) y DEBE coincidir con el secret RELAY_KEY del Worker.
//
// Uso: node scripts/pull-token.js

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

function readFirstLine(path) {
  try { return readFileSync(path, 'utf-8').split('\n')[0].trim(); } catch { return ''; }
}
function envLocal(key) {
  try {
    for (const line of readFileSync(resolve(ROOT, '.env.local'), 'utf-8').split('\n')) {
      const t = line.trim(); if (!t || t.startsWith('#')) continue;
      const i = t.indexOf('='); if (i === -1) continue;
      if (t.slice(0, i).trim() === key) return t.slice(i + 1).trim();
    }
  } catch { /* no .env.local */ }
  return '';
}

const PROXY = (process.env.VITE_OPORTUNIDADES_PROXY_URL || envLocal('VITE_OPORTUNIDADES_PROXY_URL')
  || 'https://mp-oportunidades-proxy.bfrancosentis.workers.dev').replace(/\/$/, '');
const KEY = process.env.RELAY_KEY || readFirstLine(resolve(__dirname, '.relay-key'));

function noExpirado(t) {
  try {
    const p = JSON.parse(Buffer.from(t.split('.')[1], 'base64').toString('utf-8'));
    return p.exp ? Date.now() < p.exp * 1000 : true;
  } catch { return false; }
}

async function main() {
  if (!KEY) { console.error('Sin clave: crea scripts/.relay-key con la misma clave del secret RELAY_KEY.'); process.exit(1); }
  const res = await fetch(`${PROXY}/token`, { headers: { 'x-relay-key': KEY } });
  if (res.status === 404) { console.log('Relay sin token guardado (nadie sincronizó aún).'); process.exit(0); }
  if (!res.ok) { console.error(`Relay respondió HTTP ${res.status}.`); process.exit(1); }
  const token = (await res.text()).trim();
  if (!noExpirado(token)) { console.log('El token del relay está expirado; no se escribe.'); process.exit(0); }
  writeFileSync(resolve(__dirname, '.escritorio-token'), token, 'utf-8');
  console.log('Token bajado del relay → scripts/.escritorio-token');
}

main().catch(e => { console.error('Error:', e.message); process.exit(1); });
