// Cliente del Escritorio de Proveedor ("Procesos en los que participaste").
// Llama al Cloudflare Worker (oportunidades-proxy.js), que reenvía a la API
// de AWS con el Origin correcto. El token Bearer lo aporta el usuario y NO se
// commitea ni se guarda en el repo: vive solo en el localStorage del navegador.

const PROXY_URL = import.meta.env.VITE_OPORTUNIDADES_PROXY_URL || '';

const TOKEN_KEY = 'mp_escritorio_token';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY) || '';
}

export function setToken(token) {
  const clean = (token || '').trim().replace(/^Bearer\s+/i, '');
  if (clean) localStorage.setItem(TOKEN_KEY, clean);
  else localStorage.removeItem(TOKEN_KEY);
}

// Decodifica el payload del JWT para mostrar cuándo expira (sin validar firma).
export function tokenInfo(token = getToken()) {
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return {
      exp: payload.exp ? new Date(payload.exp * 1000) : null,
      expirado: payload.exp ? Date.now() > payload.exp * 1000 : false,
      usuario: payload.preferred_username || null,
      organismo: payload.codigoOrganismo || null,
    };
  } catch {
    return null;
  }
}

/**
 * Trae "Procesos en los que participaste" desde el escritorio.
 * @returns {Promise<any>} el JSON crudo de la API (lo normaliza misOfertasAdapter)
 */
export async function fetchOportunidades() {
  if (!PROXY_URL) {
    throw new Error('Falta configurar VITE_OPORTUNIDADES_PROXY_URL (URL del Worker).');
  }
  const token = getToken();
  if (!token) {
    throw new Error('No hay token. Pega tu token Bearer del escritorio para sincronizar.');
  }

  const info = tokenInfo(token);
  if (info?.expirado) {
    throw new Error('Tu token expiró. Inicia sesión en MercadoPúblico y pega uno nuevo.');
  }

  const base = PROXY_URL.replace(/\/$/, '');
  const url = `${base}/escritorio/oportunidades?plain_mode=false&no_cache=true`;

  const res = await fetch(url, {
    headers: { 'Authorization': `Bearer ${token}` },
  });

  if (res.status === 401 || res.status === 403) {
    throw new Error('El servidor rechazó el token (401/403). Probablemente expiró: pega uno nuevo.');
  }
  if (!res.ok) {
    throw new Error(`Error ${res.status} al consultar el escritorio.`);
  }
  return res.json();
}
