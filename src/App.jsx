import { HashRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout/Layout';
import DashboardPage from './pages/DashboardPage';
import LicitacionesPage from './pages/LicitacionesPage';
import ComprasAgilesPage from './pages/ComprasAgilesPage';
import SeguimientoPage from './pages/SeguimientoPage';
import MiMercadoPublicoPage from './pages/MiMercadoPublicoPage';
import SettingsPage from './pages/SettingsPage';

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/licitaciones" element={<LicitacionesPage />} />
          <Route path="/compras-agiles" element={<ComprasAgilesPage />} />
          <Route path="/seguimiento" element={<SeguimientoPage />} />
          <Route path="/mi-mercadopublico" element={<MiMercadoPublicoPage />} />
          <Route path="/configuracion" element={<SettingsPage />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
