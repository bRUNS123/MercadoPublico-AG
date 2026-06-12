import { useState, useMemo } from 'react';
import Header from '../components/Layout/Header';
import LicitacionDetail from '../components/Licitaciones/LicitacionDetail';
import StatusBadge from '../components/Common/StatusBadge';
import useFavoritos from '../hooks/useFavoritos';
import useSeguimiento from '../hooks/useSeguimiento';
import { SEGUIMIENTO_ESTADOS } from '../utils/constants';
import { formatFechaCorta, diasRestantes, getMontoInteligente, truncate } from '../utils/formatters';

const FILTER_ALL = '__all__';
const FILTER_SIN_CLASIFICAR = '__sin_clasificar__';

export default function SeguimientoPage() {
  const { favoritos, rateLicitacion, isCollabActive, roomId } = useFavoritos();
  const { seguimiento, setEstadoSeguimiento } = useSeguimiento();
  const [filterEstado, setFilterEstado] = useState(FILTER_ALL);
  const [selected, setSelected] = useState(null);

  // Une favoritos (puntuados) y seguimiento (clasificados) por CodigoExterno
  const items = useMemo(() => {
    const codigos = new Set([...Object.keys(favoritos), ...Object.keys(seguimiento)]);
    return Array.from(codigos)
      .map(codigo => {
        const fav = favoritos[codigo];
        const seg = seguimiento[codigo];
        const licitacion = seg?.licitacion || fav?.licitacion;
        if (!licitacion) return null;
        return {
          licitacion,
          rating: fav?.rating || 0,
          estado: seg?.estado || '',
        };
      })
      .filter(Boolean);
  }, [favoritos, seguimiento]);

  const counts = useMemo(() => {
    const c = { [FILTER_SIN_CLASIFICAR]: 0 };
    Object.keys(SEGUIMIENTO_ESTADOS).forEach(k => { c[k] = 0; });
    items.forEach(i => {
      if (i.estado) c[i.estado] = (c[i.estado] || 0) + 1;
      else c[FILTER_SIN_CLASIFICAR]++;
    });
    return c;
  }, [items]);

  const filtered = useMemo(() => {
    let result = items;
    if (filterEstado === FILTER_SIN_CLASIFICAR) {
      result = result.filter(i => !i.estado);
    } else if (filterEstado !== FILTER_ALL) {
      result = result.filter(i => i.estado === filterEstado);
    }
    return [...result].sort((a, b) => b.rating - a.rating);
  }, [items, filterEstado]);

  const promedio = items.length > 0
    ? (items.reduce((sum, i) => sum + i.rating, 0) / items.length).toFixed(1)
    : null;

  return (
    <>
      <Header
        title="Seguimiento"
        subtitle={`${items.length} oportunidad${items.length !== 1 ? 'es' : ''} en seguimiento${promedio ? ` · Nota promedio: ${promedio}` : ''}`}
      />
      <div className="app-content page-enter">
        <div style={{ padding: '0 24px', marginBottom: 16, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            onClick={() => setFilterEstado(FILTER_ALL)}
            style={{
              fontSize: '0.8rem', padding: '5px 14px', borderRadius: 10, cursor: 'pointer',
              border: '1px solid var(--border-color)',
              background: filterEstado === FILTER_ALL ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
              color: filterEstado === FILTER_ALL ? '#fff' : 'var(--text-muted)',
              fontWeight: filterEstado === FILTER_ALL ? 700 : 400,
            }}
          >
            Todos ({items.length})
          </button>
          {Object.entries(SEGUIMIENTO_ESTADOS).map(([id, cfg]) => (
            <button
              key={id}
              onClick={() => setFilterEstado(filterEstado === id ? FILTER_ALL : id)}
              style={{
                fontSize: '0.8rem', padding: '5px 14px', borderRadius: 10, cursor: 'pointer',
                border: `1px solid ${filterEstado === id ? cfg.color : 'var(--border-color)'}`,
                background: filterEstado === id ? cfg.bg : 'var(--bg-tertiary)',
                color: filterEstado === id ? cfg.color : 'var(--text-muted)',
                fontWeight: filterEstado === id ? 700 : 400,
              }}
            >
              {cfg.icon} {cfg.label} ({counts[id] || 0})
            </button>
          ))}
          <button
            onClick={() => setFilterEstado(filterEstado === FILTER_SIN_CLASIFICAR ? FILTER_ALL : FILTER_SIN_CLASIFICAR)}
            style={{
              fontSize: '0.8rem', padding: '5px 14px', borderRadius: 10, cursor: 'pointer',
              border: '1px solid var(--border-color)',
              background: filterEstado === FILTER_SIN_CLASIFICAR ? 'var(--bg-secondary)' : 'var(--bg-tertiary)',
              color: filterEstado === FILTER_SIN_CLASIFICAR ? 'var(--text-primary)' : 'var(--text-muted)',
              fontWeight: filterEstado === FILTER_SIN_CLASIFICAR ? 700 : 400,
            }}
          >
            Sin clasificar ({counts[FILTER_SIN_CLASIFICAR] || 0})
          </button>
        </div>

        {filtered.length === 0 ? (
          <div className="table-container">
            <div className="empty-state">
              <div className="empty-icon">🗂️</div>
              <div className="empty-title">Sin oportunidades en seguimiento</div>
              <div className="empty-desc">
                Pon una nota o marca un estado (Interesante / En Estudio / Postulada) desde
                Licitaciones o Compras Ágiles para verlas aquí.
              </div>
            </div>
          </div>
        ) : (
          <div className="table-container">
            <div className="table-header" style={{ flexWrap: 'wrap', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div className="table-title">Seguimiento</div>
                <div className="table-count">{filtered.length} resultados</div>
              </div>
              <div style={{ fontSize: '0.85rem', color: isCollabActive ? 'var(--success)' : 'var(--text-muted)' }}>
                {isCollabActive ? '🟢 Sincronizado (Sala: ' + roomId + ')' : '📴 Modo Local'}
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>Código</th>
                    <th>Nombre</th>
                    <th>Estado</th>
                    <th>Tipo</th>
                    <th>Cierre</th>
                    <th>Días</th>
                    <th>Monto (CLP)</th>
                    <th style={{ textAlign: 'center', width: 60 }}>Nota</th>
                    <th style={{ textAlign: 'center', width: 130 }}>Seguimiento</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(({ licitacion: l, rating, estado }) => {
                    const dias = diasRestantes(l.FechaCierre);
                    const monto = getMontoInteligente(l);
                    const getDiasClass = (d) => {
                      if (d === null || d === undefined) return 'cerrado';
                      if (d === 0) return 'cerrado';
                      if (d <= 2) return 'urgente';
                      if (d <= 5) return 'pronto';
                      return 'ok';
                    };
                    return (
                      <tr key={l.CodigoExterno} className="row-clickable" onClick={() => setSelected(l)}>
                        <td className="td-code">{l.CodigoExterno || '—'}</td>
                        <td className="td-name">{truncate(l.Nombre, 65)}</td>
                        <td><StatusBadge codigo={l.CodigoEstado} /></td>
                        <td style={{ fontSize: '0.78rem' }}>{l.Tipo || '—'}</td>
                        <td className="td-fecha">{formatFechaCorta(l.FechaCierre)}</td>
                        <td className={`td-dias ${getDiasClass(dias)}`}>
                          {dias !== null ? (dias === 0 ? 'Cerrado' : `${dias}d`) : '—'}
                        </td>
                        <td className="td-monto">{monto.display}</td>
                        <td style={{ textAlign: 'center' }}>
                          <select
                            value={rating || 0}
                            onChange={(e) => { e.stopPropagation(); rateLicitacion(l, e.target.value); }}
                            onClick={(e) => e.stopPropagation()}
                            style={{
                              padding: '4px', borderRadius: 4, border: '1px solid var(--border-color)',
                              background: 'var(--bg-secondary)', color: rating >= 7 ? 'var(--success)' : 'var(--text-primary)',
                              fontWeight: 'bold', fontSize: '0.85rem'
                            }}
                          >
                            <option value="0">-</option>
                            {[...Array(10)].map((_, i) => (
                              <option key={10-i} value={10-i}>{10-i}</option>
                            ))}
                          </select>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <select
                            value={estado || ''}
                            onChange={(e) => { e.stopPropagation(); setEstadoSeguimiento(l, e.target.value); }}
                            onClick={(e) => e.stopPropagation()}
                            style={{
                              padding: '4px 6px', borderRadius: 4, border: '1px solid var(--border-color)',
                              background: estado ? SEGUIMIENTO_ESTADOS[estado]?.bg : 'var(--bg-secondary)',
                              color: estado ? SEGUIMIENTO_ESTADOS[estado]?.color : 'var(--text-muted)',
                              fontWeight: 600, fontSize: '0.78rem', maxWidth: 130,
                            }}
                          >
                            <option value="">Sin clasificar</option>
                            {Object.entries(SEGUIMIENTO_ESTADOS).map(([id, cfg]) => (
                              <option key={id} value={id}>{cfg.icon} {cfg.label}</option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {selected && (
          <LicitacionDetail licitacion={selected} onClose={() => setSelected(null)} />
        )}
      </div>
    </>
  );
}
