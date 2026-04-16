import { ESTADOS } from '../../utils/constants';
import { getMontoInteligente, formatMontoCompacto } from '../../utils/formatters';

export default function KPICards({ licitaciones = [] }) {
  const total = licitaciones.length;
  const publicadas = licitaciones.filter(l => l.CodigoEstado === 5).length;
  const adjudicadas = licitaciones.filter(l => l.CodigoEstado === 8).length;

  // Calcular monto total estimado en CLP (con conversión inteligente)
  let montoTotal = 0;
  let conMonto = 0;
  licitaciones.forEach(l => {
    const m = getMontoInteligente(l);
    if (m.clpValue > 0) {
      montoTotal += m.clpValue;
      conMonto++;
    }
  });

  const cards = [
    {
      label: 'Total Licitaciones',
      value: total.toLocaleString('es-CL'),
      detail: 'resultados en consulta',
      icon: '📋',
      iconBg: 'rgba(14, 165, 233, 0.15)',
    },
    {
      label: 'Publicadas',
      value: publicadas.toLocaleString('es-CL'),
      detail: `${total > 0 ? ((publicadas / total) * 100).toFixed(0) : 0}% del total`,
      icon: '🟢',
      iconBg: 'rgba(34, 197, 94, 0.15)',
    },
    {
      label: 'Adjudicadas',
      value: adjudicadas.toLocaleString('es-CL'),
      detail: `${total > 0 ? ((adjudicadas / total) * 100).toFixed(0) : 0}% del total`,
      icon: '🔵',
      iconBg: 'rgba(59, 130, 246, 0.15)',
    },
    {
      label: 'Monto Total Estimado',
      value: montoTotal > 0
        ? formatMontoCompacto(montoTotal)
        : '—',
      detail: montoTotal > 0 ? `${conMonto} licitaciones con monto · $${montoTotal.toLocaleString('es-CL', { maximumFractionDigits: 0 })}` : 'No disponible',
      icon: '💰',
      iconBg: 'rgba(234, 179, 8, 0.15)',
    },
  ];

  return (
    <div className="kpi-grid">
      {cards.map((card, i) => (
        <div className="kpi-card" key={i}>
          <div className="kpi-icon" style={{ background: card.iconBg }}>
            {card.icon}
          </div>
          <div className="kpi-label">{card.label}</div>
          <div className="kpi-value">{card.value}</div>
          <div className="kpi-detail">{card.detail}</div>
        </div>
      ))}
    </div>
  );
}
