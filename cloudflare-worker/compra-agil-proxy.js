/**
 * Proxy CORS para la API Compra Ágil v2 (Beta) de ChileCompra.
 *
 * api2.mercadopublico.cl no envía cabeceras Access-Control-Allow-Origin, por lo que
 * el navegador bloquea las peticiones directas desde un sitio estático (GitHub Pages).
 * Este worker reenvía la petición server-to-server (sin restricción CORS) y agrega
 * las cabeceras necesarias para que el navegador acepte la respuesta.
 *
 * Despliegue (Cloudflare Workers, plan gratuito — 100.000 peticiones/día):
 *   1. Crea una cuenta gratuita en https://dash.cloudflare.com/sign-up (sin tarjeta).
 *   2. Workers & Pages → Create → Create Worker → ponle un nombre (ej. "mp-compra-agil-proxy").
 *   3. "Edit code" → reemplaza todo el contenido por este archivo → Deploy.
 *   4. Copia la URL pública (https://<nombre>.<tu-subdominio>.workers.dev).
 *   5. En el repo de LicitaBoard, define VITE_COMPRA_AGIL_PROXY_URL=<esa URL> en .env.local
 *      antes de correr `npm run deploy`.
 *
 * Si publicas LicitaBoard en otro dominio/usuario, cambia ALLOWED_ORIGIN.
 */

const TARGET = 'https://api2.mercadopublico.cl';
const ALLOWED_ORIGIN = 'https://bruns123.github.io';

export default {
  async fetch(request) {
    const origin = request.headers.get('Origin') || '';
    const allowOrigin = origin === ALLOWED_ORIGIN ? origin : ALLOWED_ORIGIN;

    const corsHeaders = {
      'Access-Control-Allow-Origin': allowOrigin,
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'ticket, Content-Type',
      'Access-Control-Max-Age': '86400',
      'Vary': 'Origin',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    if (request.method !== 'GET') {
      return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });
    }

    const url = new URL(request.url);
    const targetUrl = TARGET + url.pathname + url.search;

    const upstream = await fetch(targetUrl, {
      headers: { ticket: request.headers.get('ticket') || '' },
    });

    const response = new Response(upstream.body, upstream);
    Object.entries(corsHeaders).forEach(([key, value]) => response.headers.set(key, value));
    return response;
  },
};
