/**
 * Proxy para la API del Escritorio de Proveedor de MercadoPúblico
 * ("Procesos en los que participaste").
 *
 * El endpoint vive en AWS API Gateway y solo devuelve CORS para el origin
 * https://proveedor.mercadopublico.cl, además de exigir:
 *   - Authorization: Bearer <JWT>   ← lo aporta el navegador del usuario
 *   - x-api-key: <key del gateway>   ← constante de la app (no es secreto de usuario)
 * Desde GitHub Pages el browser bloquea la petición en el preflight.
 * Este Worker la reenvía server-to-server, fija el Origin/Referer correctos
 * y agrega CORS para tu dominio.
 *
 * IMPORTANTE — privacidad:
 *   El Worker NO almacena ningún token. El JWT viaja en cada petición desde
 *   el navegador del usuario y se descarta al terminar. No hay credenciales
 *   persistidas aquí ni en el repo.
 *
 * Despliegue (Cloudflare Workers, plan gratuito):
 *   1. dash.cloudflare.com → Workers & Pages → Create Worker
 *   2. Nombre: "mp-oportunidades-proxy"
 *   3. "Edit code" → pega este archivo → Deploy
 *   4. Copia la URL pública y ponla como VITE_OPORTUNIDADES_PROXY_URL en .env.local
 *
 * Ruta:
 *   GET /escritorio/oportunidades?plain_mode=false&no_cache=true
 *       (se reenvía tal cual al gateway)
 */

const TARGET_ORIGIN = 'https://ywri2h0ar5.execute-api.us-east-1.amazonaws.com';
const MP_ORIGIN = 'https://proveedor.mercadopublico.cl';
// Clave pública del gateway (igual que USER_KEY en adjunto-proxy: identifica a la app, no al usuario)
const API_KEY = 'e7d3a8f2-5b4d-4b8a-9e8d-3f4e5b8d7a8e';
const ALLOWED_ORIGIN = 'https://bruns123.github.io';
// Solo se permite proxiar rutas del escritorio (evita usarlo como proxy abierto)
const PATH_PREFIX = '/escritorio/';

// Detalle de Compra Ágil (api2): para detectar quién ganó. Ruta: /ca/{codigo}
const CA_ORIGIN = 'https://api2.mercadopublico.cl';
const CA_TICKET = '25D6C503-FA30-48BD-86FA-0A1D74D54254';
const CA_PREFIX = '/ca/';

// Valida que el string sea un access token de proveedor de MercadoPúblico.
function isProviderToken(t) {
  try {
    const p = JSON.parse(atob(t.split('.')[1]));
    return /chilecomprarealm/.test(p.iss || '') && !!p.tipoUsuario;
  } catch { return false; }
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const allowOrigin = origin === ALLOWED_ORIGIN ? origin : ALLOWED_ORIGIN;

    const corsHeaders = {
      'Access-Control-Allow-Origin': allowOrigin,
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type, x-relay-key',
      'Access-Control-Max-Age': '86400',
      'Vary': 'Origin',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    const url = new URL(request.url);
    const json = (obj, status = 200) => new Response(JSON.stringify(obj), {
      status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

    // ─── Relay de token (bookmarklet/dashboard → KV → hermes) ───
    // POST /token: el dashboard sube el token del escritorio (validado como JWT de proveedor).
    // GET  /token: hermes lo baja con la clave secreta (x-relay-key). No es público.
    if (url.pathname === '/token') {
      if (!env || !env.RELAY) return json({ error: 'KV no configurado (bind RELAY).' }, 500);
      if (request.method === 'POST') {
        let body = (await request.text()).trim().replace(/^Bearer\s+/i, '');
        try { const j = JSON.parse(body); if (j && j.token) body = String(j.token).trim(); } catch { /* texto plano */ }
        if (!isProviderToken(body)) return json({ error: 'Token inválido (no es de proveedor MP).' }, 400);
        await env.RELAY.put('escritorio_token', body, { expirationTtl: 30000 }); // ~8.3h
        return json({ ok: true });
      }
      if (request.method === 'GET') {
        if (!env.RELAY_KEY || request.headers.get('x-relay-key') !== env.RELAY_KEY) {
          return json({ error: 'No autorizado.' }, 401);
        }
        const t = await env.RELAY.get('escritorio_token');
        return t ? new Response(t, { status: 200, headers: { ...corsHeaders, 'Content-Type': 'text/plain' } })
                 : json({ error: 'Sin token guardado.' }, 404);
      }
      return json({ error: 'Método no permitido.' }, 405);
    }

    if (request.method !== 'GET') {
      return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });
    }

    // ─── Ruta /ca/{codigo} → detalle de Compra Ágil (api2) para detectar el ganador ───
    if (url.pathname.startsWith(CA_PREFIX)) {
      const codigo = decodeURIComponent(url.pathname.slice(CA_PREFIX.length));
      if (!codigo) {
        return new Response(JSON.stringify({ error: 'Falta el código.' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      try {
        const up = await fetch(`${CA_ORIGIN}/v2/compra-agil/${encodeURIComponent(codigo)}`, {
          headers: { 'ticket': CA_TICKET, 'Accept': 'application/json' },
        });
        const body = await up.text();
        const r = new Response(body, {
          status: up.status,
          headers: { 'Content-Type': up.headers.get('Content-Type') || 'application/json' },
        });
        Object.entries(corsHeaders).forEach(([k, v]) => r.headers.set(k, v));
        return r;
      } catch (err) {
        return new Response(JSON.stringify({ error: 'Fallo al contactar api2', detail: String(err) }), {
          status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    if (!url.pathname.startsWith(PATH_PREFIX)) {
      return new Response('Not Found', { status: 404, headers: corsHeaders });
    }

    const auth = request.headers.get('Authorization');
    if (!auth) {
      return new Response(JSON.stringify({ error: 'Falta el header Authorization (token Bearer).' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const targetUrl = TARGET_ORIGIN + url.pathname + url.search;
    let upstream;
    try {
      upstream = await fetch(targetUrl, {
        method: 'GET',
        headers: {
          'Authorization': auth,
          'x-api-key': API_KEY,
          'Accept': 'application/json, text/plain, */*',
          'Origin': MP_ORIGIN,
          'Referer': MP_ORIGIN + '/',
        },
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: 'Fallo al contactar el gateway', detail: String(err) }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await upstream.text();
    const response = new Response(body, {
      status: upstream.status,
      headers: { 'Content-Type': upstream.headers.get('Content-Type') || 'application/json' },
    });
    Object.entries(corsHeaders).forEach(([k, v]) => response.headers.set(k, v));
    return response;
  },
};
