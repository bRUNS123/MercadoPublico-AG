import { useState, useEffect, useCallback, useMemo } from 'react';
import Header from '../components/Layout/Header';
import FilterBarCompraAgil from '../components/Licitaciones/FilterBarCompraAgil';
import LicitacionesTable from '../components/Licitaciones/LicitacionesTable';
import LicitacionDetail from '../components/Licitaciones/LicitacionDetail';
import Loader from '../components/Common/Loader';
import useComprasAgiles from '../hooks/useComprasAgiles';
import useFavoritos from '../hooks/useFavoritos';
import useDescartados from '../hooks/useDescartados';
import { norm } from '../utils/formatters';
import { CATEGORIAS_INTERES } from '../utils/constants';
import compraAgilApi from '../api/compraAgil';

const FILTERS_DEFAULT = {
  estado: 'publicada',
  region: '',
  busqueda: '',
  codigo: '',
  categoria: [],
  soloFavoritos: false,
};

export default function ComprasAgilesPage() {
  const { comprasAgiles, loading, error, lastUpdate, fetchedAt, fetchComprasAgiles } = useComprasAgiles();
  const { favoritos, rateLicitacion, isCollabActive, roomId } = useFavoritos();
  const { descartados, descartarLicitacion } = useDescartados();
  const [selected, setSelected] = useState(null);
  const [filters, setFilters] = useState(FILTERS_DEFAULT);
  const [showDescartadasPanel, setShowDescartadasPanel] = useState(false);

  // En producción se lee un snapshot estático (no requiere ticket).
  const sinTicket = import.meta.env.DEV && !compraAgilApi.ticket;

  // ── Efecto (DEV): re-fetch desde la API en vivo solo cuando cambian parámetros que requieren red ──
  // busqueda y categoria NO están aquí — se filtran en cliente sin tocar la API
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    if (sinTicket || filters.soloFavoritos) return;
    const timeout = setTimeout(() => {
      fetchComprasAgiles({
        estado: filters.estado,
        region: filters.region,
        codigo: filters.codigo,
      });
    }, 800);
    return () => clearTimeout(timeout);
  }, [filters.estado, filters.region, filters.codigo, filters.soloFavoritos, sinTicket, fetchComprasAgiles]);

  // ── Efecto (PROD): carga única del snapshot estático ──
  useEffect(() => {
    if (import.meta.env.DEV) return;
    fetchComprasAgiles();
  }, [fetchComprasAgiles]);

  // ── Filtrado client-side: instantáneo, sin API ──
  const comprasFiltradas = useMemo(() => {
    let result = comprasAgiles;

    if (!import.meta.env.DEV) {
      // En producción estado/región/código se filtran sobre el snapshot (estado siempre es "publicada")
      if (filters.estado) {
        result = result.filter(l => l._raw?.estado?.codigo === filters.estado);
      }
      if (filters.region) {
        result = result.filter(l => String(l._raw?.institucion?.region ?? '') === filters.region);
      }
      if (filters.codigo) {
        const q = norm(filters.codigo);
        result = result.filter(l => norm(l.CodigoExterno || '').includes(q));
      }
    }

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
  }, [comprasAgiles, filters.busqueda, filters.categoria, filters.estado, filters.region, filters.codigo]);

  // Refresh manual
  const handleRefresh = useCallback(() => {
    if (!import.meta.env.DEV) {
      fetchComprasAgiles();
      return;
    }
    compraAgilApi._clearOldCache();
    fetchComprasAgiles({
      estado: filters.estado,
      region: filters.region,
      codigo: filters.codigo,
    });
  }, [filters, fetchComprasAgiles]);

  const hasActiveFilters = filters.categoria.length > 0 || filters.busqueda || filters.region || filters.codigo;
  const descartadasList = Object.values(descartados).map(d => d.licitacion).filter(l => l?._esCompraAgil);

  const displayList = filters.soloFavoritos
    ? Object.values(favoritos).map(f => f.licitacion).filter(l => l?._esCompraAgil)
    : comprasFiltradas;

  const subtitle = sinTicket
    ? 'Falta configurar el ticket de Compra Ágil'
    : loading
      ? 'Buscando oportunidades de Compra Ágil...'
      : lastUpdate
        ? `${comprasFiltradas.length} resultado${comprasFiltradas.length !== 1 ? 's' : ''}${filters.categoria.length > 0 || filters.busqueda ? ` (filtrado de ${comprasAgiles.length})` : ''} · ${lastUpdate.toLocaleTimeString('es-CL')}`
        : 'Sin datos';

  return (
    <>
      <Header title="Compras Ágiles" subtitle={subtitle} />
      <div className="app-content page-enter">
        {sinTicket && (
          <div className="warning-banner">
            ⚠️ No se ha configurado el ticket de la API Compra Ágil. Ve a{' '}
            <a href="#/configuracion">Configuración</a> para ingresarlo.
          </div>
        )}

        {!import.meta.env.DEV && fetchedAt && (
          <div className="info-banner">
            📡 Datos de Compra Ágil (estado "Publicada") actualizados periódicamente desde un
            equipo con IP chilena · última actualización: {fetchedAt.toLocaleString('es-CL')}
          </div>
        )}

        {error && <div className="error-banner">⚠️ {error}</div>}

        <FilterBarCompraAgil
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

        {!sinTicket && loading && !filters.soloFavoritos ? (
          <Loader text="Buscando oportunidades de Compra Ágil..." />
        ) : (
          <LicitacionesTable
            licitaciones={displayList}
            onSelect={setSelected}
            title={filters.soloFavoritos ? 'Mis Favoritos' : 'Compras Ágiles Publicadas'}
            hasActiveFilters={hasActiveFilters}
            onClearFilters={() => setFilters(FILTERS_DEFAULT)}
            onRefresh={sinTicket ? undefined : handleRefresh}
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
