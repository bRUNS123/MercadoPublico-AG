import { useState } from 'react';
import Header from '../components/Layout/Header';
import api from '../api/mercadopublico';

export default function SettingsPage() {
  const [ticket, setTicket] = useState(import.meta.env.VITE_API_TICKET || '');
  const [validating, setValidating] = useState(false);
  const [result, setResult] = useState(null);

  const handleValidate = async () => {
    if (!ticket.trim()) return;
    setValidating(true);
    setResult(null);
    const res = await api.validarTicket(ticket.trim());
    setResult(res);
    setValidating(false);
  };

  const requestsToday = api.getRequestsToday();
  const remaining = api.getRequestsRemaining();

  return (
    <>
      <Header title="Configuración" subtitle="Administra tu conexión con la API de MercadoPúblico" />
      <div className="app-content page-enter">
        {/* Ticket Section */}
        <div className="settings-section">
          <div className="settings-title">🔑 Ticket de API</div>
          <div className="settings-desc">
            Tu ticket de acceso a la API de MercadoPúblico. Puedes solicitar uno en{' '}
            <a href="https://api.mercadopublico.cl/modules/IniciarSesion.aspx" target="_blank" rel="noopener">
              api.mercadopublico.cl
            </a>
          </div>
          <div className="settings-field">
            <input
              type="text"
              className="settings-input"
              value={ticket}
              onChange={e => setTicket(e.target.value)}
              placeholder="Ej: 25D6C503-FA30-48BD-86FA-0A1D74D54254"
            />
            <button className="btn btn-primary" onClick={handleValidate} disabled={validating}>
              {validating ? 'Validando...' : 'Validar'}
            </button>
          </div>

          {result && (
            result.valid ? (
              <div className="success-banner">
                ✅ Ticket válido. Se encontraron {result.cantidad} licitaciones activas.
              </div>
            ) : (
              <div className="error-banner">
                ❌ Ticket inválido: {result.error}
              </div>
            )
          )}
        </div>

        {/* API Stats */}
        <div className="settings-section">
          <div className="settings-title">📊 Uso de la API</div>
          <div className="settings-desc">
            La API tiene un límite de 10.000 solicitudes por día por ticket.
          </div>
          <div className="api-stats">
            <div className="api-stat">
              <div className="api-stat-value">{requestsToday.toLocaleString()}</div>
              <div className="api-stat-label">Solicitudes hoy</div>
            </div>
            <div className="api-stat">
              <div className="api-stat-value" style={{ color: remaining > 1000 ? 'var(--success)' : remaining > 100 ? 'var(--warning)' : 'var(--danger)' }}>
                {remaining.toLocaleString()}
              </div>
              <div className="api-stat-label">Disponibles</div>
            </div>
            <div className="api-stat">
              <div className="api-stat-value">{((requestsToday / 10000) * 100).toFixed(1)}%</div>
              <div className="api-stat-label">Uso del día</div>
            </div>
          </div>
        </div>

        {/* Info Section */}
        <div className="settings-section">
          <div className="settings-title">ℹ️ Acerca de LicitaBoard</div>
          <div className="settings-desc" style={{ marginBottom: 0 }}>
            Dashboard para visualizar y clasificar licitaciones de{' '}
            <a href="https://www.mercadopublico.cl" target="_blank" rel="noopener">MercadoPúblico</a>{' '}
            (ChileCompra). Desarrollado para facilitar el seguimiento de oportunidades en construcción,
            ingeniería civil y otros rubros.
          </div>
          <div style={{ marginTop: 16, display: 'flex', gap: 12 }}>
            <a href="https://api.mercadopublico.cl" target="_blank" rel="noopener" className="btn btn-secondary btn-sm">
              📄 Documentación API
            </a>
            <a href="https://github.com/bRUNS123" target="_blank" rel="noopener" className="btn btn-secondary btn-sm">
              🐙 GitHub
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
