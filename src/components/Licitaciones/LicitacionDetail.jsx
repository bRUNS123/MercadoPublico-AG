import { useState, useEffect } from 'react';
import StatusBadge from '../Common/StatusBadge';
import { formatMonto, formatFecha, diasRestantes, getTipoNombre, getMontoInteligente } from '../../utils/formatters';
import { MONEDAS, MODALIDADES_PAGO } from '../../utils/constants';
import api from '../../api/mercadopublico';
import Loader from '../Common/Loader';
import useFavoritos from '../../hooks/useFavoritos';

export default function LicitacionDetail({ licitacion, onClose }) {
  const [l, setL] = useState(licitacion);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const { favoritos, rateLicitacion } = useFavoritos();

  useEffect(() => {
    // Si la licitación ya tiene Items, es probable que ya esté completa
    if (licitacion && !licitacion.Items && licitacion.CodigoExterno) {
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

          {/* Link a MercadoPúblico */}
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}
