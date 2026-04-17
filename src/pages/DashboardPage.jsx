import { useState, useEffect } from 'react';
import Header from '../components/Layout/Header';
import KPICards from '../components/Dashboard/KPICards';
import StatusChart from '../components/Dashboard/StatusChart';
import TypeChart from '../components/Dashboard/TypeChart';
import LicitacionesTable from '../components/Licitaciones/LicitacionesTable';
import LicitacionDetail from '../components/Licitaciones/LicitacionDetail';
import CategoryPanel from '../components/Dashboard/CategoryPanel';
import Loader from '../components/Common/Loader';
import useLicitaciones from '../hooks/useLicitaciones';

export default function DashboardPage() {
  const { licitaciones, loading, error, lastUpdate, fetchLicitaciones } = useLicitaciones();
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    fetchLicitaciones({ estado: 'activas' });

    // Auto-refresh cada 5 minutos
    const interval = setInterval(() => {
      fetchLicitaciones({ estado: 'activas' });
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [fetchLicitaciones]);

  return (
    <>
      <Header
        title="Dashboard"
        subtitle={lastUpdate ? `Última actualización: ${lastUpdate.toLocaleTimeString('es-CL')}` : 'Cargando datos...'}
      />
      <div className="app-content page-enter">
        {error && (
          <div className="error-banner">
            ⚠️ {error}
          </div>
        )}

        {loading ? (
          <>
            <div className="kpi-grid">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="kpi-card">
                  <div className="skeleton" style={{ width: 40, height: 40, borderRadius: 8, marginBottom: 14 }}></div>
                  <div className="skeleton skeleton-text-sm" style={{ width: '50%' }}></div>
                  <div className="skeleton" style={{ width: '70%', height: 28, borderRadius: 6, marginTop: 8 }}></div>
                </div>
              ))}
            </div>
            <Loader />
          </>
        ) : (
          <>
            <KPICards licitaciones={licitaciones} />

            <div className="charts-grid">
              <StatusChart licitaciones={licitaciones} />
              <TypeChart licitaciones={licitaciones} />
            </div>

            <CategoryPanel licitaciones={licitaciones} />

            <LicitacionesTable
              licitaciones={licitaciones.slice(0, 50)}
              onSelect={setSelected}
              title="Últimas Licitaciones Activas"
            />
          </>
        )}

        {selected && (
          <LicitacionDetail licitacion={selected} onClose={() => setSelected(null)} />
        )}
      </div>
    </>
  );
}
