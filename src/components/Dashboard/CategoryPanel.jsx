import { useMemo } from 'react';
import { CATEGORIAS_INTERES } from '../../utils/constants';
import { getCategoryMatches } from '../../utils/formatters';
import useCategoryVotes from '../../hooks/useCategoryVotes';
import useFavoritos from '../../hooks/useFavoritos';
import usePatterns from '../../hooks/usePatterns';

const CATEGORIA_COLORS = {
  construccion: { color: '#f97316', bg: 'rgba(249,115,22,0.15)' },
  ingenieria:   { color: '#3b82f6', bg: 'rgba(59,130,246,0.2)' },
  ito_ite:      { color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' },
  mantencion:   { color: '#14b8a6', bg: 'rgba(20,184,166,0.15)' },
  consultoria:  { color: '#a855f7', bg: 'rgba(168,85,247,0.15)' },
  suministros:  { color: '#94a3b8', bg: 'rgba(148,163,184,0.15)' },
};
const _CAT_FALLBACK = { color: '#64748b', bg: 'rgba(100,116,139,0.15)' };

export default function CategoryPanel({ licitaciones = [] }) {
  const { favoritos } = useFavoritos();
  const { catVotes, voteCategory, getVotes } = useCategoryVotes();
  const { getScores, patterns } = usePatterns(favoritos, catVotes);

  // Para cada categoría: contar licitaciones detectadas (auto + comunidad) y votos acumulados
  const stats = useMemo(() => {
    return CATEGORIAS_INTERES.map(cat => {
      let autoCount = 0;
      let communityCount = 0;
      let totalVotes = 0;
      let totalConfirmed = 0;

      licitaciones.forEach(l => {
        const auto = getCategoryMatches(l).find(m => m.id === cat.id);
        const cs = getScores(l)[cat.id];
        const v = getVotes(l.CodigoExterno, cat.id);

        if (auto) autoCount++;
        else if (cs && cs.score >= 25) communityCount++;

        totalVotes += v.total;
        totalConfirmed += v.confirmed;
      });

      const sampleSize = patterns[cat.id]?.__count || 0;

      return {
        ...cat,
        autoCount,
        communityCount,
        totalDetected: autoCount + communityCount,
        totalVotes,
        totalConfirmed,
        sampleSize,
      };
    }).sort((a, b) => b.totalDetected - a.totalDetected);
  }, [licitaciones, getScores, getVotes, patterns]);

  const maxDetected = Math.max(...stats.map(s => s.totalDetected), 1);

  return (
    <div className="table-container" style={{ marginBottom: 24 }}>
      <div className="table-header">
        <div className="table-title">Distribución por Categoría</div>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          Haz clic en ✓ para confirmar · El sistema aprende de tus votos
        </div>
      </div>

      <div style={{ padding: '0 4px 12px' }}>
        {stats.map(cat => {
          const c = CATEGORIA_COLORS[cat.id] || _CAT_FALLBACK;
          const barW = maxDetected > 0 ? (cat.totalDetected / maxDetected) * 100 : 0;
          const isIng = cat.id === 'ingenieria';

          return (
            <div key={cat.id} style={{ marginBottom: 14 }}>
              {/* Cabecera de fila */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{
                    fontSize: '0.78rem', fontWeight: isIng ? 700 : 600,
                    color: c.color, minWidth: 130,
                  }}>
                    {isIng ? '★ ' : ''}{cat.label}
                  </span>

                  {/* Conteos */}
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    {cat.autoCount > 0 && <span title="Detectadas por palabras clave">A:{cat.autoCount}</span>}
                    {cat.communityCount > 0 && <span title="Detectadas por aprendizaje" style={{ marginLeft: 6, color: c.color }}>C:{cat.communityCount}↑</span>}
                    {cat.sampleSize > 0 && <span title={`${cat.sampleSize} ejemplos aprendidos`} style={{ marginLeft: 6, opacity: 0.6 }}>({cat.sampleSize} ej.)</span>}
                  </span>
                </div>

                {/* Votos globales */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {cat.totalConfirmed > 0 && (
                    <span style={{ fontSize: '0.72rem', color: c.color, fontWeight: 600 }}>
                      ✓ {cat.totalConfirmed} confirmaciones
                    </span>
                  )}
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)', minWidth: 30, textAlign: 'right' }}>
                    {cat.totalDetected}
                  </span>
                </div>
              </div>

              {/* Barra de progreso */}
              <div style={{ height: 6, borderRadius: 3, background: 'var(--bg-tertiary)', overflow: 'hidden' }}>
                <div style={{ display: 'flex', height: '100%' }}>
                  <div style={{ width: `${(cat.autoCount / maxDetected) * 100}%`, background: c.color, opacity: 0.9, transition: 'width 0.4s' }} />
                  <div style={{ width: `${(cat.communityCount / maxDetected) * 100}%`, background: c.color, opacity: 0.45, transition: 'width 0.4s' }} />
                </div>
              </div>

              {/* Licitaciones de esta categoría para votar directo */}
              {cat.totalDetected > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
                  {licitaciones
                    .filter(l => {
                      const auto = getCategoryMatches(l).find(m => m.id === cat.id);
                      const cs = getScores(l)[cat.id];
                      return auto || (cs && cs.score >= 25);
                    })
                    .slice(0, 8)
                    .map(l => {
                      const votes = getVotes(l.CodigoExterno, cat.id);
                      return (
                        <button
                          key={l.CodigoExterno}
                          onClick={() => voteCategory(l.CodigoExterno, cat.id)}
                          title={votes.myVote ? 'Quitar confirmación' : `Confirmar como ${cat.label}`}
                          style={{
                            fontSize: '0.65rem', padding: '2px 8px', borderRadius: 6, cursor: 'pointer',
                            border: `1px solid ${votes.myVote ? c.color : 'var(--border-color)'}`,
                            background: votes.myVote ? c.bg : 'var(--bg-tertiary)',
                            color: votes.myVote ? c.color : 'var(--text-muted)',
                            fontWeight: votes.myVote ? 700 : 400,
                            maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          }}
                        >
                          {votes.myVote ? '✓ ' : ''}{l.Nombre?.slice(0, 40) || l.CodigoExterno}
                          {votes.confirmed > 1 ? ` (${votes.confirmed})` : ''}
                        </button>
                      );
                    })}
                  {cat.totalDetected > 8 && (
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', alignSelf: 'center' }}>
                      +{cat.totalDetected - 8} más
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
