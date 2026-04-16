import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { ESTADOS } from '../../utils/constants';

ChartJS.register(ArcElement, Tooltip, Legend);

export default function StatusChart({ licitaciones = [] }) {
  // Contar por estado
  const counts = {};
  licitaciones.forEach(l => {
    const code = l.CodigoEstado;
    counts[code] = (counts[code] || 0) + 1;
  });

  const estados = Object.entries(counts)
    .map(([code, count]) => ({
      code: Number(code),
      count,
      ...(ESTADOS[code] || { nombre: `Estado ${code}`, color: '#64748b' }),
    }))
    .sort((a, b) => b.count - a.count);

  const data = {
    labels: estados.map(e => e.nombre),
    datasets: [{
      data: estados.map(e => e.count),
      backgroundColor: estados.map(e => e.color + '88'),
      borderColor: estados.map(e => e.color),
      borderWidth: 2,
      hoverOffset: 6,
    }],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '65%',
    plugins: {
      legend: {
        position: 'right',
        labels: {
          color: '#94a3b8',
          font: { family: 'Inter', size: 12 },
          padding: 14,
          usePointStyle: true,
          pointStyleWidth: 10,
        },
      },
      tooltip: {
        backgroundColor: '#1e293b',
        titleColor: '#f1f5f9',
        bodyColor: '#94a3b8',
        borderColor: 'rgba(148,163,184,0.2)',
        borderWidth: 1,
        padding: 12,
        cornerRadius: 8,
        titleFont: { family: 'Inter', weight: 600 },
        bodyFont: { family: 'Inter' },
        callbacks: {
          label: (ctx) => {
            const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
            const pct = ((ctx.parsed / total) * 100).toFixed(1);
            return ` ${ctx.label}: ${ctx.parsed} (${pct}%)`;
          },
        },
      },
    },
  };

  if (estados.length === 0) {
    return (
      <div className="chart-card">
        <div className="chart-card-title">📊 Distribución por Estado</div>
        <div className="empty-state" style={{ padding: '40px 20px' }}>
          <div className="empty-icon">📊</div>
          <div className="empty-desc">Sin datos disponibles</div>
        </div>
      </div>
    );
  }

  return (
    <div className="chart-card">
      <div className="chart-card-title">📊 Distribución por Estado</div>
      <div className="chart-wrapper" style={{ height: 260 }}>
        <Doughnut data={data} options={options} />
      </div>
    </div>
  );
}
