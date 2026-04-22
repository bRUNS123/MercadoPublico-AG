import { useState, useMemo } from 'react';
import { CATEGORIAS_INTERES } from '../../utils/constants';
import StatusBadge from '../Common/StatusBadge';
import { getMontoInteligente, formatFechaCorta, diasRestantes, truncate, getCategoryMatches } from '../../utils/formatters';
import api from '../../api/mercadopublico';
import useFavoritos from '../../hooks/useFavoritos';
import useCategoryVotes from '../../hooks/useCategoryVotes';
import usePatterns from '../../hooks/usePatterns';
import useDescartados from '../../hooks/useDescartados';

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

const CATEGORIA_COLORS = {
  construccion: { color: '#f97316', bg: 'rgba(249,115,22,0.15)' },
  ingenieria:   { color: '#3b82f6', bg: 'rgba(59,130,246,0.2)' },
  ito_ite:      { color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' },
  mantencion:   { color: '#14b8a6', bg: 'rgba(20,184,166,0.15)' },
  consultoria:  { color: '#a855f7', bg: 'rgba(168,85,247,0.15)' },
  suministros:  { color: '#94a3b8', bg: 'rgba(148,163,184,0.15)' },
};
const _CAT_FALLBACK = { color: '#64748b', bg: 'rgba(100,116,139,0.15)' };

const PAGE_SIZE = 15;

export default function LicitacionesTable({ licitaciones = [], onSelect, title = 'Licitaciones', hasActiveFilters = false, onClearFilters, onRefresh }) {
  const [page, setPage] = useState(0);
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState('asc');
  const [expandedRow, setExpandedRow] = useState(null);
  const [showDescartadas, setShowDescartadas] = useState(false);
  const { favoritos, rateLicitacion, isCollabActive, roomId } = useFavoritos();
  const { catVotes, voteCategory, getVotes } = useCategoryVotes();
  const { descartados, descartarLicitacion, isDescartada } = useDescartados();
  const { getScores } = usePatterns(favoritos, catVotes, descartados);

  const sorted = useMemo(() => {
    const base = showDescartadas ? licitaciones : licitaciones.filter(l => !isDescartada(l.CodigoExterno));
    if (!sortKey) return base;
    return [...base].sort((a, b) => {
      let va, vb;
      if (sortKey === '_monto') {
        va = getMontoInteligente(a).clpValue;
        vb = getMontoInteligente(b).clpValue;
      } else if (sortKey === '_rating') {
        va = favoritos[a.CodigoExterno]?.rating ?? 0;
        vb = favoritos[b.CodigoExterno]?.rating ?? 0;
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
  }, [licitaciones, sortKey, sortDir, showDescartadas, descartados, favoritos]);

  const descartadasCount = useMemo(
    () => licitaciones.filter(l => isDescartada(l.CodigoExterno)).length,
    [licitaciones, descartados]
  );

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
          <div className="empty-desc">
            {hasActiveFilters
              ? 'Los filtros activos no arrojaron resultados. Prueba limpiando las categorías o ampliando el rango de fechas.'
              : 'No hay licitaciones para el rango de fechas seleccionado. Prueba ampliar las fechas o hacer un refresh.'}
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 16, flexWrap: 'wrap' }}>
            {hasActiveFilters && onClearFilters && (
              <button className="btn btn-secondary btn-sm" onClick={onClearFilters}>
                Limpiar filtros
              </button>
            )}
            {onRefresh && (
              <button className="btn btn-primary btn-sm" onClick={onRefresh}>
                ↺ Buscar de nuevo
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="table-container">
      <div className="table-header" style={{ flexWrap: 'wrap', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="table-title">{title}</div>
          <div className="table-count">{sorted.length} resultados</div>
          <button
            onClick={() => { setSortKey('_rating'); setSortDir('desc'); setPage(0); }}
            style={{
              fontSize: '0.72rem', padding: '2px 10px', borderRadius: 10, cursor: 'pointer',
              border: '1px solid var(--border-color)',
              background: sortKey === '_rating' ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
              color: sortKey === '_rating' ? '#fff' : 'var(--text-muted)',
              fontWeight: sortKey === '_rating' ? 700 : 400,
            }}
            title="Ordenar por puntuación descendente"
          >
            ⭐ Mejor puntuadas
          </button>
          {descartadasCount > 0 && (
            <button
              onClick={() => setShowDescartadas(s => !s)}
              style={{
                fontSize: '0.75rem', padding: '2px 10px', borderRadius: 10, cursor: 'pointer',
                border: '1px solid var(--border-color)',
                background: showDescartadas ? 'rgba(239,68,68,0.15)' : 'var(--bg-tertiary)',
                color: showDescartadas ? '#ef4444' : 'var(--text-muted)',
              }}
            >
              {showDescartadas ? '✕ Ocultar' : `✕ ${descartadasCount} descartada${descartadasCount > 1 ? 's' : ''}`}
            </button>
          )}
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
              <th onClick={() => handleSort('_rating')} className={sortKey === '_rating' ? 'sorted' : ''} style={{ textAlign: 'center', width: 60, cursor: 'pointer' }}>
                Pts.{getSortIndicator('_rating')}
              </th>
              <th style={{ textAlign: 'center', width: 36 }} title="Descartar licitación">✕</th>
            </tr>
          </thead>
          <tbody>
            {paged.map((l, i) => {
              const dias = diasRestantes(l.FechaCierre);
              const catMatches = getCategoryMatches(l);
              const communityScores = getScores(l);
              const isExpanded = expandedRow === l.CodigoExterno;

              // Categorías visibles en modo compacto: auto/comunidad/confirmadas, pero NO si el device la rechazó
              const visibleCats = CATEGORIAS_INTERES.filter(cat => {
                const auto = catMatches.find(m => m.id === cat.id);
                const cs = communityScores[cat.id];
                const v = getVotes(l.CodigoExterno, cat.id);
                if (v.myVote === false) return false; // rechazada por este device → ocultar
                return auto || (cs && cs.score >= 25) || v.confirmed > 0;
              });

              const descartada = isDescartada(l.CodigoExterno);
              return (
                <tr
                  key={l.CodigoExterno || i}
                  className="row-clickable"
                  onClick={() => onSelect?.(l)}
                  style={descartada ? { opacity: 0.4, textDecoration: 'line-through' } : undefined}
                >
                  <td className="td-code">{l.CodigoExterno || '—'}</td>
                  <td className="td-name">
                    {truncate(l.Nombre, 65)}

                    {/* Badges compactos + botón expandir */}
                    <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap', marginTop: 4, alignItems: 'center' }}>
                      {visibleCats.map(cat => {
                        const auto = catMatches.find(m => m.id === cat.id);
                        const cs = communityScores[cat.id];
                        const votes = getVotes(l.CodigoExterno, cat.id);
                        const c = CATEGORIA_COLORS[cat.id] || _CAT_FALLBACK;
                        const isIng = cat.id === 'ingenieria';
                        const displayScore = cs ? cs.score : auto?.score;
                        const isCommunity = !!cs && !auto;
                        return (
                          <span key={cat.id}
                            title={cs
                              ? `Comunidad: ${cs.score}% (${cs.sampleSize} ej.)${auto ? ` · Auto: ${auto.score}%` : ''}`
                              : auto ? `Auto: ${auto.score}%` : `${votes.confirmed} confirmación(es)`}
                            style={{
                              display: 'inline-flex', alignItems: 'center', gap: 2,
                              fontSize: '0.63rem', padding: '1px 3px 1px 6px', borderRadius: 10,
                              background: c.bg, color: c.color,
                              fontWeight: isIng ? 700 : 400,
                              border: `1px solid ${isCommunity ? c.color : 'transparent'}`,
                              letterSpacing: '0.02em',
                            }}>
                            {isIng ? '★ ' : ''}{cat.label}
                            {displayScore != null ? ` ${displayScore}%` : ''}
                            {isCommunity ? '↑' : ''}
                            <button onClick={(e) => { e.stopPropagation(); voteCategory(l.CodigoExterno, cat.id, true); }}
                              title={votes.myVote === true ? 'Quitar confirmación' : `Confirmar${votes.confirmed > 0 ? ` (${votes.confirmed})` : ''}`}
                              style={{
                                marginLeft: 1, padding: '0 3px', borderRadius: 5, cursor: 'pointer',
                                fontSize: '0.6rem', border: 'none', lineHeight: 1.4, fontWeight: 700,
                                background: votes.myVote === true ? c.color : 'rgba(255,255,255,0.08)',
                                color: votes.myVote === true ? '#fff' : c.color,
                              }}>
                              ✓{votes.confirmed > 0 ? ` ${votes.confirmed}` : ''}
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); voteCategory(l.CodigoExterno, cat.id, false); }}
                              title={votes.myVote === false ? 'Quitar rechazo' : `No aplica esta categoría${votes.rejected > 0 ? ` (${votes.rejected})` : ''}`}
                              style={{
                                padding: '0 3px', borderRadius: 5, cursor: 'pointer',
                                fontSize: '0.6rem', border: 'none', lineHeight: 1.4, fontWeight: 700,
                                background: votes.myVote === false ? '#ef4444' : 'rgba(255,255,255,0.08)',
                                color: votes.myVote === false ? '#fff' : 'rgba(239,68,68,0.5)',
                              }}>
                              ✕{votes.rejected > 0 ? ` ${votes.rejected}` : ''}
                            </button>
                          </span>
                        );
                      })}

                      {/* Botón para expandir/colapsar panel de votación completo */}
                      <button
                        onClick={(e) => { e.stopPropagation(); setExpandedRow(isExpanded ? null : l.CodigoExterno); }}
                        title={isExpanded ? 'Cerrar panel de categorías' : 'Votar categorías manualmente'}
                        style={{
                          fontSize: '0.6rem', padding: '1px 5px', borderRadius: 8, cursor: 'pointer',
                          border: '1px solid var(--border-color)', background: isExpanded ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                          color: isExpanded ? '#fff' : 'var(--text-muted)', lineHeight: 1.6,
                        }}>
                        {isExpanded ? '−' : '＋'}
                      </button>
                    </div>

                    {/* Panel expandible: votar las 5 categorías */}
                    {isExpanded && (
                      <div onClick={(e) => e.stopPropagation()}
                        style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 6, padding: '6px 8px', borderRadius: 8, background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)' }}>
                        {CATEGORIAS_INTERES.map(cat => {
                          const votes = getVotes(l.CodigoExterno, cat.id);
                          const cs = communityScores[cat.id];
                          const auto = catMatches.find(m => m.id === cat.id);
                          const c = CATEGORIA_COLORS[cat.id] || _CAT_FALLBACK;
                          return (
                            <div key={cat.id} style={{ display: 'inline-flex', alignItems: 'center', borderRadius: 8, overflow: 'hidden', border: `1px solid ${votes.myVote === false ? '#ef4444' : c.color}` }}>
                              <span style={{
                                fontSize: '0.68rem', padding: '3px 8px',
                                background: votes.myVote === true ? c.color : votes.myVote === false ? 'rgba(239,68,68,0.08)' : 'transparent',
                                color: votes.myVote === true ? '#fff' : votes.myVote === false ? '#ef444488' : c.color,
                                textDecoration: votes.myVote === false ? 'line-through' : 'none',
                                fontWeight: 500,
                              }}>
                                {cat.label}
                                {auto ? <span style={{ opacity: 0.75 }}> A:{auto.score}%</span> : ''}
                                {cs ? <span style={{ opacity: 0.75 }}> C:{cs.score}%↑</span> : ''}
                              </span>
                              <button onClick={() => voteCategory(l.CodigoExterno, cat.id, true)}
                                title={votes.myVote === true ? 'Quitar confirmación' : 'Confirmar: sí aplica'}
                                style={{
                                  padding: '3px 6px', cursor: 'pointer', fontSize: '0.7rem', border: 'none',
                                  borderLeft: `1px solid ${c.color}`, fontWeight: 700,
                                  background: votes.myVote === true ? c.color : 'transparent',
                                  color: votes.myVote === true ? '#fff' : c.color,
                                }}>
                                ✓{votes.confirmed > 0 ? votes.confirmed : ''}
                              </button>
                              <button onClick={() => voteCategory(l.CodigoExterno, cat.id, false)}
                                title={votes.myVote === false ? 'Quitar rechazo' : 'Rechazar: no aplica esta categoría'}
                                style={{
                                  padding: '3px 6px', cursor: 'pointer', fontSize: '0.7rem', border: 'none',
                                  borderLeft: `1px solid #ef444466`, fontWeight: 700,
                                  background: votes.myVote === false ? '#ef4444' : 'transparent',
                                  color: votes.myVote === false ? '#fff' : '#ef444488',
                                }}>
                                ✕{votes.rejected > 0 ? votes.rejected : ''}
                              </button>
                            </div>
                          );
                        })}
                        <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', alignSelf: 'center', marginLeft: 4 }}>
                          A=auto · C=comunidad · ✓=confirmar · ✕=no aplica
                        </span>
                      </div>
                    )}
                  </td>
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
                  <td onClick={(e) => e.stopPropagation()} style={{ textAlign: 'center' }}>
                    <button
                      onClick={(e) => { e.stopPropagation(); descartarLicitacion(l); }}
                      title={isDescartada(l.CodigoExterno) ? 'Restaurar licitación' : 'Descartar — no sirve'}
                      style={{
                        width: 26, height: 26, borderRadius: '50%', cursor: 'pointer',
                        border: `1px solid ${isDescartada(l.CodigoExterno) ? '#ef4444' : 'var(--border-color)'}`,
                        background: isDescartada(l.CodigoExterno) ? 'rgba(239,68,68,0.15)' : 'transparent',
                        color: isDescartada(l.CodigoExterno) ? '#ef4444' : 'var(--text-muted)',
                        fontSize: '0.75rem', fontWeight: 700, lineHeight: 1,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto',
                      }}
                    >
                      ✕
                    </button>
                  </td>
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
