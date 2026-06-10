import { CATEGORIAS_INTERES, REGIONES } from '../../utils/constants';

const ESTADOS_CA_OPCIONES = [
  { value: '', label: 'Todos los estados' },
  { value: 'publicada', label: 'Publicada' },
  { value: 'cerrada', label: 'Cerrada' },
  { value: 'desierta', label: 'Desierta' },
  { value: 'proveedor_seleccionado', label: 'Proveedor seleccionado' },
  { value: 'cancelada', label: 'Cancelada' },
];

export default function FilterBarCompraAgil({ filters, onChange, onRefresh, loading }) {
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

  return (
    <div className="filter-bar">
      <div className="filter-group">
        <label className="filter-label">Estado</label>
        <select
          className="filter-select"
          value={filters.estado || ''}
          onChange={e => handleChange('estado', e.target.value)}
        >
          {ESTADOS_CA_OPCIONES.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      <div className="filter-group">
        <label className="filter-label">Región</label>
        <select
          className="filter-select"
          value={filters.region || ''}
          onChange={e => handleChange('region', e.target.value)}
        >
          <option value="">Todas las regiones</option>
          {Object.entries(REGIONES).map(([codigo, nombre]) => (
            <option key={codigo} value={codigo}>{nombre}</option>
          ))}
        </select>
      </div>

      <div className="filter-group" style={{ minWidth: 220 }}>
        <label className="filter-label">Buscar por nombre</label>
        <input
          type="text"
          className="filter-input"
          placeholder="Ej: pintura, materiales..."
          value={filters.busqueda || ''}
          onChange={e => handleChange('busqueda', e.target.value)}
        />
      </div>

      <div className="filter-group" style={{ minWidth: 180 }}>
        <label className="filter-label">Código Compra Ágil</label>
        <input
          type="text"
          className="filter-input"
          placeholder="Ej: 1234-5-COT26"
          value={filters.codigo || ''}
          onChange={e => handleChange('codigo', e.target.value)}
        />
      </div>

      <div className="filter-group" style={{ flex: 1, minWidth: 300 }}>
        <label className="filter-label">
          Categorías Rápidas
          {(filters.categoria || []).length > 0 && (
            <span style={{ marginLeft: 6, fontSize: '0.7rem', background: 'var(--accent-primary)', color: '#fff', borderRadius: 10, padding: '1px 7px', fontWeight: 700 }}>
              {(filters.categoria || []).length} activa{(filters.categoria || []).length > 1 ? 's' : ''}
            </span>
          )}
        </label>
        <div className="category-chips">
          {CATEGORIAS_INTERES.map(cat => (
            <button
              key={cat.id}
              className={`category-chip ${(filters.categoria || []).includes(cat.id) ? 'active' : ''}`}
              onClick={() => toggleCategory(cat.id)}
              title={`Filtrar por: ${cat.label}`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      <div className="filter-group" style={{ minWidth: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
        <label className="filter-label">&nbsp;</label>
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => onChange({ estado: 'publicada', region: '', busqueda: '', codigo: '', categoria: [], soloFavoritos: false })}
          >
            Limpiar
          </button>
          {onRefresh && (
            <button
              className="btn btn-primary btn-sm"
              onClick={onRefresh}
              disabled={loading}
              title="Limpiar caché y buscar de nuevo"
            >
              {loading ? '...' : '↺ Refresh'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
