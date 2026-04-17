import { CATEGORIAS_INTERES } from '../../utils/constants';
import { todayInputFormat, subtractDays } from '../../utils/formatters';

export default function FilterBar({ filters, onChange }) {
  const handleChange = (key, value) => {
    onChange({ ...filters, [key]: value });
  };

  const toggleCategory = (catId) => {
    const current = filters.categoria || [];
    const next = current.includes(catId)
      ? current.filter(id => id !== catId)
      : [...current, catId];
    handleChange('categoria', next);
  };

  const today = todayInputFormat();

  return (
    <div className="filter-bar">
      <div className="filter-group">
        <label className="filter-label">Estado</label>
        <select
          className="filter-select"
          value={filters.estado || ''}
          onChange={e => handleChange('estado', e.target.value)}
        >
          <option value="">Todos los estados</option>
          <option value="activas">Activas (Publicadas)</option>
          <option value="publicada">Publicada</option>
          <option value="cerrada">Cerrada</option>
          <option value="adjudicada">Adjudicada</option>
          <option value="desierta">Desierta</option>
          <option value="revocada">Revocada</option>
          <option value="suspendida">Suspendida</option>
        </select>
      </div>

      <div className="filter-group">
        <label className="filter-label">Desde</label>
        <input
          type="date"
          className="filter-input"
          value={filters.fechaDesde || subtractDays(today, 7)}
          max={filters.fechaHasta || today}
          onChange={e => handleChange('fechaDesde', e.target.value)}
        />
      </div>

      <div className="filter-group">
        <label className="filter-label">Hasta</label>
        <input
          type="date"
          className="filter-input"
          value={filters.fechaHasta || today}
          min={filters.fechaDesde}
          max={today}
          onChange={e => handleChange('fechaHasta', e.target.value)}
        />
      </div>

      <div className="filter-group" style={{ minWidth: 220 }}>
        <label className="filter-label">Buscar por nombre</label>
        <input
          type="text"
          className="filter-input"
          placeholder="Ej: construcción, pavimento..."
          value={filters.busqueda || ''}
          onChange={e => handleChange('busqueda', e.target.value)}
        />
      </div>

      <div className="filter-group" style={{ minWidth: 180 }}>
        <label className="filter-label">Código licitación</label>
        <input
          type="text"
          className="filter-input"
          placeholder="Ej: 1509-5-L114"
          value={filters.codigo || ''}
          onChange={e => handleChange('codigo', e.target.value)}
        />
      </div>

      <div className="filter-group" style={{ flex: 1, minWidth: 300 }}>
        <label className="filter-label">Categorías Rápidas</label>
        <div className="category-chips">
          {CATEGORIAS_INTERES.map(cat => (
            <button
              key={cat.id}
              className={`category-chip ${(filters.categoria || []).includes(cat.id) ? 'active' : ''}`}
              onClick={() => toggleCategory(cat.id)}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      <div className="filter-group" style={{ minWidth: 'auto' }}>
        <label className="filter-label">&nbsp;</label>
        <button
          className="btn btn-secondary btn-sm"
          onClick={() => onChange({ estado: '', fechaDesde: subtractDays(today, 7), fechaHasta: today, busqueda: '', codigo: '', categoria: [] })}
        >
          Limpiar
        </button>
      </div>
    </div>
  );
}
