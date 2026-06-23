import { useState, useEffect, useMemo } from 'react';
import StatusBadge from '../Common/StatusBadge';
import { formatMonto, formatFecha, diasRestantes, getTipoNombre, getMontoInteligente, getCategoryMatches } from '../../utils/formatters';
import { MONEDAS, MODALIDADES_PAGO, CATEGORIAS_INTERES, SEGUIMIENTO_ESTADOS } from '../../utils/constants';
import api from '../../api/mercadopublico';
import compraAgilApi from '../../api/compraAgil';
import { adaptCompraAgil } from '../../utils/compraAgilAdapter';
import Loader from '../Common/Loader';
import useFavoritos from '../../hooks/useFavoritos';
import useCategoryVotes from '../../hooks/useCategoryVotes';
import usePatterns from '../../hooks/usePatterns';
import useSeguimiento from '../../hooks/useSeguimiento';

// adjunto.mercadopublico.cl solo permite CORS desde buscador.mercadopublico.cl.
// En producción (GitHub Pages) se necesita un proxy. Si VITE_ADJUNTO_PROXY_URL está
// definida, las peticiones van por ahí sin header (el Worker agrega user_key).
// En dev, se llama directo con el header (Node/Vite dev server no tiene restricción CORS).
const CA_ADJUNTO_DIRECT = 'https://adjunto.mercadopublico.cl/adjunto-compra-agil';
const CA_USER_KEY = '41186b85826e80d1a0d445a6ce67d1a3';
const CA_PROXY = import.meta.env.VITE_ADJUNTO_PROXY_URL || null;
const CA_ADJUNTO_BASE = CA_PROXY || CA_ADJUNTO_DIRECT;

const CATEGORIA_COLORS = {
  construccion: { color: '#f97316', bg: 'rgba(249,115,22,0.15)' },
  ingenieria:   { color: '#3b82f6', bg: 'rgba(59,130,246,0.2)' },
  ito_ite:      { color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' },
  mantencion:   { color: '#14b8a6', bg: 'rgba(20,184,166,0.15)' },
  consultoria:  { color: '#a855f7', bg: 'rgba(168,85,247,0.15)' },
  suministros:  { color: '#94a3b8', bg: 'rgba(148,163,184,0.15)' },
};
const _CAT_FALLBACK = { color: '#64748b', bg: 'rgba(100,116,139,0.15)' };

export default function LicitacionDetail({ licitacion, onClose }) {
  const [l, setL] = useState(licitacion);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [zipping, setZipping] = useState(false);
  const [caAdjuntos, setCaAdjuntos] = useState(null);
  const [loadingCaAdjuntos, setLoadingCaAdjuntos] = useState(false);
  const { favoritos, rateLicitacion } = useFavoritos();
  const { catVotes, voteCategory, getVotes } = useCategoryVotes();
  const { seguimiento, setEstadoSeguimiento } = useSeguimiento();
  const { getScores } = usePatterns(favoritos, catVotes);

  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  useEffect(() => {
    if (!licitacion) return;

    // Compra Ágil: el listado no trae descripción ni productos, hay que pedir el detalle siempre.
    // En producción la API bloquea peticiones no chilenas (CORS) — se muestra lo que ya se tenga guardado.
    if (licitacion._esCompraAgil) {
      if (!import.meta.env.DEV) return;
      setLoading(true);
      setErrorMsg(null);
      compraAgilApi.getCompraAgilPorCodigo(licitacion.CodigoExterno)
        .then(data => {
          if (data?.payload) {
            setL(adaptCompraAgil(data.payload));
          } else {
            setErrorMsg("No se encontró información detallada en la API de Compra Ágil.");
          }
        })
        .catch(err => {
          setErrorMsg(err.message || "Error al obtener detalle.");
        })
        .finally(() => setLoading(false));
      return;
    }

    // Si la licitación ya tiene Items, es probable que ya esté completa
    if (!licitacion.Items && licitacion.CodigoExterno) {
      setLoading(true);
      setErrorMsg(null);
      api.getLicitacionPorCodigo(licitacion.CodigoExterno)
        .then(data => {
          if (data.Listado && data.Listado.length > 0) {
            setL(data.Listado[0]);
          } else {
            setErrorMsg("No se encontró información detallada en la API.");
          }
        })
        .catch(err => {
            setErrorMsg(err.message || "Error al obtener detalle.");
        })
        .finally(() => setLoading(false));
    }
  }, [licitacion]);

  // Compra Ágil: obtener lista de adjuntos con UUIDs reales para descarga directa.
  // Usa proxy si VITE_ADJUNTO_PROXY_URL está configurada (producción), sino directo (dev).
  useEffect(() => {
    if (!licitacion?._esCompraAgil) return;
    setCaAdjuntos(null);
    setLoadingCaAdjuntos(true);
    const fetchHeaders = CA_PROXY ? {} : { 'user_key': CA_USER_KEY };
    fetch(`${CA_ADJUNTO_BASE}/v1/adjuntos-compra-agil/listar/${licitacion.CodigoExterno}`, {
      headers: fetchHeaders,
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        const files = data?.payload?.files || [];
        setCaAdjuntos(files.map(f => ({
          nombre: f.nombreArchivo || 'Documento',
          url: `${CA_ADJUNTO_BASE}/v1/adjuntos-compra-agil/descargar/${f.id}`,
        })));
      })
      .catch(() => setCaAdjuntos([]))
      .finally(() => setLoadingCaAdjuntos(false));
  }, [licitacion?.CodigoExterno, licitacion?._esCompraAgil]);

  const adjuntos = useMemo(() => {
    if (l._esCompraAgil) {
      // Si ya tenemos los UUIDs reales del endpoint /listar, usarlos con descarga directa
      if (caAdjuntos && caAdjuntos.length > 0) {
        return caAdjuntos.map(a => ({ ...a, tipo: '', _needsHeader: true, _esFichaFallback: false }));
      }
      // Fallback: mostrar nombres del snapshot sin URL real
      const docs = l._raw?.documentos || [];
      if (!Array.isArray(docs) || docs.length === 0) return [];
      return docs.map(d => ({
        nombre: d.nombre || `Documento ${d.id}`,
        url: `https://buscador.mercadopublico.cl/ficha?code=${l.CodigoExterno}`,
        tipo: '', _needsHeader: false, _esFichaFallback: true,
      }));
    }
    const raw = l.Adjuntos?.Archivos?.Archivo;
    if (!raw) return [];
    const arr = Array.isArray(raw) ? raw : [raw];
    return arr.map(a => ({
      nombre: a.Nombre || a.NombreArchivo || 'archivo',
      url: a.URL || a.Url || '',
      tipo: a.TipoDocumento || a.Descripcion || '',
      _needsHeader: false, _esFichaFallback: false,
    })).filter(a => a.url);
  }, [l, caAdjuntos]);

  const descargarAdjunto = async (adj) => {
    if (!adj.url) return;
    try {
      const fetchOpts = (adj._needsHeader && !CA_PROXY) ? { headers: { 'user_key': CA_USER_KEY } } : {};
      const res = await fetch(adj.url, fetchOpts);
      if (!res.ok) return;
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = adj.nombre;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);
    } catch (err) {
      console.error('Error al descargar adjunto:', err);
    }
  };

  const descargarZip = async () => {
    if (!adjuntos.length || zipping) return;
    setZipping(true);
    try {
      const { zip, strToU8 } = await import('fflate');
      const seguimientoLabel = seguimiento[l.CodigoExterno]
        ? (SEGUIMIENTO_ESTADOS[seguimiento[l.CodigoExterno].estado]?.label || 'Sin clasificar')
        : 'Sin clasificar';

      const resumen = [
        `Código: ${l.CodigoExterno}`,
        `Nombre: ${l.Nombre || '—'}`,
        `Clasificación: ${seguimientoLabel}`,
        `Estado: ${l.CodigoEstado || '—'}`,
        `Fecha de Cierre: ${l.FechaCierre || '—'}`,
        `Organismo: ${l.Comprador?.NombreOrganismo || '—'}`,
        '',
        `Adjuntos (${adjuntos.length}):`,
        ...adjuntos.map((a, i) => `${i + 1}. ${a.nombre}\n   ${a.url}`),
      ].join('\n');

      const files = { 'resumen.txt': [strToU8(resumen), { level: 1 }] };
      const failed = [];

      const results = await Promise.allSettled(
        adjuntos.map(async (adj) => {
          const fetchOpts = (adj._needsHeader && !CA_PROXY)
            ? { headers: { 'user_key': CA_USER_KEY } }
            : {};
          const res = await fetch(adj.url, fetchOpts);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const buf = await res.arrayBuffer();
          return { nombre: adj.nombre, data: new Uint8Array(buf) };
        })
      );

      results.forEach((r, i) => {
        if (r.status === 'fulfilled') {
          files[r.value.nombre] = [r.value.data, { level: 0 }];
        } else {
          failed.push(`${adjuntos[i].nombre}\n   ${adjuntos[i].url}`);
        }
      });

      if (failed.length > 0) {
        const nota = `Archivos no descargados automáticamente (restricción CORS del servidor).\nPuedes abrirlos manualmente copiando cada URL en el navegador:\n\n${failed.join('\n\n')}`;
        files['descargar_manualmente.txt'] = [strToU8(nota), { level: 1 }];
      }

      const zipped = await new Promise((resolve, reject) => {
        zip(files, (err, data) => err ? reject(err) : resolve(data));
      });

      const blob = new Blob([zipped], { type: 'application/zip' });
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      const safeName = `${l.CodigoExterno} - ${(l.Nombre || '').replace(/[<>:"/\\|?*]/g, '_').slice(0, 60)}`;
      a.download = `${safeName}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);
    } catch (err) {
      console.error('Error al generar ZIP:', err);
    } finally {
      setZipping(false);
    }
  };

  if (!l) return null;

  const dias = diasRestantes(l.FechaCierre);
  const monto = getMontoInteligente(l);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flex: 1, paddingRight: 16 }}>
            <div>
              <div style={{ fontSize: '0.78rem', color: 'var(--accent-primary)', fontFamily: 'monospace', marginBottom: 6 }}>
                {l.CodigoExterno}
              </div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.4 }}>
                {l.Nombre}
              </h2>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: 1 }}>PUNTUACIÓN</span>
              <select
                value={favoritos[l.CodigoExterno]?.rating || 0}
                onChange={(e) => rateLicitacion(l, e.target.value)}
                style={{
                  background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
                  fontSize: '1.4rem', height: 48, borderRadius: '8px',
                  cursor: 'pointer', padding: '0 12px', fontWeight: 'bold',
                  color: favoritos[l.CodigoExterno]?.rating >= 7 ? 'var(--success)' : 'var(--text-primary)',
                  boxShadow: favoritos[l.CodigoExterno] ? '0 0 10px rgba(16,185,129,0.2)' : 'none',
                  outline: 'none'
                }}
              >
                <option value="0">Ninguna</option>
                {[...Array(10)].map((_, i) => (
                  <option key={10-i} value={10-i}>{10 - i} ⭐</option>
                ))}
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: 1 }}>SEGUIMIENTO</span>
              <select
                value={seguimiento[l.CodigoExterno]?.estado || ''}
                onChange={(e) => setEstadoSeguimiento(l, e.target.value)}
                style={{
                  background: seguimiento[l.CodigoExterno] ? SEGUIMIENTO_ESTADOS[seguimiento[l.CodigoExterno].estado]?.bg : 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  fontSize: '0.95rem', height: 48, borderRadius: '8px',
                  cursor: 'pointer', padding: '0 12px', fontWeight: 'bold',
                  color: seguimiento[l.CodigoExterno] ? SEGUIMIENTO_ESTADOS[seguimiento[l.CodigoExterno].estado]?.color : 'var(--text-primary)',
                  outline: 'none'
                }}
              >
                <option value="">Sin clasificar</option>
                {Object.entries(SEGUIMIENTO_ESTADOS).map(([id, cfg]) => (
                  <option key={id} value={id}>{cfg.icon} {cfg.label}</option>
                ))}
              </select>
            </div>
          </div>
          <button className="modal-close" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div className="modal-body">
          {errorMsg && (
            <div className="error-banner" style={{ marginBottom: 20 }}>
              ⚠️ {errorMsg}
            </div>
          )}
          
          {loading ? (
            <div style={{ padding: '40px 0' }}>
              <Loader text="Cargando detalles de la licitación..." />
            </div>
          ) : (
            <>
              {/* Estado y tipo */}
              <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
                <StatusBadge codigo={l.CodigoEstado} />
                {l.Tipo && (
                  <span className="status-badge" style={{ background: 'rgba(139,92,246,0.15)', color: '#a78bfa' }}>
                    {l.Tipo} — {getTipoNombre(l.Tipo)}
                  </span>
                )}
              </div>

          {/* Grid de información */}
          <div className="detail-grid">
            <div className="detail-field">
              <span className="detail-label">Fecha de Cierre</span>
              <span className="detail-value">{formatFecha(l.FechaCierre)}</span>
            </div>
            <div className="detail-field">
              <span className="detail-label">Días Restantes</span>
              <span className="detail-value" style={{
                color: dias === 0 ? 'var(--text-muted)' : dias <= 2 ? 'var(--danger)' : dias <= 5 ? 'var(--warning)' : 'var(--success)',
                fontWeight: 700
              }}>
                {dias !== null ? (dias === 0 ? 'Cerrado' : `${dias} días`) : '—'}
              </span>
            </div>
            <div className="detail-field">
              <span className="detail-label">Monto Estimado {monto.isRange ? '(rango aprox.)' : ''}</span>
              <span className="detail-value" style={{ fontWeight: 700, fontSize: '1.1rem' }}>
                {monto.display}
              </span>
              {monto.tooltip && (
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>
                  {monto.tooltip}
                </span>
              )}
            </div>
            <div className="detail-field">
              <span className="detail-label">Moneda</span>
              <span className="detail-value">{MONEDAS[l.Moneda]?.nombre || l.Moneda || '—'}</span>
              {monto.monedaOriginal && monto.monedaOriginal !== 'CLP' && !monto.isRange && (
                <span style={{ fontSize: '0.75rem', color: 'var(--accent-primary)', marginTop: 2 }}>
                  Original: {formatMonto(l.MontoEstimado, l.Moneda)}
                </span>
              )}
            </div>
            <div className="detail-field">
              <span className="detail-label">Fecha de Publicación</span>
              <span className="detail-value">{formatFecha(l.FechaPublicacion) || '—'}</span>
            </div>
            <div className="detail-field">
              <span className="detail-label">Modalidad de Pago</span>
              <span className="detail-value">{MODALIDADES_PAGO[l.CodigoModalidadPago] || l.ModalidadPago || '—'}</span>
            </div>
          </div>

          {/* Descripción */}
          {l.Descripcion && (
            <div className="detail-section">
              <div className="detail-section-title">📝 Descripción</div>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                {l.Descripcion}
              </p>
            </div>
          )}

          {/* Clasificación colaborativa */}
          {(() => {
            const autoMatches = getCategoryMatches(l);
            const communityScores = getScores(l);
            return (
              <div className="detail-section">
                <div className="detail-section-title">🏷️ Clasificación de Categorías</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                  {CATEGORIAS_INTERES.map(cat => {
                    const autoMatch = autoMatches.find(m => m.id === cat.id);
                    const cs = communityScores[cat.id];
                    const votes = getVotes(l.CodigoExterno, cat.id);
                    const c = CATEGORIA_COLORS[cat.id] || _CAT_FALLBACK;
                    const isIng = cat.id === 'ingenieria';
                    const isRelevant = autoMatch || votes.total > 0 || cs;
                    return (
                      <div key={cat.id} style={{
                        padding: '10px 14px', borderRadius: 10, minWidth: 148,
                        background: votes.myVote ? c.bg : 'var(--bg-tertiary)',
                        border: `1px solid ${votes.myVote ? c.color : isRelevant ? c.color + '55' : 'var(--border-color)'}`,
                        display: 'flex', flexDirection: 'column', gap: 6,
                        opacity: isRelevant ? 1 : 0.5,
                      }}>
                        <div style={{ fontWeight: isIng ? 700 : 600, fontSize: '0.82rem', color: c.color }}>
                          {isIng ? '★ ' : ''}{cat.label}
                        </div>
                        {cs && (
                          <div style={{ fontSize: '0.72rem', color: c.color, fontWeight: 600 }}>
                            ↑ Comunidad: {cs.score}% <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>({cs.sampleSize} ej.)</span>
                          </div>
                        )}
                        {autoMatch && (
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            Auto: {autoMatch.score}% coincidencia
                          </div>
                        )}
                        {!autoMatch && !cs && (
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            Sin detección automática
                          </div>
                        )}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <button
                            onClick={() => voteCategory(l.CodigoExterno, cat.id)}
                            style={{
                              padding: '3px 10px', borderRadius: 6, cursor: 'pointer',
                              fontSize: '0.75rem', fontWeight: 700, border: 'none',
                              background: votes.myVote ? c.color : 'var(--bg-secondary)',
                              color: votes.myVote ? '#fff' : 'var(--text-secondary)',
                            }}
                          >
                            {votes.myVote ? '✓ Confirmada' : 'Confirmar'}
                          </button>
                          {votes.confirmed > 0 && (
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                              {votes.confirmed}/{votes.total} votos
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* Comprador */}
          {l.Comprador && (
            <div className="detail-section">
              <div className="detail-section-title">🏛️ Organismo Comprador</div>
              <div className="detail-grid">
                <div className="detail-field">
                  <span className="detail-label">Nombre</span>
                  <span className="detail-value">{l.Comprador.NombreOrganismo || '—'}</span>
                </div>
                <div className="detail-field">
                  <span className="detail-label">Unidad</span>
                  <span className="detail-value">{l.Comprador.NombreUnidad || '—'}</span>
                </div>
                <div className="detail-field">
                  <span className="detail-label">RUT</span>
                  <span className="detail-value">{l.Comprador.RutUnidad || '—'}</span>
                </div>
                <div className="detail-field">
                  <span className="detail-label">Región</span>
                  <span className="detail-value">{l.Comprador.RegionUnidad || '—'}</span>
                </div>
                <div className="detail-field">
                  <span className="detail-label">Comuna</span>
                  <span className="detail-value">{l.Comprador.ComunaUnidad || '—'}</span>
                </div>
              </div>
            </div>
          )}

          {/* Items */}
          {l.Items?.Listado && l.Items.Listado.length > 0 && (
            <div className="detail-section">
              <div className="detail-section-title">📦 Items ({l.Items.Listado.length})</div>
              <table style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th style={{ fontSize: '0.72rem' }}>#</th>
                    <th style={{ fontSize: '0.72rem' }}>Producto</th>
                    <th style={{ fontSize: '0.72rem' }}>Categoría</th>
                    <th style={{ fontSize: '0.72rem' }}>Cant.</th>
                  </tr>
                </thead>
                <tbody>
                  {l.Items.Listado.map((item, i) => (
                    <tr key={i}>
                      <td style={{ fontSize: '0.82rem' }}>{item.Correlativo || i + 1}</td>
                      <td style={{ fontSize: '0.82rem', color: 'var(--text-primary)' }}>{item.NombreProducto || item.Descripcion || '—'}</td>
                      <td style={{ fontSize: '0.78rem' }}>{item.CodigoCategoria || '—'}</td>
                      <td style={{ fontSize: '0.82rem' }}>{item.Cantidad || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Adjuntos */}
          {(loadingCaAdjuntos || adjuntos.length > 0) && (() => {
            const esFallback = !loadingCaAdjuntos && adjuntos[0]?._esFichaFallback;
            const tieneDescargaReal = !loadingCaAdjuntos && !esFallback && adjuntos.length > 0;
            return (
              <div className="detail-section">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div className="detail-section-title" style={{ marginBottom: 0 }}>
                    📎 Adjuntos {!loadingCaAdjuntos && `(${adjuntos.length})`}
                  </div>
                  {tieneDescargaReal && (
                    <button
                      onClick={descargarZip}
                      disabled={zipping}
                      style={{
                        fontSize: '0.78rem', padding: '5px 14px', borderRadius: 8,
                        cursor: zipping ? 'default' : 'pointer',
                        border: '1px solid var(--border-color)',
                        background: zipping ? 'var(--bg-secondary)' : 'var(--bg-tertiary)',
                        color: zipping ? 'var(--text-muted)' : 'var(--text-primary)',
                        display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap',
                      }}
                      title="Descargar todos los adjuntos en un archivo ZIP"
                    >
                      {zipping ? '⏳ Preparando...' : '📦 Descargar todos (.zip)'}
                    </button>
                  )}
                  {esFallback && (
                    <a
                      href={`https://buscador.mercadopublico.cl/ficha?code=${l.CodigoExterno}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        fontSize: '0.78rem', padding: '5px 14px', borderRadius: 8,
                        border: '1px solid var(--border-color)', color: 'var(--accent-primary)',
                        background: 'var(--bg-tertiary)', textDecoration: 'none', whiteSpace: 'nowrap',
                      }}
                    >
                      ↗ Abrir en MercadoPúblico
                    </a>
                  )}
                </div>
                {loadingCaAdjuntos ? (
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', padding: '8px 0' }}>
                    ⏳ Cargando adjuntos...
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {adjuntos.map((adj, i) => {
                      const isPDF = /\.pdf$/i.test(adj.nombre);
                      const isImg = /\.(jpe?g|png|gif|webp|bmp)$/i.test(adj.nombre);
                      const icon = isPDF ? '📄' : isImg ? '🖼️' : '📎';
                      return (
                        <div key={i} style={{
                          display: 'flex', alignItems: 'center', gap: 10, padding: '7px 12px',
                          background: 'var(--bg-tertiary)', borderRadius: 8,
                          border: '1px solid var(--border-color)', fontSize: '0.83rem',
                        }}>
                          <span style={{ fontSize: '1rem', flexShrink: 0 }}>{icon}</span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {adj.nombre}
                            </div>
                            {adj.tipo && (
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 1 }}>{adj.tipo}</div>
                            )}
                          </div>
                          {adj._needsHeader ? (
                            <button
                              onClick={() => descargarAdjunto(adj)}
                              style={{
                                fontSize: '0.75rem', padding: '3px 10px', borderRadius: 6, flexShrink: 0,
                                border: '1px solid var(--border-color)', color: 'var(--accent-primary)',
                                background: 'var(--bg-secondary)', cursor: 'pointer', whiteSpace: 'nowrap',
                              }}
                            >
                              ↓ Descargar
                            </button>
                          ) : !esFallback ? (
                            <a
                              href={adj.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                fontSize: '0.75rem', padding: '3px 10px', borderRadius: 6, flexShrink: 0,
                                border: '1px solid var(--border-color)', color: 'var(--accent-primary)',
                                background: 'var(--bg-secondary)', textDecoration: 'none', whiteSpace: 'nowrap',
                              }}
                            >
                              ↗ Abrir
                            </a>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                )}
                {esFallback && (
                  <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)', marginTop: 8 }}>
                    No se pudo obtener la URL de descarga directa — usa el botón de arriba para verlos en MercadoPúblico.
                  </div>
                )}
              </div>
            );
          })()}

          {/* Link a MercadoPúblico */}
          {!l._esCompraAgil ? (
            <div className="detail-section" style={{ textAlign: 'center' }}>
              <a
                href={`https://www.mercadopublico.cl/Procurement/Modules/RFB/DetailsAcquisition.aspx?idlicitacion=${l.CodigoExterno}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary"
              >
                🌐 Ver en MercadoPúblico
              </a>
            </div>
          ) : (
            <div className="detail-section" style={{ textAlign: 'center' }}>
              <a
                href={`https://buscador.mercadopublico.cl/ficha?code=${l.CodigoExterno}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary"
              >
                🌐 Ver en MercadoPúblico
              </a>
            </div>
          )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
