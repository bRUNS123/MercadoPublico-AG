import { useState, useMemo } from 'react';
import Header from '../components/Layout/Header';
import useMisOfertas from '../hooks/useMisOfertas';
import { OFERTA_ESTADOS, parseMisOfertas } from '../utils/misOfertasAdapter';
import { formatFechaCorta, formatMonto, truncate } from '../utils/formatters';

const FILTER_ALL = '__all__';

function EstadoOfertaBadge({ estado }) {
  const cfg = OFERTA_ESTADOS[estado] || OFERTA_ESTADOS.desconocido;
  return (
    <span className="status-badge" style={{ background: cfg.bg, color: cfg.color }}>
      <span className="status-dot" style={{ background: cfg.color }}></span>
      {cfg.icon} {cfg.label}
    </span>
  );
}

export default function MiMercadoPublicoPage() {
  const { ofertas, meta, importarOfertas, fusionarOfertas, limpiar, setEmpresa } = useMisOfertas();
  const [filterEstado, setFilterEstado] = useState(FILTER_ALL);
  const [showImport, setShowImport] = useState(false);
  const [showGuia, setShowGuia] = useState(false);
  const [pegado, setPegado] = useState('');
  const [importError, setImportError] = useState('');
  const [modoFusion, setModoFusion] = useState(false);

  const counts = useMemo(() => {
    const c = {};
    Object.keys(OFERTA_ESTADOS).forEach(k => { c[k] = 0; });
    ofertas.forEach(o => { c[o.estadoOferta] = (c[o.estadoOferta] || 0) + 1; });
    return c;
  }, [ofertas]);

  const filtered = useMemo(() => {
    if (filterEstado === FILTER_ALL) return ofertas;
    return ofertas.filter(o => o.estadoOferta === filterEstado);
  }, [ofertas, filterEstado]);

  const adjudicadas = counts.adjudicada || 0;
  const enJuego = (counts.enviada || 0) + (counts.en_evaluacion || 0);
  const montoAdjudicado = useMemo(() =>
    ofertas
      .filter(o => o.estadoOferta === 'adjudicada' && o.monto)
      .reduce((s, o) => s + o.monto, 0),
    [ofertas]);

  function handleImport() {
    const res = parseMisOfertas(pegado);
    if (!res.ok) { setImportError(res.error); return; }
    if (modoFusion) fusionarOfertas(res.ofertas);
    else importarOfertas(res.ofertas);
    setPegado('');
    setImportError('');
    setShowImport(false);
  }

  const estadosUsados = Object.keys(OFERTA_ESTADOS).filter(k => counts[k] > 0);

  return (
    <>
      <Header
        title="Mi MercadoPúblico"
        subtitle={`${meta.empresa} · ${ofertas.length} oferta${ofertas.length !== 1 ? 's' : ''}${meta.actualizado ? ` · Actualizado ${formatFechaCorta(meta.actualizado)}` : ''}`}
      />

      <div className="app-content page-enter">
        {/* ─── Barra de acciones ─── */}
        <div style={{ padding: '0 24px', marginBottom: 16, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <button onClick={() => setShowImport(true)} className="btn-primary"
            style={{ fontSize: '0.85rem', padding: '7px 16px', borderRadius: 10, cursor: 'pointer', border: 'none', background: 'var(--accent-primary)', color: '#fff', fontWeight: 600 }}>
            ⬆️ Importar / Actualizar datos
          </button>
          <button onClick={() => setShowGuia(g => !g)}
            style={{ fontSize: '0.85rem', padding: '7px 16px', borderRadius: 10, cursor: 'pointer', border: '1px solid var(--border-color)', background: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}>
            ❓ ¿Cómo obtengo mis datos?
          </button>
          <input
            value={meta.empresa}
            onChange={e => setEmpresa(e.target.value)}
            title="Nombre de tu empresa"
            style={{ fontSize: '0.85rem', padding: '7px 12px', borderRadius: 10, border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', maxWidth: 160 }}
          />
          {ofertas.length > 0 && (
            <button onClick={() => { if (confirm('¿Borrar todas las ofertas guardadas en este navegador?')) limpiar(); }}
              style={{ fontSize: '0.85rem', padding: '7px 16px', borderRadius: 10, cursor: 'pointer', border: '1px solid var(--border-color)', background: 'var(--bg-tertiary)', color: 'var(--danger, #ef4444)', marginLeft: 'auto' }}>
              🗑️ Limpiar
            </button>
          )}
        </div>

        {/* ─── Guía de captura ─── */}
        {showGuia && (
          <div style={{ padding: '0 24px', marginBottom: 16 }}>
            <div className="table-container" style={{ padding: 20, fontSize: '0.9rem', lineHeight: 1.6 }}>
              <strong>Cómo traer tus ofertas de GEOPRO (sin compartir tu clave):</strong>
              <ol style={{ margin: '12px 0 0', paddingLeft: 20, color: 'var(--text-muted)' }}>
                <li>Inicia sesión normal en <code>mercadopublico.cl</code> con tu Clave Única (incluye el código por email).</li>
                <li>Entra a <strong>Escritorio de Proveedor → Mis ofertas / Mis licitaciones</strong>.</li>
                <li>Abre las herramientas de desarrollador (<code>F12</code>) y ve a la pestaña <strong>Network</strong>.</li>
                <li>Recarga o navega a la lista de ofertas. Busca la petición (XHR/Fetch) que devuelve tus ofertas en formato JSON.</li>
                <li>Click derecho sobre ella → <strong>Copy → Copy Response</strong>.</li>
                <li>Vuelve aquí, pulsa <strong>Importar</strong> y pega el contenido. Se guarda solo en este navegador.</li>
              </ol>
              <div style={{ marginTop: 12, fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                🔒 Tus datos no salen de tu equipo: se guardan en el almacenamiento local del navegador, no se suben a Firebase ni se comparten.
                Cuando me pases una de esas respuestas (cURL), automatizamos esta actualización vía el Worker.
              </div>
            </div>
          </div>
        )}

        {/* ─── KPIs ─── */}
        {ofertas.length > 0 && (
          <div className="kpi-grid" style={{ padding: '0 24px' }}>
            <div className="kpi-card">
              <div className="kpi-icon" style={{ background: 'rgba(14,165,233,0.15)' }}>📊</div>
              <div className="kpi-label">Total ofertas</div>
              <div className="kpi-value">{ofertas.length}</div>
              <div className="kpi-detail">licitaciones donde participaste</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-icon" style={{ background: 'rgba(234,179,8,0.15)' }}>🔄</div>
              <div className="kpi-label">En juego</div>
              <div className="kpi-value">{enJuego}</div>
              <div className="kpi-detail">enviadas + en evaluación</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-icon" style={{ background: 'rgba(34,197,94,0.15)' }}>🏆</div>
              <div className="kpi-label">Adjudicadas</div>
              <div className="kpi-value">{adjudicadas}</div>
              <div className="kpi-detail">{ofertas.length > 0 ? `${((adjudicadas / ofertas.length) * 100).toFixed(0)}% tasa de éxito` : '—'}</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-icon" style={{ background: 'rgba(59,130,246,0.15)' }}>💰</div>
              <div className="kpi-label">Monto adjudicado</div>
              <div className="kpi-value">{montoAdjudicado > 0 ? formatMonto(montoAdjudicado, 'CLP') : '—'}</div>
              <div className="kpi-detail">suma de ofertas ganadas</div>
            </div>
          </div>
        )}

        {/* ─── Filtros por estado de oferta ─── */}
        {ofertas.length > 0 && (
          <div style={{ padding: '0 24px', margin: '8px 0 16px', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button onClick={() => setFilterEstado(FILTER_ALL)}
              style={{ fontSize: '0.8rem', padding: '5px 14px', borderRadius: 10, cursor: 'pointer', border: '1px solid var(--border-color)', background: filterEstado === FILTER_ALL ? 'var(--accent-primary)' : 'var(--bg-tertiary)', color: filterEstado === FILTER_ALL ? '#fff' : 'var(--text-muted)', fontWeight: filterEstado === FILTER_ALL ? 700 : 400 }}>
              Todas ({ofertas.length})
            </button>
            {estadosUsados.map(k => {
              const cfg = OFERTA_ESTADOS[k];
              const active = filterEstado === k;
              return (
                <button key={k} onClick={() => setFilterEstado(active ? FILTER_ALL : k)}
                  style={{ fontSize: '0.8rem', padding: '5px 14px', borderRadius: 10, cursor: 'pointer', border: `1px solid ${active ? cfg.color : 'var(--border-color)'}`, background: active ? cfg.bg : 'var(--bg-tertiary)', color: active ? cfg.color : 'var(--text-muted)', fontWeight: active ? 700 : 400 }}>
                  {cfg.icon} {cfg.label} ({counts[k]})
                </button>
              );
            })}
          </div>
        )}

        {/* ─── Tabla / Vacío ─── */}
        {ofertas.length === 0 ? (
          <div className="table-container">
            <div className="empty-state">
              <div className="empty-icon">🏛️</div>
              <div className="empty-title">Aún no has importado tus ofertas</div>
              <div className="empty-desc">
                Pulsa <strong>Importar / Actualizar datos</strong> y pega la respuesta de tu panel de proveedor.
                Usa <strong>¿Cómo obtengo mis datos?</strong> para el paso a paso.
              </div>
            </div>
          </div>
        ) : (
          <div className="table-container">
            <div className="table-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div className="table-title">Mis licitaciones — {meta.empresa}</div>
                <div className="table-count">{filtered.length} resultados</div>
              </div>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>Código</th>
                    <th>Nombre</th>
                    <th>Organismo</th>
                    <th>Estado oferta</th>
                    <th>Cierre</th>
                    <th>Monto ofertado</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(o => (
                    <tr key={o._id}>
                      <td className="td-code">
                        {o.codigo !== '—' ? (
                          <a href={`https://www.mercadopublico.cl/Procurement/Modules/RFB/DetailsAcquisition.aspx?qs=${o.codigo}`}
                             target="_blank" rel="noreferrer" style={{ color: 'var(--accent-primary)' }}>
                            {o.codigo}
                          </a>
                        ) : '—'}
                      </td>
                      <td className="td-name">{truncate(o.nombre, 65)}</td>
                      <td style={{ fontSize: '0.8rem' }}>{truncate(o.organismo, 40)}</td>
                      <td><EstadoOfertaBadge estado={o.estadoOferta} /></td>
                      <td className="td-fecha">{o.fechaCierre ? formatFechaCorta(o.fechaCierre) : '—'}</td>
                      <td className="td-monto">{o.monto ? formatMonto(o.monto, o.moneda) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ─── Modal de importación ─── */}
        {showImport && (
          <div onClick={() => setShowImport(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
            <div onClick={e => e.stopPropagation()}
              style={{ background: 'var(--bg-secondary)', borderRadius: 14, border: '1px solid var(--border-color)', padding: 24, width: 'min(640px, 100%)', maxHeight: '90vh', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <h2 style={{ margin: 0, fontSize: '1.1rem' }}>Importar mis ofertas</h2>
                <button onClick={() => setShowImport(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.4rem', cursor: 'pointer' }}>×</button>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 0 }}>
                Pega aquí la <strong>Response (JSON)</strong> que copiaste desde la pestaña Network de tu panel de proveedor.
              </p>
              <textarea
                value={pegado}
                onChange={e => { setPegado(e.target.value); setImportError(''); }}
                placeholder='Pega aquí el JSON copiado (ej: [{ "CodigoExterno": "...", "Nombre": "...", "EstadoOferta": "En Evaluación" }, ...])'
                style={{ width: '100%', minHeight: 200, fontFamily: 'monospace', fontSize: '0.8rem', padding: 12, borderRadius: 10, border: `1px solid ${importError ? 'var(--danger, #ef4444)' : 'var(--border-color)'}`, background: 'var(--bg-tertiary)', color: 'var(--text-primary)', resize: 'vertical' }}
              />
              {importError && <div style={{ color: 'var(--danger, #ef4444)', fontSize: '0.82rem', marginTop: 8 }}>⚠️ {importError}</div>}
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 12 }}>
                <input type="checkbox" checked={modoFusion} onChange={e => setModoFusion(e.target.checked)} />
                Fusionar con lo existente (en vez de reemplazar todo)
              </label>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
                <button onClick={() => setShowImport(false)}
                  style={{ padding: '8px 16px', borderRadius: 10, cursor: 'pointer', border: '1px solid var(--border-color)', background: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}>
                  Cancelar
                </button>
                <button onClick={handleImport}
                  style={{ padding: '8px 16px', borderRadius: 10, cursor: 'pointer', border: 'none', background: 'var(--accent-primary)', color: '#fff', fontWeight: 600 }}>
                  Importar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
