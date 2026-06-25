import { useState, useMemo } from 'react';
import Header from '../components/Layout/Header';
import useMisOfertas from '../hooks/useMisOfertas';
import { PROCESO_COLUMNAS, COLUMNAS_ORDEN, parseMisProcesos, urlProceso } from '../utils/misOfertasAdapter';
import { formatFechaCorta, formatMonto } from '../utils/formatters';

function ProcesoCard({ p }) {
  const url = urlProceso(p.codigo);
  return (
    <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 10, padding: '10px 12px', marginBottom: 8 }}>
      <div style={{ fontWeight: 700, fontSize: '0.78rem', color: 'var(--accent-primary)', marginBottom: 4 }}>
        {url ? <a href={url} target="_blank" rel="noreferrer" style={{ color: 'inherit' }}>{p.codigo}</a> : p.codigo}
      </div>
      <div style={{ fontSize: '0.82rem', color: 'var(--text-primary)', lineHeight: 1.35 }}>{p.nombre}</div>
      {(p.organismo !== '—' || p.fechaCierre || p.monto) && (
        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 6, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {p.organismo !== '—' && <span>🏢 {p.organismo}</span>}
          {p.fechaCierre && <span>📅 {formatFechaCorta(p.fechaCierre)}</span>}
          {p.monto ? <span>💰 {formatMonto(p.monto, p.moneda)}</span> : null}
        </div>
      )}
    </div>
  );
}

export default function MiMercadoPublicoPage() {
  const { procesos, meta, importarProcesos, fusionarProcesos, limpiar, setEmpresa } = useMisOfertas();
  const [showImport, setShowImport] = useState(false);
  const [showGuia, setShowGuia] = useState(false);
  const [pegado, setPegado] = useState('');
  const [importError, setImportError] = useState('');
  const [modoFusion, setModoFusion] = useState(false);

  const porColumna = useMemo(() => {
    const g = { pendiente: [], abiertos: [], cerrados: [], resultados: [] };
    procesos.forEach(p => { (g[p.columna] || g.pendiente).push(p); });
    return g;
  }, [procesos]);

  function handleImport() {
    const res = parseMisProcesos(pegado);
    if (!res.ok) { setImportError(res.error); return; }
    if (modoFusion) fusionarProcesos(res.procesos);
    else importarProcesos(res.procesos);
    setPegado('');
    setImportError('');
    setShowImport(false);
  }

  return (
    <>
      <Header
        title="Mi MercadoPúblico"
        subtitle={`${meta.empresa} · Procesos en los que participaste${meta.actualizado ? ` · Actualizado ${formatFechaCorta(meta.actualizado)}` : ''}`}
      />

      <div className="app-content page-enter">
        {/* ─── Barra de acciones ─── */}
        <div style={{ padding: '0 24px', marginBottom: 16, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <button onClick={() => setShowImport(true)}
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
            title="Nombre de tu empresa / unidad"
            style={{ fontSize: '0.85rem', padding: '7px 12px', borderRadius: 10, border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', maxWidth: 160 }}
          />
          {procesos.length > 0 && (
            <button onClick={() => { if (confirm('¿Borrar todos los procesos guardados en este navegador?')) limpiar(); }}
              style={{ fontSize: '0.85rem', padding: '7px 16px', borderRadius: 10, cursor: 'pointer', border: '1px solid var(--border-color)', background: 'var(--bg-tertiary)', color: 'var(--danger, #ef4444)', marginLeft: 'auto' }}>
              🗑️ Limpiar
            </button>
          )}
        </div>

        {/* ─── Guía de captura ─── */}
        {showGuia && (
          <div style={{ padding: '0 24px', marginBottom: 16 }}>
            <div className="table-container" style={{ padding: 20, fontSize: '0.9rem', lineHeight: 1.6 }}>
              <strong>Cómo traer "Procesos en los que participaste" (sin compartir tu clave):</strong>
              <ol style={{ margin: '12px 0 0', paddingLeft: 20, color: 'var(--text-muted)' }}>
                <li>Inicia sesión normal en <code>mercadopublico.cl</code> con tu Clave Única.</li>
                <li>En tu escritorio, ubica el bloque <strong>"Procesos en los que participaste"</strong>.</li>
                <li>Abre DevTools (<code>F12</code>) → pestaña <strong>Network</strong> → filtro <strong>Fetch/XHR</strong>.</li>
                <li>Recarga la página. Busca la petición que devuelve esos 4 grupos en JSON (suele llamarse algo como <code>procesos</code>, <code>participacion</code> o similar).</li>
                <li>Click derecho → <strong>Copy → Copy Response</strong> (y aparte <strong>Copy as cURL</strong> para enviármelo).</li>
                <li>Vuelve aquí → <strong>Importar</strong> → pega el JSON. Se guarda solo en este navegador.</li>
              </ol>
              <div style={{ marginTop: 12, fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                🔒 Privado: se guarda en el almacenamiento local de tu navegador, no se sube a Firebase ni se comparte.
                Con el cURL (cookie tachada) automatizo esta actualización vía el Worker.
              </div>
            </div>
          </div>
        )}

        {/* ─── Tablero / Vacío ─── */}
        {procesos.length === 0 ? (
          <div className="table-container">
            <div className="empty-state">
              <div className="empty-icon">🏛️</div>
              <div className="empty-title">Aún no has importado tus procesos</div>
              <div className="empty-desc">
                Pulsa <strong>Importar / Actualizar datos</strong> y pega la respuesta del bloque
                "Procesos en los que participaste". Usa <strong>¿Cómo obtengo mis datos?</strong> para el paso a paso.
              </div>
            </div>
          </div>
        ) : (
          <div style={{ padding: '0 24px 24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
            {COLUMNAS_ORDEN.map(col => {
              const cfg = PROCESO_COLUMNAS[col];
              const items = porColumna[col];
              return (
                <div key={col} style={{ background: 'var(--bg-tertiary)', borderRadius: 14, border: '1px solid var(--border-color)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ padding: '12px 14px', borderTop: `3px solid ${cfg.color}`, background: cfg.bg }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)' }}>{cfg.icon} {cfg.label}</span>
                      <span style={{ fontWeight: 700, fontSize: '0.85rem', color: cfg.color, background: 'var(--bg-secondary)', borderRadius: 999, padding: '1px 10px', minWidth: 26, textAlign: 'center' }}>{items.length}</span>
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>{cfg.sub}</div>
                  </div>
                  <div style={{ padding: 12, flex: 1, maxHeight: 560, overflowY: 'auto' }}>
                    {items.length === 0
                      ? <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textAlign: 'center', padding: '24px 0' }}>Sin procesos</div>
                      : items.map(p => <ProcesoCard key={p._id} p={p} />)}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ─── Modal de importación ─── */}
        {showImport && (
          <div onClick={() => setShowImport(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
            <div onClick={e => e.stopPropagation()}
              style={{ background: 'var(--bg-secondary)', borderRadius: 14, border: '1px solid var(--border-color)', padding: 24, width: 'min(640px, 100%)', maxHeight: '90vh', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <h2 style={{ margin: 0, fontSize: '1.1rem' }}>Importar mis procesos</h2>
                <button onClick={() => setShowImport(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.4rem', cursor: 'pointer' }}>×</button>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 0 }}>
                Pega la <strong>Response (JSON)</strong> que copiaste del bloque "Procesos en los que participaste".
              </p>
              <textarea
                value={pegado}
                onChange={e => { setPegado(e.target.value); setImportError(''); }}
                placeholder='Pega aquí el JSON copiado desde la pestaña Network…'
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
