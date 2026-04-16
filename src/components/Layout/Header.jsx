import { useState, useEffect } from 'react';

export default function Header({ title, subtitle }) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="app-header">
      <div className="header-left">
        <div>
          <h1 className="header-title">{title}</h1>
          {subtitle && <div className="header-subtitle">{subtitle}</div>}
        </div>
      </div>
      <div className="header-right">
        <div className="header-time">
          {time.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          {' · '}
          {time.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </header>
  );
}
