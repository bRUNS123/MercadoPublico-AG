import { useState, useEffect, useCallback, useMemo } from 'react';
import Header from '../components/Layout/Header';
import FilterBar from '../components/Licitaciones/FilterBar';
import LicitacionesTable from '../components/Licitaciones/LicitacionesTable';
import LicitacionDetail from '../components/Licitaciones/LicitacionDetail';
import Loader from '../components/Common/Loader';
import useLicitaciones from '../hooks/useLicitaciones';
import useFavoritos from '../hooks/useFavoritos';
import useDescartados from '../hooks/useDescartados';
import { todayInputFormat, subtractDays, norm, matchesQuery } from '../utils/formatters';
import { CATEGORIAS_INTERES } from '../utils/constants';
import api from '../api/mercadopublico';

const FILTERS_DEFAULT = {
  estado: '',
  fechaDesde: subtractDays(todayInputFormat(), 7),
  fechaHasta: todayInputFormat(),
  busqueda: '',
  codigo: '',
  categoria: [],
  soloFavoritos: false,
};

export default function LicitacionesPage() {
  const { licitaciones, loading, error, lastUpdate, fetchLicitaciones } = useLicitaciones();
  const { favoritos, rateLicitacion, isCollabActive, roomId } = useFavoritos();
  const { descartados, descartarLicitacion } = useDescartados();
  const [selected, setSelected] = useState(null);
  const [filters, setFilters] = useState(FILTERS_DEFAULT);
  const [showDescartadasPanel, setShowDescartadasPanel] = useState(false);

  // ── Efecto 1: re-fetch desde API solo cuando cambian parámetros que requieren red ──
  // busqueda y categoria NO están aquí — se filtran en cliente sin tocar la API
  useEffect(() => {
    if (filters.soloFavoritos) return;
    const timeout = setTimeout(() => {
      fetchLicitaciones({
        estado: filters.estado,
        fechaDesde: filters.fechaDesde,
        fechaHasta: filters.fechaHasta,
        codigo: filters.codigo,
      });
    }, 800);
    return () => clearTimeout(timeout);
  }, [filters.estado, filters.fechaDesde, filters.fechaHasta, filters.codigo, filters.soloFavoritos, fetchLicitaciones]);

  // ── Filtrado client-side: instantáneo, sin API ──
  const licitacionesFiltradas = useMemo(() => {
    let result = licitaciones;

    if (filters.busqueda) {
      result = result.filter(l => matchesQuery(`${l.Nombre || ''} ${l.Descripcion || ''}`, filters.busqueda));
    }

    if (filters.categoria.length > 0) {
      const cats = CATEGORIAS_INTERES.filter(c => filters.categoria.includes(c.id));
      result = result.filter(l => {
        const text = norm((l.Nombre || '') + ' ' + (l.Descripcion || ''));
        return cats.some(cat => cat.keywords.some(kw => text.includes(norm(kw))));
      });
    }

    return result;
  }, [licitaciones, filters.busqueda, filters.categoria]);

  // Refresh manual: limpia caché y re-fetcha
  const handleRefresh = useCallback(() => {
    api._clearOldCache();
    fetchLicitaciones({
      estado: filters.estado,
      fechaDesde: filters.fechaDesde,
      fechaHasta: filters.fechaHasta,
      codigo: filters.codigo,
    });
  }, [filters, fetchLicitaciones]);

  const hasActiveFilters = filters.categoria.length > 0 || filters.busqueda || filters.estado || filters.codigo;
  const descartadasList = Object.values(descartados).map(d => d.licitacion).filter(Boolean);

  const displayList = filters.soloFavoritos
    ? Object.values(favoritos).map(f => f.licitacion).filter(Boolean)
    : licitacionesFiltradas;

  const subtitle = loading
    ? 'Buscando licitaciones...'
    : lastUpdate
      ? `${licitacionesFiltradas.length} resultado${licitacionesFiltradas.length !== 1 ? 's' : ''}${filters.categoria.length > 0 || filters.busqueda ? ` (filtrado de ${licitaciones.length})` : ''} · ${lastUpdate.toLocaleTimeString('es-CL')}`
      : 'Sin datos';

  return (
    <>
      <Header title="Explorar Licitaciones" subtitle={subtitle} />
      <div className="app-content page-enter">
        {error && <div className="error-banner">⚠️ {error}</div>}

        <FilterBar
          filters={filters}
          onChange={setFilters}
          onRefresh={handleRefresh}
          loading={loading}
        />

        <div style={{ padding: '0 24px', marginBottom: 10 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.9rem', color: 'var(--text-primary)' }}>
            <input
              type="checkbox"
              checked={filters.soloFavoritos}
              onChange={e => setFilters(f => ({ ...f, soloFavoritos: e.target.checked }))}
            />
            <span>⭐ Mostrar sólo puntuadas</span>
          </label>
        </div>

        {loading && !filters.soloFavoritos ? (
          <Loader text="Buscando licitaciones..." />
        ) : (
          <LicitacionesTable
            licitaciones={displayList}
            onSelect={setSelected}
            title={filters.soloFavoritos ? 'Mis Favoritos' : 'Resultados'}
            hasActiveFilters={hasActiveFilters}
            onClearFilters={() => setFilters(FILTERS_DEFAULT)}
            onRefresh={handleRefresh}
            favoritos={favoritos}
            rateLicitacion={rateLicitacion}
            isCollabActive={isCollabActive}
            roomId={roomId}
          />
        )}

        {descartadasList.length > 0 && (
          <div style={{ padding: '0 24px', marginTop: 24 }}>
            <button
              onClick={() => setShowDescartadasPanel(s => !s)}
              style={{
                fontSize: '0.82rem', padding: '5px 14px', borderRadius: 10, cursor: 'pointer',
                border: '1px solid var(--border-color)',
                background: showDescartadasPanel ? 'rgba(239,68,68,0.12)' : 'var(--bg-tertiary)',
                color: showDescartadasPanel ? '#ef4444' : 'var(--text-muted)',
              }}
            >
              ✕ {descartadasList.length} descartada{descartadasList.length !== 1 ? 's' : ''} {showDescartadasPanel ? '▲' : '▼'}
            </button>

            {showDescartadasPanel && (
              <div style={{ marginTop: 10, border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                  <tbody>
                    {descartadasList.map(l => (
                      <tr key={l.CodigoExterno} style={{ borderBottom: '1px solid var(--border-color)', opacity: 0.6 }}>
                        <td style={{ padding: '8px 12px', fontFamily: 'monospace', color: 'var(--text-muted)', width: 140 }}>
                          {l.CodigoExterno}
                        </td>
                        <td style={{ padding: '8px 12px', textDecoration: 'line-through', color: 'var(--text-secondary)' }}>
                          {l.Nombre}
                        </td>
                        <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                          <button
                            onClick={() => descartarLicitacion(l)}
                            title="Restaurar — quitar del descarte"
                            style={{
                              fontSize: '0.75rem', padding: '2px 8px', borderRadius: 6, cursor: 'pointer',
                              border: '1px solid var(--border-color)', background: 'transparent',
                              color: 'var(--text-muted)',
                            }}
                          >
                            ↩ Restaurar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {selected && (
          <LicitacionDetail licitacion={selected} onClose={() => setSelected(null)} />
        )}
      </div>
    </>
  );
}
