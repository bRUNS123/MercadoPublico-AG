import { NavLink, useLocation } from 'react-router-dom';
import api from '../../api/mercadopublico';

export default function Sidebar() {
  const location = useLocation();
  const requestsToday = api.getRequestsToday();
  const remaining = api.getRequestsRemaining();

  return (
    <aside className="app-sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-brand-icon">LB</div>
        <div>
          <div className="sidebar-brand-text">LicitaBoard</div>
          <div className="sidebar-brand-sub">MercadoPúblico Chile</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        <div className="sidebar-section">Principal</div>

        <NavLink to="/" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`} end>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" rx="1"/>
            <rect x="14" y="3" width="7" height="7" rx="1"/>
            <rect x="3" y="14" width="7" height="7" rx="1"/>
            <rect x="14" y="14" width="7" height="7" rx="1"/>
          </svg>
          Dashboard
        </NavLink>

        <NavLink to="/licitaciones" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14,2 14,8 20,8"/>
            <line x1="16" y1="13" x2="8" y2="13"/>
            <line x1="16" y1="17" x2="8" y2="17"/>
          </svg>
          Licitaciones
        </NavLink>

        <div className="sidebar-section">Sistema</div>

        <NavLink to="/configuracion" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.32 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
          Configuración
        </NavLink>
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-api-status">
          <span className="sidebar-api-dot" style={{ background: remaining > 0 ? '#22c55e' : '#ef4444' }}></span>
          <span>API {remaining > 0 ? 'Conectada' : 'Límite alcanzado'}</span>
        </div>
        <span>{requestsToday.toLocaleString()} / 10.000 requests hoy</span>
      </div>
    </aside>
  );
}
