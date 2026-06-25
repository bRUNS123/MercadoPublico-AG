// Detalle de Compra Ágil vía el Worker (ruta /ca/{codigo}), para detectar
// quién ganó cada proceso. api2 no manda CORS, por eso pasa por el proxy.

const PROXY_URL = import.meta.env.VITE_OPORTUNIDADES_PROXY_URL || '';

export function normRut(rut) {
  return String(rut || '').replace(/[.\-\s]/g, '').toUpperCase();
}

/**
 * Trae el detalle de una Compra Ágil. Devuelve el payload (con
 * proveedores_cotizando, donde el ganador tiene proveedor_seleccionado=1).
 */
export async function fetchDetalleCA(codigo) {
  if (!PROXY_URL) throw new Error('Falta VITE_OPORTUNIDADES_PROXY_URL.');
  const base = PROXY_URL.replace(/\/$/, '');
  const res = await fetch(`${base}/ca/${encodeURIComponent(codigo)}`);
  if (!res.ok) throw new Error(`Detalle ${codigo}: HTTP ${res.status}`);
  const json = await res.json();
  return json.payload || json;
}

/**
 * A partir del detalle y el RUT propio, determina el resultado y un comentario.
 * @returns {{ resultado: 'adjudicada'|'no_adjudicada'|'', comentario: string, ganador?: object, propio?: object } | null}
 */
export function analizarResultado(detalle, rutPropio) {
  const provs = detalle?.proveedores_cotizando || [];
  if (!provs.length) return null;
  const sel = provs.find(x => x.proveedor_seleccionado);
  const propio = provs.find(x => normRut(x.rut_proveedor) === normRut(rutPropio));
  const fmt = n => '$' + Number(n || 0).toLocaleString('es-CL');

  if (!sel) {
    return { resultado: '', comentario: '', propio };
  }
  const gano = normRut(sel.rut_proveedor) === normRut(rutPropio);
  if (gano) {
    return {
      resultado: 'adjudicada',
      comentario: `🏆 Adjudicado a GEOPRO — ${fmt(sel.monto_total)} (de ${provs.length} oferentes)`,
      ganador: sel, propio,
    };
  }
  return {
    resultado: 'no_adjudicada',
    comentario: `Ganó ${sel.razon_social} (${sel.rut_proveedor}) — ${fmt(sel.monto_total)}`
      + (propio ? ` · Nuestra oferta ${fmt(propio.monto_total)}` : '')
      + ` · ${provs.length} oferentes`,
    ganador: sel, propio,
  };
}
