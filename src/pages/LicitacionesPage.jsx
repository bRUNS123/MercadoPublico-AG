import { useState, useEffect, useCallback, useMemo } from 'react';
import Header from '../components/Layout/Header';
import FilterBar from '../components/Licitaciones/FilterBar';
import LicitacionesTable from '../components/Licitaciones/LicitacionesTable';
import LicitacionDetail from '../components/Licitaciones/LicitacionDetail';
import Loader from '../components/Common/Loader';
import useLicitaciones from '../hooks/useLicitaciones';
import useFavoritos from '../hooks/useFavoritos';
import { todayInputFormat, subtractDays, norm } from '../utils/formatters';
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
  const { favoritos } = useFavoritos();
  const [selected, setSelected] = useState(null);
  const [filters, setFilters] = useState(FILTERS_DEFAULT);

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
      const q = norm(filters.busqueda);
      result = result.filter(l =>
        norm(l.Nombre || '').includes(q) ||
        norm(l.Descripcion || '').includes(q)
      );
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
          />
        )}

        {selected && (
          <LicitacionDetail licitacion={selected} onClose={() => setSelected(null)} />
        )}
      </div>
    </>
  );
}
