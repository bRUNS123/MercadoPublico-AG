import { useState, useMemo, useEffect, useRef } from 'react';
import Header from '../components/Layout/Header';
import useMisOfertas from '../hooks/useMisOfertas';
import { PROCESO_COLUMNAS, COLUMNAS_ORDEN, parseMisProcesos, urlProceso } from '../utils/misOfertasAdapter';
import { formatFecha, formatFechaCorta, formatMonto } from '../utils/formatters';
import { getToken, setToken as saveToken, tokenInfo, fetchOportunidades } from '../api/miEscritorio';

// Código del bookmarklet "Sincronizar GEOPRO": se ejecuta en la pestaña de
// MercadoPúblico, toma el token y abre el dashboard con ?mp_token=… para
// auto-sincronizar. Se asigna vía ref (React bloquea href="javascript:").
const BOOKMARKLET = `javascript:(function(){function v(s){if(typeof s!=='string'||s.indexOf('eyJ')!==0)return false;try{var p=JSON.parse(atob(s.split('.')[1]));return p&&/chilecomprarealm/.test(p.iss||'')&&!!p.tipoUsuario;}catch(e){return false;}}var t=null;document.cookie.split(';').forEach(function(c){var i=c.indexOf('=');if(i<0)return;var k=c.slice(0,i).trim(),val=decodeURIComponent(c.slice(i+1).trim());if(k==='access_token_ccr'&&v(val))t=val;});function scan(s){try{for(var i=0;i<s.length;i++){var val=s.getItem(s.key(i));if(v(val)){t=val;return;}try{var o=JSON.parse(val);for(var k in o){if(v(o[k])){t=o[k];return;}}}catch(e){}}}catch(e){}}if(!t)scan(localStorage);if(!t)scan(sessionStorage);if(!t){alert('No encontre el token. Inicia sesion en MercadoPublico y abre el Escritorio de Proveedor, luego vuelve a hacer click.');return;}window.open('https://bruns123.github.io/MercadoPublico-AG/#/mi-mercadopublico?mp_token='+encodeURIComponent(t),'_blank');})();`;

function ProcesoCard({ p }) {
  const url = urlProceso(p.codigo, p.mecanismo === 'Compra Ágil' || p.raw?.tipo === 'compra_agil');
  const [hover, setHover] = useState(false);

  const inner = (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: '0.78rem', color: 'var(--accent-primary)', marginBottom: 4 }}>
        {p.codigo}
        {url && <span style={{ fontSize: '0.72rem', opacity: hover ? 1 : 0.45 }}>↗</span>}
      </div>
      <div style={{ fontSize: '0.82rem', color: 'var(--text-primary)', lineHeight: 1.35 }}>{p.nombre}</div>
      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 6, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {p.estadoLabel && <span>🏷️ {p.estadoLabel}</span>}
        {p.organismo !== '—' && <span>🏢 {p.organismo}</span>}
        {p.fechaCierre && <span>📅 Cierre {formatFechaCorta(p.fechaCierre)}</span>}
        {p.monto ? <span>💰 {formatMonto(p.monto, p.moneda)}</span> : null}
        {p.mecanismo && <span style={{ opacity: 0.7 }}>{p.mecanismo}</span>}
      </div>
    </>
  );

  const baseStyle = {
    display: 'block',
    background: 'var(--bg-secondary)',
    border: `1px solid ${hover && url ? 'var(--accent-primary)' : 'var(--border-color)'}`,
    borderRadius: 10,
    padding: '10px 12px',
    marginBottom: 8,
    textDecoration: 'none',
    color: 'inherit',
    transition: 'border-color .15s, transform .15s',
    transform: hover && url ? 'translateY(-1px)' : 'none',
  };

  if (!url) {
    return <div style={{ ...baseStyle, cursor: 'default' }}>{inner}</div>;
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      title="Abrir en MercadoPúblico"
      style={{ ...baseStyle, cursor: 'pointer' }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {inner}
    </a>
  );
}

export default function MiMercadoPublicoPage() {
  const { procesos, meta, importarProcesos, fusionarProcesos, limpiar, setEmpresa } = useMisOfertas();
  const [showImport, setShowImport] = useState(false);
  const [showGuia, setShowGuia] = useState(false);
  const [pegado, setPegado] = useState('');
  const [importError, setImportError] = useState('');
  const [modoFusion, setModoFusion] = useState(false);

  // ─── Sincronización vía Worker ───
  const [showSync, setShowSync] = useState(false);
  const [tokenInput, setTokenInput] = useState(getToken());
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState(null); // { tipo: 'ok'|'error', texto }
  const info = useMemo(() => tokenInfo(tokenInput.trim().replace(/^Bearer\s+/i, '')), [tokenInput]);
  const autoSyncedRef = useRef(null);
  const bmRef = useRef(null);

  // React no deja poner href="javascript:…"; lo asignamos por DOM al abrir la guía.
  useEffect(() => {
    if (bmRef.current) bmRef.current.setAttribute('href', BOOKMARKLET);
  }, [showGuia]);

  // Sincroniza usando un token concreto (o el del input si no se pasa uno).
  async function runSync(tok) {
    const token = tok != null ? tok : tokenInput;
    saveToken(token);
    setSyncing(true);
    setSyncMsg(null);
    try {
      const data = await fetchOportunidades();
      const res = parseMisProcesos(JSON.stringify(data));
      if (!res.ok) throw new Error(res.error);
      importarProcesos(res.procesos);
      setSyncMsg({ tipo: 'ok', texto: `${res.procesos.length} procesos sincronizados.` });
      setShowSync(false);
    } catch (err) {
      setSyncMsg({ tipo: 'error', texto: err.message });
    } finally {
      setSyncing(false);
    }
  }

  const handleSync = () => runSync();

  // Pega el token desde el portapapeles y sincroniza.
  async function pegarDesdePortapapeles() {
    try {
      const txt = (await navigator.clipboard.readText()).trim().replace(/^Bearer\s+/i, '');
      if (!txt) { setSyncMsg({ tipo: 'error', texto: 'El portapapeles está vacío.' }); return; }
      setTokenInput(txt);
      runSync(txt);
    } catch {
      setSyncMsg({ tipo: 'error', texto: 'No se pudo leer el portapapeles. Pega el token manualmente.' });
    }
  }

  // El bookmarklet abre el dashboard con ?mp_token=… en el hash → auto-sincroniza.
  useEffect(() => {
    const hash = window.location.hash || '';
    const qi = hash.indexOf('?');
    if (qi === -1) return;
    const params = new URLSearchParams(hash.slice(qi + 1));
    const t = params.get('mp_token');
    if (t && autoSyncedRef.current !== t) {
      autoSyncedRef.current = t;
      setTokenInput(t);
      runSync(t);
      // Limpia el token de la URL (no dejarlo visible ni en el historial)
      const clean = hash.slice(0, qi);
      window.history.replaceState(null, '', window.location.pathname + window.location.search + clean);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const porColumna = useMemo(() => {
    const g = { pendiente: [], abiertos: [], cerrados: [], resultados: [] };
    procesos.forEach(p => { (g[p.columna] || g.pendiente).push(p); });
    return g;
  }, [procesos]);

  const kpis = useMemo(() => [
    { label: 'Total procesos', value: procesos.length, icon: '📊', bg: 'rgba(14,165,233,0.15)' },
    { label: 'En juego', value: porColumna.pendiente.length + porColumna.abiertos.length, icon: '🔄', bg: 'rgba(34,197,94,0.15)', detail: 'pendientes + abiertos' },
    { label: 'Esperando resultados', value: porColumna.cerrados.length, icon: '⏳', bg: 'rgba(234,179,8,0.15)' },
    { label: 'Con resultados', value: porColumna.resultados.length, icon: '🏆', bg: 'rgba(59,130,246,0.15)' },
  ], [procesos, porColumna]);

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
          <button onClick={handleSync} disabled={syncing}
            style={{ fontSize: '0.85rem', padding: '7px 16px', borderRadius: 10, cursor: syncing ? 'wait' : 'pointer', border: 'none', background: 'var(--accent-primary)', color: '#fff', fontWeight: 600, opacity: syncing ? 0.6 : 1 }}>
            {syncing ? '⏳ Sincronizando…' : '🔄 Sincronizar'}
          </button>
          <button onClick={() => setShowSync(s => !s)}
            style={{ fontSize: '0.85rem', padding: '7px 16px', borderRadius: 10, cursor: 'pointer', border: '1px solid var(--border-color)', background: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}>
            🔑 Token
          </button>
          <button onClick={() => setShowImport(true)}
            style={{ fontSize: '0.85rem', padding: '7px 16px', borderRadius: 10, cursor: 'pointer', border: '1px solid var(--border-color)', background: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}>
            ⬆️ Pegar JSON
          </button>
          <button onClick={() => setShowGuia(g => !g)}
            style={{ fontSize: '0.85rem', padding: '7px 16px', borderRadius: 10, cursor: 'pointer', border: '1px solid var(--border-color)', background: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}>
            ⚡ Botón 1-click
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

        {/* ─── Mensaje de sincronización ─── */}
        {syncMsg && (
          <div style={{ padding: '0 24px', marginBottom: 12 }}>
            <div style={{ padding: '10px 14px', borderRadius: 10, fontSize: '0.85rem',
              background: syncMsg.tipo === 'ok' ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
              color: syncMsg.tipo === 'ok' ? '#22c55e' : '#ef4444',
              border: `1px solid ${syncMsg.tipo === 'ok' ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}` }}>
              {syncMsg.tipo === 'ok' ? '✅ ' : '⚠️ '}{syncMsg.texto}
            </div>
          </div>
        )}

        {/* ─── Panel de token ─── */}
        {showSync && (
          <div style={{ padding: '0 24px', marginBottom: 16 }}>
            <div className="table-container" style={{ padding: 20 }}>
              <strong style={{ fontSize: '0.92rem' }}>Token del Escritorio de Proveedor</strong>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '8px 0 12px', lineHeight: 1.5 }}>
                Lo más fácil: usa el <strong>bookmarklet</strong> "Sincronizar GEOPRO" desde la pestaña de MercadoPúblico y
                esto se llena solo. O pega aquí tu token Bearer manualmente. Se guarda solo en este navegador y caduca ~8h.
              </p>
              <button onClick={pegarDesdePortapapeles} disabled={syncing}
                style={{ fontSize: '0.82rem', padding: '6px 14px', borderRadius: 10, cursor: 'pointer', border: '1px solid var(--border-color)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', marginBottom: 10 }}>
                📋 Pegar del portapapeles y sincronizar
              </button>
              <textarea
                value={tokenInput}
                onChange={e => setTokenInput(e.target.value)}
                placeholder="eyJhbGciOiJSUzI1NiIs…"
                style={{ width: '100%', minHeight: 70, fontFamily: 'monospace', fontSize: '0.72rem', padding: 10, borderRadius: 10, border: '1px solid var(--border-color)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', resize: 'vertical' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
                <span style={{ fontSize: '0.8rem', color: info ? (info.expirado ? '#ef4444' : 'var(--text-muted)') : 'var(--text-muted)' }}>
                  {!tokenInput.trim() ? 'Sin token' : !info ? '⚠️ Token no reconocido' :
                    info.expirado ? '⛔ Expirado — pega uno nuevo' :
                    `✓ Válido hasta ${formatFecha(info.exp)}${info.usuario ? ` · usuario ${info.usuario}` : ''}`}
                </span>
                <button onClick={handleSync} disabled={syncing}
                  style={{ fontSize: '0.85rem', padding: '7px 16px', borderRadius: 10, cursor: 'pointer', border: 'none', background: 'var(--accent-primary)', color: '#fff', fontWeight: 600 }}>
                  Guardar y sincronizar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─── Guía: botón arrastrable ─── */}
        {showGuia && (
          <div style={{ padding: '0 24px', marginBottom: 16 }}>
            <div className="table-container" style={{ padding: 20, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 12 }}>
              <div style={{ fontSize: '0.9rem' }}>
                Arrastra este botón a tu barra de marcadores (<code>Ctrl+Shift+B</code> para mostrarla). Luego, desde MercadoPúblico, haz click en él:
              </div>
              <a
                ref={bmRef}
                href="#"
                onClick={(e) => e.preventDefault()}
                draggable
                title="Arrástrame a tu barra de marcadores"
                style={{ display: 'inline-block', padding: '12px 24px', borderRadius: 12, background: 'linear-gradient(135deg,#0ea5e9,#6366f1)', color: '#fff', fontWeight: 700, fontSize: '1rem', textDecoration: 'none', cursor: 'grab', boxShadow: '0 6px 18px rgba(14,165,233,.35)' }}
              >
                🔄 Sincronizar GEOPRO
              </a>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                ¿No funciona? Usa <strong>🔑 Token → 📋 Pegar del portapapeles</strong>. 🔒 El token se guarda solo en tu navegador.
              </div>
            </div>
          </div>
        )}

        {/* ─── Tablero / Vacío ─── */}
        {procesos.length === 0 ? (
          <div className="table-container">
            <div className="empty-state">
              <div className="empty-icon">🏛️</div>
              <div className="empty-title">Aún no has cargado tus procesos</div>
              <div className="empty-desc">
                Pulsa <strong>⚡ Botón 1-click</strong> y arrastra el botón a tus marcadores — luego, desde
                MercadoPúblico, un click y se sincroniza solo.
              </div>
            </div>
          </div>
        ) : (
          <>
          <div className="kpi-grid" style={{ padding: '0 24px', marginBottom: 16 }}>
            {kpis.map((k, i) => (
              <div className="kpi-card" key={i}>
                <div className="kpi-icon" style={{ background: k.bg }}>{k.icon}</div>
                <div className="kpi-label">{k.label}</div>
                <div className="kpi-value">{k.value}</div>
                {k.detail && <div className="kpi-detail">{k.detail}</div>}
              </div>
            ))}
          </div>
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
          </>
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
