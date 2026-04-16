import { ESTADOS } from '../../utils/constants';

export default function StatusBadge({ codigo }) {
  const estado = ESTADOS[codigo];
  if (!estado) return <span className="status-badge">{codigo}</span>;

  return (
    <span
      className="status-badge"
      style={{ background: estado.bg, color: estado.color }}
    >
      <span className="status-dot" style={{ background: estado.color }}></span>
      {estado.nombre}
    </span>
  );
}
