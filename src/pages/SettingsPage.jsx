import { useState } from 'react';
import Header from '../components/Layout/Header';
import api from '../api/mercadopublico';
import compraAgilApi from '../api/compraAgil';

export default function SettingsPage() {
  const [ticket, setTicket] = useState(import.meta.env.VITE_API_TICKET || '');
  const [validating, setValidating] = useState(false);
  const [result, setResult] = useState(null);

  const [ticketCA, setTicketCA] = useState(import.meta.env.VITE_API_TICKET_COMPRA_AGIL || import.meta.env.VITE_API_TICKET || '');
  const [validatingCA, setValidatingCA] = useState(false);
  const [resultCA, setResultCA] = useState(null);

  const handleValidate = async () => {
    if (!ticket.trim()) return;
    setValidating(true);
    setResult(null);
    const res = await api.diagnosticar(ticket.trim());
    setResult(res);
    setValidating(false);
  };

  const handleValidateCA = async () => {
    if (!ticketCA.trim()) return;
    setValidatingCA(true);
    setResultCA(null);
    const res = await compraAgilApi.diagnosticar(ticketCA.trim());
    if (res.ok) compraAgilApi.setTicket(ticketCA.trim());
    setResultCA(res);
    setValidatingCA(false);
  };

  const requestsToday = api.getRequestsToday();
  const remaining = api.getRequestsRemaining();
  const requestsTodayCA = compraAgilApi.getRequestsToday();
  const remainingCA = compraAgilApi.getRequestsRemaining();

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
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 5 }}>
                  {result.ticketOk === true ? '✅' : result.ticketOk === false ? '❌' : '⚠️'}
                  <strong>Ticket:</strong> {result.ticketOk === true ? 'Válido' : result.ticketOk === false ? 'Inválido' : 'No verificado'}
                </span>
                <span style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 5 }}>
                  {result.serverOk === true ? '✅' : '❌'}
                  <strong>Servidor MercadoPúblico:</strong> {result.serverOk === true ? 'Operativo' : 'Caído / Sin acceso'}
                </span>
                {result.ok && (
                  <span style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 5 }}>
                    📋 <strong>Licitaciones activas:</strong> {result.cantidad}
                  </span>
                )}
              </div>
              {result.error && (
                <div className={result.ticketOk === false ? 'error-banner' : 'warning-banner'} style={{ marginTop: 0 }}>
                  {result.ticketOk === false ? '❌' : '⚠️'} {result.error}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Ticket Compra Ágil Section */}
        <div className="settings-section">
          <div className="settings-title">⚡ Ticket de API Compra Ágil (Beta)</div>
          <div className="settings-desc">
            Usa el mismo ticket que la API de Licitaciones (funciona también contra
            <code> api2.mercadopublico.cl</code>). Si ChileCompra te entrega un ticket
            distinto para Compra Ágil, ingrésalo aquí y será el que se use.
          </div>
          <div className="settings-field">
            <input
              type="text"
              className="settings-input"
              value={ticketCA}
              onChange={e => setTicketCA(e.target.value)}
              placeholder="Ticket de Compra Ágil"
            />
            <button className="btn btn-primary" onClick={handleValidateCA} disabled={validatingCA}>
              {validatingCA ? 'Validando...' : 'Validar'}
            </button>
          </div>

          {resultCA && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 5 }}>
                  {resultCA.ticketOk === true ? '✅' : resultCA.ticketOk === false ? '❌' : '⚠️'}
                  <strong>Ticket:</strong> {resultCA.ticketOk === true ? 'Válido' : resultCA.ticketOk === false ? 'Inválido' : 'No verificado'}
                </span>
                <span style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 5 }}>
                  {resultCA.serverOk === true ? '✅' : '❌'}
                  <strong>Servidor Compra Ágil:</strong> {resultCA.serverOk === true ? 'Operativo' : 'Caído / Sin acceso'}
                </span>
                {resultCA.ok && (
                  <span style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 5 }}>
                    📋 <strong>Compras Ágiles publicadas:</strong> {resultCA.cantidad}
                  </span>
                )}
              </div>
              {resultCA.error && (
                <div className={resultCA.ticketOk === false ? 'error-banner' : 'warning-banner'} style={{ marginTop: 0 }}>
                  {resultCA.ticketOk === false ? '❌' : '⚠️'} {resultCA.error}
                </div>
              )}
            </div>
          )}

          <div className="warning-banner" style={{ marginTop: 12 }}>
            ⚠️ Esta sección funciona en desarrollo local (<code>npm run dev</code>) gracias a un
            proxy. La API Compra Ágil de ChileCompra todavía no habilita CORS, por lo que en la
            versión publicada (GitHub Pages) las consultas pueden fallar hasta que se agregue un
            proxy de producción.
          </div>

          <div className="api-stats" style={{ marginTop: 12 }}>
            <div className="api-stat">
              <div className="api-stat-value">{requestsTodayCA.toLocaleString()}</div>
              <div className="api-stat-label">Solicitudes hoy (Compra Ágil)</div>
            </div>
            <div className="api-stat">
              <div className="api-stat-value" style={{ color: remainingCA > 1000 ? 'var(--success)' : remainingCA > 100 ? 'var(--warning)' : 'var(--danger)' }}>
                {remainingCA.toLocaleString()}
              </div>
              <div className="api-stat-label">Disponibles</div>
            </div>
          </div>
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
