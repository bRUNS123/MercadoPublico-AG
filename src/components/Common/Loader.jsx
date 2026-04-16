export default function Loader({ text = 'Cargando licitaciones...' }) {
  return (
    <div className="loader-container">
      <div className="loader-spinner"></div>
      <div className="loader-text">{text}</div>
    </div>
  );
}

export function SkeletonCards({ count = 4 }) {
  return (
    <div className="kpi-grid">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="kpi-card">
          <div className="skeleton" style={{ width: 40, height: 40, borderRadius: 8, marginBottom: 14 }}></div>
          <div className="skeleton skeleton-text-sm" style={{ width: '50%' }}></div>
          <div className="skeleton skeleton-text" style={{ width: '70%', height: 28 }}></div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonTable({ rows = 5 }) {
  return (
    <div className="table-container">
      <div className="table-header">
        <div className="skeleton skeleton-text" style={{ width: 200 }}></div>
      </div>
      <div style={{ padding: '16px 24px' }}>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
            <div className="skeleton" style={{ width: 100, height: 14 }}></div>
            <div className="skeleton" style={{ flex: 1, height: 14 }}></div>
            <div className="skeleton" style={{ width: 80, height: 14 }}></div>
            <div className="skeleton" style={{ width: 100, height: 14 }}></div>
          </div>
        ))}
      </div>
    </div>
  );
}
