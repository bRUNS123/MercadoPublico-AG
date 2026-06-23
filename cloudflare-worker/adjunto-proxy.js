/**
 * Proxy para adjunto.mercadopublico.cl (adjuntos de Compra Ágil).
 *
 * adjunto.mercadopublico.cl requiere el header "user_key" y solo devuelve
 * Access-Control-Allow-Origin para el dominio buscador.mercadopublico.cl.
 * Desde GitHub Pages el browser bloquea la petición en el preflight.
 * Este Worker la reenvía server-to-server (sin restricción CORS) y agrega
 * los headers necesarios.
 *
 * Despliegue (Cloudflare Workers, plan gratuito — 100.000 req/día):
 *   1. https://dash.cloudflare.com → Workers & Pages → Create Worker
 *   2. Nombre: "mp-adjunto-proxy" (o el que prefieras)
 *   3. "Edit code" → pega este archivo completo → Deploy
 *   4. Copia la URL pública (ej. https://mp-adjunto-proxy.tuusuario.workers.dev)
 *   5. En el repo define esa URL como VITE_ADJUNTO_PROXY_URL en .env.local
 *      antes de correr `npm run deploy`
 *
 * Rutas disponibles a través del proxy:
 *   GET /listar/{codigo}   → lista de adjuntos con UUIDs
 *   GET /descargar/{uuid}  → binario del archivo
 */

const TARGET = 'https://adjunto.mercadopublico.cl/adjunto-compra-agil';
const USER_KEY = '41186b85826e80d1a0d445a6ce67d1a3';
const ALLOWED_ORIGIN = 'https://bruns123.github.io';

export default {
  async fetch(request) {
    const origin = request.headers.get('Origin') || '';
    const allowOrigin = origin === ALLOWED_ORIGIN ? origin : ALLOWED_ORIGIN;

    const corsHeaders = {
      'Access-Control-Allow-Origin': allowOrigin,
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
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
    const targetUrl = TARGET + url.pathname + url.search;

    const upstream = await fetch(targetUrl, {
      headers: { 'user_key': USER_KEY },
    });

    const response = new Response(upstream.body, {
      status: upstream.status,
      headers: upstream.headers,
    });
    Object.entries(corsHeaders).forEach(([k, v]) => response.headers.set(k, v));
    return response;
  },
};
