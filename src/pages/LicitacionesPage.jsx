import { useState, useEffect, useCallback } from 'react';
import Header from '../components/Layout/Header';
import FilterBar from '../components/Licitaciones/FilterBar';
import LicitacionesTable from '../components/Licitaciones/LicitacionesTable';
import LicitacionDetail from '../components/Licitaciones/LicitacionDetail';
import Loader from '../components/Common/Loader';
import useLicitaciones from '../hooks/useLicitaciones';
import useFavoritos from '../hooks/useFavoritos';
import { todayInputFormat, subtractDays } from '../utils/formatters';
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
  const { favoritos } = useFavoritos();
  const [selected, setSelected] = useState(null);
  const [filters, setFilters] = useState(FILTERS_DEFAULT);

  const doFetch = useCallback((extraParams = {}) => {
    if (!filters.soloFavoritos) {
      fetchLicitaciones({ ...filters, ...extraParams });
    }
  }, [filters, fetchLicitaciones]);

  // Debounce normal para cambios de filtros
  useEffect(() => {
    const timeout = setTimeout(() => doFetch(), 1200);
    return () => clearTimeout(timeout);
  }, [doFetch]);

  // Refresh manual: limpia caché de API y re-fetcha inmediatamente
  const handleRefresh = useCallback(() => {
    api._clearOldCache();
    fetchLicitaciones({ ...filters, _ts: Date.now() }); // _ts fuerza recalculo del hook
  }, [filters, fetchLicitaciones]);

  const hasActiveFilters = filters.categoria.length > 0 || filters.busqueda || filters.estado || filters.codigo;

  const subtitle = loading
    ? 'Buscando licitaciones...'
    : lastUpdate
      ? `${licitaciones.length} resultados · ${lastUpdate.toLocaleTimeString('es-CL')}`
      : 'Sin datos';

  return (
    <>
      <Header
        title="Explorar Licitaciones"
        subtitle={subtitle}
      />
      <div className="app-content page-enter">
        {error && (
          <div className="error-banner">
            ⚠️ {error}
          </div>
        )}

        <FilterBar
          filters={filters}
          onChange={setFilters}
          onRefresh={handleRefresh}
          loading={loading}
        />

        <div style={{ padding: '0 24px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 16 }}>
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
            licitaciones={
              filters.soloFavoritos
                ? Object.values(favoritos).map(f => f.licitacion).filter(Boolean)
                : licitaciones
            }
            onSelect={setSelected}
            title={filters.soloFavoritos ? 'Mis Favoritos' : 'Resultados'}
            hasActiveFilters={hasActiveFilters}
            onClearFilters={() => setFilters(FILTERS_DEFAULT)}
            onRefresh={handleRefresh}
          />
        )}

        {selected && (
          <LicitacionDetail licitacion={selected} onClose={() => setSelected(null)} />
        )}
      </div>
    </>
  );
}
