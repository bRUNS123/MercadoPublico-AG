import { useState, useEffect, useCallback } from 'react';
import Header from '../components/Layout/Header';
import FilterBar from '../components/Licitaciones/FilterBar';
import LicitacionesTable from '../components/Licitaciones/LicitacionesTable';
import LicitacionDetail from '../components/Licitaciones/LicitacionDetail';
import Loader from '../components/Common/Loader';
import useLicitaciones from '../hooks/useLicitaciones';
import useFavoritos from '../hooks/useFavoritos';
import { todayInputFormat, subtractDays } from '../utils/formatters';

export default function LicitacionesPage() {
  const { licitaciones, loading, error, lastUpdate, fetchLicitaciones } = useLicitaciones();
  const { favoritos } = useFavoritos();
  const [selected, setSelected] = useState(null);
  const [filters, setFilters] = useState({
    estado: '',
    fechaDesde: subtractDays(todayInputFormat(), 7),
    fechaHasta: todayInputFormat(),
    busqueda: '',
    codigo: '',
    categoria: [],
    soloFavoritos: false,
  });

  const doFetch = useCallback(() => {
    // Si estamos en modo "sólo favoritos", no golpeamos la API si no queremos, pero como el hook 
    // fetchLicitaciones ya maneja el fetching de lo del día, lo dejamos así.
    if (!filters.soloFavoritos) {
      fetchLicitaciones(filters);
    }
  }, [filters, fetchLicitaciones]);

  useEffect(() => {
    const timeout = setTimeout(doFetch, 1200); // Debounce — esperar que el usuario termine de escribir/cambiar fechas
    return () => clearTimeout(timeout);
  }, [doFetch]);

  return (
    <>
      <Header
        title="Explorar Licitaciones"
        subtitle={lastUpdate ? `${licitaciones.length} resultados · ${lastUpdate.toLocaleTimeString('es-CL')}` : 'Buscando...'}
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
            licitaciones={
              filters.soloFavoritos 
                ? Object.values(favoritos).map(f => f.licitacion).filter(Boolean)
                : licitaciones
            }
            onSelect={setSelected}
            title={filters.soloFavoritos ? "Mis Favoritos" : "Resultados"}
          />
        )}

        {selected && (
          <LicitacionDetail licitacion={selected} onClose={() => setSelected(null)} />
        )}
      </div>
    </>
  );
}
