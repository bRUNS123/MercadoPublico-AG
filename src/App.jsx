import { HashRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout/Layout';
import DashboardPage from './pages/DashboardPage';
import LicitacionesPage from './pages/LicitacionesPage';
import SettingsPage from './pages/SettingsPage';

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/licitaciones" element={<LicitacionesPage />} />
          <Route path="/configuracion" element={<SettingsPage />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
