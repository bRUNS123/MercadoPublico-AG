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

export default {
  async fetch(request) {
    const origin = request.headers.get('Origin') || '';
    const allowOrigin = origin === ALLOWED_ORIGIN ? origin : ALLOWED_ORIGIN;

    const corsHeaders = {
      'Access-Control-Allow-Origin': allowOrigin,
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type',
      'Access-Control-Max-Age': '86400',
      'Vary': 'Origin',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }
    if (request.method !== 'GET') {
      return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });
    }

    const url = new URL(request.url);
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
