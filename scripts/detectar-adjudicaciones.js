// Script standalone (Node) que detecta, para los procesos "con resultados" de
// GEOPRO, si adjudicamos o no, comparando el RUT del proveedor seleccionado
// contra el nuestro. Debe correr desde el notebook (IP chilena): api2 bloquea
// por WAF a IPs no chilenas y no manda CORS, igual que el snapshot.
//
// Uso (dos modos):
//   A) Con token (obtiene la lista del escritorio y luego los detalles):
//      node scripts/detectar-adjudicaciones.js <TOKEN_BEARER> [RUT]
//   B) Con un JSON de procesos ya pegado (Response del escritorio), sin token:
//      node scripts/detectar-adjudicaciones.js --procesos <ruta.json> [RUT]
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
// Ficha del buscador (criterioSeleccion / justificación del comprador). Requiere el token del escritorio.
const CA_FICHA_BASE = 'https://servicios-compra-agil.mercadopublico.cl/v1/compra-agil/solicitud';
const CA_FICHA_ORIGIN = 'https://compra-agil.mercadopublico.cl';
const DELAY_MS = 700;
const MAX_RETRIES = 4;

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
const args = process.argv.slice(2);
function takeFlag(name) { const i = args.indexOf(name); if (i !== -1) { const v = args[i + 1]; args.splice(i, 2); return v; } return null; }
const PROCESOS_FILE = takeFlag('--procesos');
const RUT = (takeFlag('--rut') || env.GEOPRO_RUT || '77.710.202-8').trim();
// Token del escritorio: obtiene la lista (si no hay --procesos) y la justificación del comprador.
const TOKEN = (takeFlag('--token') || (!PROCESOS_FILE ? args[0] : '') || env.ESCRITORIO_TOKEN || env.VITE_ESCRITORIO_TOKEN || '').replace(/^Bearer\s+/i, '').trim();

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
  for (let intento = 1; intento <= MAX_RETRIES; intento++) {
    const res = await fetch(`${CA_BASE}/${encodeURIComponent(codigo)}`, {
      headers: { ticket: CA_TICKET, Accept: 'application/json' },
    });
    if (res.ok) {
      const j = await res.json();
      return j.payload || j;
    }
    // 429 (rate limit) o 5xx → reintenta con backoff
    if ((res.status === 429 || res.status >= 500) && intento < MAX_RETRIES) {
      await sleep(DELAY_MS * (intento + 1));
      continue;
    }
    throw new Error(`Detalle ${codigo}: HTTP ${res.status}`);
  }
}

// Justificación del comprador (criterioSeleccion) desde la ficha del buscador.
async function getJustificacion(codigo) {
  for (let intento = 1; intento <= MAX_RETRIES; intento++) {
    const res = await fetch(`${CA_FICHA_BASE}/${encodeURIComponent(codigo)}?size=20&page=0`, {
      headers: { 'Authorization': `Bearer ${TOKEN}`, 'Origin': CA_FICHA_ORIGIN, 'Referer': CA_FICHA_ORIGIN + '/', 'Accept': 'application/json' },
    });
    if (res.ok) {
      const j = await res.json();
      const p = j.payload || {};
      const sel = (p.ofertasSeleccionadas || [])[0] || (p.ofertas || []).find(x => x.esOfertaSeleccionada);
      return (sel?.criterioSeleccion || '').trim();
    }
    if ((res.status === 429 || res.status >= 500) && intento < MAX_RETRIES) { await sleep(DELAY_MS * (intento + 1)); continue; }
    throw new Error(`Justif ${codigo}: HTTP ${res.status}`);
  }
}

const comentarioDe = x => (x?.descripcion_cotizacion || x?.descripcion || '').trim();

function analizar(detalle, rutPropio) {
  const provs = detalle?.proveedores_cotizando || [];
  if (!provs.length) return null;
  const sel = provs.find(x => x.proveedor_seleccionado);
  const propio = provs.find(x => normRut(x.rut_proveedor) === normRut(rutPropio));
  // Fecha en que aparecieron los resultados (último cambio del proceso adjudicado).
  const fechaResultados = detalle?.fechas?.fecha_ultimo_cambio || '';
  if (!sel) return { resultado: '', comentario: '', fechaResultados };
  const gano = normRut(sel.rut_proveedor) === normRut(rutPropio);
  if (gano) {
    return {
      resultado: 'adjudicada',
      comentario: `🏆 Adjudicado a GEOPRO — ${fmt(sel.monto_total)} (de ${provs.length} oferentes)`,
      ganadorNombre: 'GEOPRO',
      comentarioGanador: comentarioDe(sel),
      comentarioPropio: '',
      fechaResultados,
    };
  }
  return {
    resultado: 'no_adjudicada',
    comentario: `Ganó ${sel.razon_social} (${sel.rut_proveedor}) — ${fmt(sel.monto_total)}`
      + (propio ? ` · Nuestra oferta ${fmt(propio.monto_total)}` : '')
      + ` · ${provs.length} oferentes`,
    ganadorNombre: sel.razon_social,
    comentarioGanador: comentarioDe(sel),
    comentarioPropio: comentarioDe(propio),
    fechaResultados,
  };
}

async function main() {
  let data;
  if (PROCESOS_FILE) {
    data = JSON.parse(readFileSync(resolve(PROCESOS_FILE), 'utf-8'));
    console.log(`Procesos leídos de ${PROCESOS_FILE}`);
  } else {
    if (!TOKEN) {
      console.error('❌ Falta el token o --procesos. Uso:');
      console.error('   node scripts/detectar-adjudicaciones.js <TOKEN> [RUT]');
      console.error('   node scripts/detectar-adjudicaciones.js --procesos <ruta.json> [RUT]');
      process.exit(1);
    }
    console.log('Obteniendo procesos del escritorio…');
    data = await getProcesos();
  }
  console.log(`RUT propio: ${RUT}`);
  const resultados = data.with_results || [];
  console.log(`Procesos con resultados: ${resultados.length}`);

  const items = {};
  let ok = 0, sin = 0, err = 0;
  for (const p of resultados) {
    try {
      const det = await getDetalle(p.codigo);
      const r = analizar(det, RUT);
      if (r && r.resultado) {
        if (TOKEN) {
          try { r.justificacionComprador = await getJustificacion(p.codigo); }
          catch (e) { /* sin justificación (token vencido u otro) */ }
        }
        items[p.codigo] = r;
        ok++;
        console.log(`  ${r.resultado === 'adjudicada' ? '🏆' : '❌'} ${p.codigo} — ${r.comentario}${r.justificacionComprador ? `\n      ⚖️  ${r.justificacionComprador}` : ''}`);
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
