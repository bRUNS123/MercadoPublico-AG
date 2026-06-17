import { useState, useCallback } from 'react';
import compraAgilApi from '../api/compraAgil';
import { adaptCompraAgil } from '../utils/compraAgilAdapter';
import { detectRegion } from '../utils/detectRegion';

// En desarrollo (npm run dev) consulta la API en vivo vía el proxy de Vite.
// En producción (GitHub Pages) la API bloquea peticiones no chilenas (WAF), por lo
// que se lee un snapshot estático generado periódicamente desde un equipo con IP
// chilena (ver scripts/fetch-compra-agil-snapshot.js).
// Los filtros de categoria y busqueda de texto se aplican en el componente (client-side).
export default function useComprasAgiles() {
  const [comprasAgiles, setComprasAgiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [fetchedAt, setFetchedAt] = useState(null);

  const fetchComprasAgiles = useCallback(async (params = {}) => {
    setLoading(true);
    setError(null);

    try {
      let listado = [];
      let snapshotAt = null;

      if (import.meta.env.DEV) {
        if (params.codigo) {
          const data = await compraAgilApi.getCompraAgilPorCodigo(params.codigo);
          const item = data?.payload || data;
          listado = item ? [item] : [];
        } else {
          const data = await compraAgilApi.getComprasAgilesAbiertas(params);
          listado = data?.payload?.items || [];
        }
      } else {
        const res = await fetch(`${import.meta.env.BASE_URL}data/compra-agil-publicada.json`, { cache: 'no-store' });
        if (!res.ok) {
          throw new Error(res.status === 404
            ? 'Aún no se ha generado el snapshot de Compra Ágil.'
            : `Error al cargar el snapshot de Compra Ágil (HTTP ${res.status}).`);
        }
        const data = await res.json();
        listado = data.items || [];
        snapshotAt = data.fetchedAt ? new Date(data.fetchedAt) : null;
      }

      // Adaptar items
      const adaptados = listado.map(adaptCompraAgil);

      // Detectar regiones desde descripción (en paralelo)
      const conRegion = await Promise.all(
        adaptados.map(async (item) => {
          try {
            const detected = await detectRegion(item.Nombre, item.Descripcion);
            return { ...item, RegionDetectada: detected };
          } catch {
            return { ...item, RegionDetectada: null };
          }
        })
      );

      setComprasAgiles(conRegion);
      setFetchedAt(snapshotAt);
      setLastUpdate(new Date());
    } catch (err) {
      setError(err.message);
      setComprasAgiles([]);
    } finally {
      setLoading(false);
    }
  }, []);

  return { comprasAgiles, loading, error, lastUpdate, fetchedAt, fetchComprasAgiles };
}
