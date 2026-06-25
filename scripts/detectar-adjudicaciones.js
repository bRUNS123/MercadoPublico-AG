// Script standalone (Node) que detecta, para los procesos "con resultados" de
// GEOPRO, si adjudicamos o no, comparando el RUT del proveedor seleccionado
// contra el nuestro. Debe correr desde el notebook (IP chilena): api2 bloquea
// por WAF a IPs no chilenas y no manda CORS, igual que el snapshot.
//
// Uso:
//   node scripts/detectar-adjudicaciones.js <TOKEN_BEARER> [RUT]
//   (o define ESCRITORIO_TOKEN y GEOPRO_RUT en .env.local)
//
// Genera public/data/mis-adjudicaciones.json, que el dashboard lee y fusiona.

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const ESCRITORIO_URL = 'https://ywri2h0ar5.execute-api.us-east-1.amazonaws.com/escritorio/oportunidades?plain_mode=false&no_cache=true';
const ESCRITORIO_APIKEY = 'e7d3a8f2-5b4d-4b8a-9e8d-3f4e5b8d7a8e';
const MP_ORIGIN = 'https://proveedor.mercadopublico.cl';
const CA_BASE = 'https://api2.mercadopublico.cl/v2/compra-agil';
const CA_TICKET = '25D6C503-FA30-48BD-86FA-0A1D74D54254';
const DELAY_MS = 300;

function loadEnvLocal() {
  const env = {};
  try {
    const content = readFileSync(resolve(ROOT, '.env.local'), 'utf-8');
    for (const line of content.split('\n')) {
      const t = line.trim();
      if (!t || t.startsWith('#')) continue;
      const eq = t.indexOf('=');
      if (eq === -1) continue;
      env[t.slice(0, eq).trim()] = t.slice(eq + 1).trim();
    }
  } catch { /* sin .env.local */ }
  return env;
}

const env = loadEnvLocal();
const TOKEN = (process.argv[2] || env.ESCRITORIO_TOKEN || env.VITE_ESCRITORIO_TOKEN || '').replace(/^Bearer\s+/i, '').trim();
const RUT = (process.argv[3] || env.GEOPRO_RUT || '77.710.202-8').trim();

const sleep = ms => new Promise(r => setTimeout(r, ms));
const normRut = r => String(r || '').replace(/[.\-\s]/g, '').toUpperCase();
const fmt = n => '$' + Number(n || 0).toLocaleString('es-CL');

async function getProcesos() {
  const res = await fetch(ESCRITORIO_URL, {
    headers: {
      'Authorization': `Bearer ${TOKEN}`,
      'x-api-key': ESCRITORIO_APIKEY,
      'Accept': 'application/json',
      'Origin': MP_ORIGIN,
      'Referer': MP_ORIGIN + '/',
    },
  });
  if (!res.ok) throw new Error(`Escritorio HTTP ${res.status} (¿token expirado?)`);
  return res.json();
}

async function getDetalle(codigo) {
  const res = await fetch(`${CA_BASE}/${encodeURIComponent(codigo)}`, {
    headers: { ticket: CA_TICKET, Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`Detalle ${codigo}: HTTP ${res.status}`);
  const j = await res.json();
  return j.payload || j;
}

function analizar(detalle, rutPropio) {
  const provs = detalle?.proveedores_cotizando || [];
  if (!provs.length) return null;
  const sel = provs.find(x => x.proveedor_seleccionado);
  const propio = provs.find(x => normRut(x.rut_proveedor) === normRut(rutPropio));
  if (!sel) return { resultado: '', comentario: '' };
  const gano = normRut(sel.rut_proveedor) === normRut(rutPropio);
  if (gano) {
    return {
      resultado: 'adjudicada',
      comentario: `🏆 Adjudicado a GEOPRO — ${fmt(sel.monto_total)} (de ${provs.length} oferentes)`,
    };
  }
  return {
    resultado: 'no_adjudicada',
    comentario: `Ganó ${sel.razon_social} (${sel.rut_proveedor}) — ${fmt(sel.monto_total)}`
      + (propio ? ` · Nuestra oferta ${fmt(propio.monto_total)}` : '')
      + ` · ${provs.length} oferentes`,
  };
}

async function main() {
  if (!TOKEN) {
    console.error('❌ Falta el token. Uso: node scripts/detectar-adjudicaciones.js <TOKEN> [RUT]');
    console.error('   (o define ESCRITORIO_TOKEN en .env.local). El token sale del escritorio y caduca ~8h.');
    process.exit(1);
  }
  console.log(`RUT propio: ${RUT}`);
  console.log('Obteniendo procesos del escritorio…');
  const data = await getProcesos();
  const resultados = data.with_results || [];
  console.log(`Procesos con resultados: ${resultados.length}`);

  const items = {};
  let ok = 0, sin = 0, err = 0;
  for (const p of resultados) {
    try {
      const det = await getDetalle(p.codigo);
      const r = analizar(det, RUT);
      if (r && r.resultado) {
        items[p.codigo] = r;
        ok++;
        console.log(`  ${r.resultado === 'adjudicada' ? '🏆' : '❌'} ${p.codigo} — ${r.comentario}`);
      } else {
        sin++;
      }
    } catch (e) {
      err++;
      console.log(`  ⚠️  ${p.codigo}: ${e.message}`);
    }
    await sleep(DELAY_MS);
  }

  const out = { generadoEl: new Date().toISOString(), rut: RUT, items };
  mkdirSync(resolve(ROOT, 'public/data'), { recursive: true });
  writeFileSync(resolve(ROOT, 'public/data/mis-adjudicaciones.json'), JSON.stringify(out, null, 2), 'utf-8');
  console.log(`\nListo: ${ok} adjudicaciones (${sin} sin resultado, ${err} con error) → public/data/mis-adjudicaciones.json`);
}

main().catch(e => { console.error('Error:', e.message); process.exit(1); });
