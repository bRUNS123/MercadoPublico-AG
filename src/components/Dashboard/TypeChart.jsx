import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip } from 'chart.js';
import { TIPOS } from '../../utils/constants';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip);

export default function TypeChart({ licitaciones = [] }) {
  // Contar por tipo
  const counts = {};
  licitaciones.forEach(l => {
    const tipo = l.Tipo || 'N/D';
    counts[tipo] = (counts[tipo] || 0) + 1;
  });

  const tipos = Object.entries(counts)
    .map(([code, count]) => ({
      code,
      count,
      label: TIPOS[code] || code,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8); // Top 8

  const data = {
    labels: tipos.map(t => t.code),
    datasets: [{
      data: tipos.map(t => t.count),
      backgroundColor: 'rgba(14, 165, 233, 0.3)',
      borderColor: 'rgba(14, 165, 233, 0.8)',
      borderWidth: 1,
      borderRadius: 6,
      hoverBackgroundColor: 'rgba(14, 165, 233, 0.5)',
    }],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y',
    plugins: {
      legend: { display: false },
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
          title: (items) => {
            const code = items[0].label;
            return TIPOS[code] || code;
          },
          label: (ctx) => ` ${ctx.parsed.x} licitaciones`,
        },
      },
    },
    scales: {
      x: {
        grid: { color: 'rgba(148,163,184,0.08)' },
        ticks: {
          color: '#64748b',
          font: { family: 'Inter', size: 11 },
        },
      },
      y: {
        grid: { display: false },
        ticks: {
          color: '#94a3b8',
          font: { family: 'Inter', size: 12, weight: 500 },
        },
      },
    },
  };

  if (tipos.length === 0) {
    return (
      <div className="chart-card">
        <div className="chart-card-title">📈 Por Tipo de Licitación</div>
        <div className="empty-state" style={{ padding: '40px 20px' }}>
          <div className="empty-icon">📈</div>
          <div className="empty-desc">Sin datos disponibles</div>
        </div>
      </div>
    );
  }

  return (
    <div className="chart-card">
      <div className="chart-card-title">📈 Top Tipos de Licitación</div>
      <div className="chart-wrapper" style={{ height: 260 }}>
        <Bar data={data} options={options} />
      </div>
    </div>
  );
}
