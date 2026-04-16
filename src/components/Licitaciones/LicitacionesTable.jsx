import { useState, useMemo } from 'react';
import StatusBadge from '../Common/StatusBadge';
import { getMontoInteligente, formatFechaCorta, diasRestantes, truncate } from '../../utils/formatters';
import api from '../../api/mercadopublico';
import useFavoritos from '../../hooks/useFavoritos';

const MontoInline = ({ licitacion }) => {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(false);

  // Consideramos l = detail si lo cargamos, o licitacion si ya viene completo
  const l = detail || licitacion;

  if (l.Items || l.MontoEstimado !== undefined || l.Estimacion !== undefined) {
    const monto = getMontoInteligente(l);
    return <span style={{ fontWeight: 600 }}>{monto.display}</span>;
  }

  const handleCargar = (e) => {
    e.stopPropagation();
    setLoading(true);
    api.getLicitacionPorCodigo(licitacion.CodigoExterno)
      .then(data => {
        if (data.Listado && data.Listado.length > 0) {
          setDetail(data.Listado[0]);
        }
      })
      .finally(() => setLoading(false));
  };

  if (loading) {
    return <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>⏳ Cargando...</span>;
  }

  return (
    <button onClick={handleCargar} style={{
      padding: '4px 8px', fontSize: '0.75rem', borderRadius: '4px',
      background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)',
      color: 'var(--text-secondary)', cursor: 'pointer'
    }}>
      🔍 Consultar
    </button>
  );
};

const PAGE_SIZE = 15;

export default function LicitacionesTable({ licitaciones = [], onSelect, title = 'Licitaciones' }) {
  const [page, setPage] = useState(0);
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState('asc');
  const { favoritos, rateLicitacion, isCollabActive, roomId } = useFavoritos();

  const sorted = useMemo(() => {
    if (!sortKey) return licitaciones;
    return [...licitaciones].sort((a, b) => {
      let va, vb;
      if (sortKey === '_monto') {
        // Sort by CLP-converted value
        va = getMontoInteligente(a).clpValue;
        vb = getMontoInteligente(b).clpValue;
      } else {
        va = a[sortKey];
        vb = b[sortKey];
      }
      if (va == null) return 1;
      if (vb == null) return -1;
      if (typeof va === 'string') va = va.toLowerCase();
      if (typeof vb === 'string') vb = vb.toLowerCase();
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [licitaciones, sortKey, sortDir]);

  const totalPages = Math.ceil(sorted.length / PAGE_SIZE);
  const paged = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const getSortIndicator = (key) => {
    if (sortKey !== key) return '';
    return sortDir === 'asc' ? ' ↑' : ' ↓';
  };

  const getDiasClass = (dias) => {
    if (dias === null || dias === undefined) return 'cerrado';
    if (dias === 0) return 'cerrado';
    if (dias <= 2) return 'urgente';
    if (dias <= 5) return 'pronto';
    return 'ok';
  };

  if (licitaciones.length === 0) {
    return (
      <div className="table-container">
        <div className="table-header">
          <div className="table-title">{title}</div>
        </div>
        <div className="empty-state">
          <div className="empty-icon">📭</div>
          <div className="empty-title">Sin licitaciones</div>
          <div className="empty-desc">No se encontraron licitaciones con los filtros seleccionados. Intenta cambiar la fecha o los filtros.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="table-container">
      <div className="table-header" style={{ flexWrap: 'wrap', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="table-title">{title}</div>
          <div className="table-count">{licitaciones.length} resultados</div>
        </div>
        <div style={{ fontSize: '0.85rem', color: isCollabActive ? 'var(--success)' : 'var(--text-muted)' }}>
           {isCollabActive ? '🟢 Sincronizado (Sala: ' + roomId + ')' : '📴 Modo Local'}
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table>
          <thead>
            <tr>
              <th onClick={() => handleSort('CodigoExterno')} className={sortKey === 'CodigoExterno' ? 'sorted' : ''}>
                Código{getSortIndicator('CodigoExterno')}
              </th>
              <th onClick={() => handleSort('Nombre')} className={sortKey === 'Nombre' ? 'sorted' : ''}>
                Nombre{getSortIndicator('Nombre')}
              </th>
              <th>Estado</th>
              <th>Tipo</th>
              <th onClick={() => handleSort('FechaCierre')} className={sortKey === 'FechaCierre' ? 'sorted' : ''}>
                Cierre{getSortIndicator('FechaCierre')}
              </th>
              <th>Días</th>
              <th onClick={() => handleSort('_monto')} className={sortKey === '_monto' ? 'sorted' : ''}>
                Monto (CLP){getSortIndicator('_monto')}
              </th>
              <th style={{ textAlign: 'center', width: 60 }}>Pts.</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {paged.map((l, i) => {
              const dias = diasRestantes(l.FechaCierre);
              const monto = getMontoInteligente(l);
              return (
                <tr key={l.CodigoExterno || i} className="row-clickable" onClick={() => onSelect?.(l)}>
                  <td className="td-code">{l.CodigoExterno || '—'}</td>
                  <td className="td-name">{truncate(l.Nombre, 65)}</td>
                  <td><StatusBadge codigo={l.CodigoEstado} /></td>
                  <td style={{ fontSize: '0.78rem' }}>{l.Tipo || '—'}</td>
                  <td className="td-fecha">{formatFechaCorta(l.FechaCierre)}</td>
                  <td className={`td-dias ${getDiasClass(dias)}`}>
                    {dias !== null ? (dias === 0 ? 'Cerrado' : `${dias}d`) : '—'}
                  </td>
                  <td className="td-monto">
                    <MontoInline licitacion={l} />
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <select
                      value={favoritos[l.CodigoExterno]?.rating || 0}
                      onChange={(e) => { e.stopPropagation(); rateLicitacion(l, e.target.value); }}
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        padding: '4px', borderRadius: 4, border: '1px solid var(--border-color)',
                        background: 'var(--bg-secondary)', color: favoritos[l.CodigoExterno]?.rating >= 7 ? 'var(--success)' : 'var(--text-primary)',
                        fontWeight: 'bold', fontSize: '0.85rem'
                      }}
                    >
                      <option value="0">-</option>
                      {[...Array(10)].map((_, i) => (
                        <option key={10-i} value={10-i}>{10-i}</option>
                      ))}
                    </select>
                  </td>
                  <td><span className="view-link">Ver</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="pagination">
          <button className="pagination-btn" disabled={page === 0} onClick={() => setPage(0)}>«</button>
          <button className="pagination-btn" disabled={page === 0} onClick={() => setPage(p => p - 1)}>‹</button>
          <span className="pagination-info">Página {page + 1} de {totalPages}</span>
          <button className="pagination-btn" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>›</button>
          <button className="pagination-btn" disabled={page >= totalPages - 1} onClick={() => setPage(totalPages - 1)}>»</button>
        </div>
      )}
    </div>
  );
}
