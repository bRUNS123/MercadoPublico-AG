import { useState, useCallback } from 'react';
import compraAgilApi from '../api/compraAgil';
import { adaptCompraAgil } from '../utils/compraAgilAdapter';

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
      if (import.meta.env.DEV) {
        let listado = [];
        let snapshotAt = null;

        if (params.codigo) {
          const data = await compraAgilApi.getCompraAgilPorCodigo(params.codigo);
          const item = data?.payload || data;
          listado = item ? [item] : [];
        } else {
          const data = await compraAgilApi.getComprasAgilesAbiertas(params);
          listado = data?.payload?.items || [];
        }

        setComprasAgiles(listado.map(adaptCompraAgil));
        // En dev también leemos el snapshot local si existe para mostrar su fecha
        try {
          const snapRes = await fetch(`${import.meta.env.BASE_URL}data/compra-agil-publicada.json`, { cache: 'no-store' });
          if (snapRes.ok) {
            const snapData = await snapRes.json();
            snapshotAt = snapData.fetchedAt ? new Date(snapData.fetchedAt) : null;
          }
        } catch { /* snapshot no disponible en dev, se ignora */ }
        setFetchedAt(snapshotAt);
      } else {
        const res = await fetch(`${import.meta.env.BASE_URL}data/compra-agil-publicada.json`, { cache: 'no-store' });
        if (!res.ok) {
          throw new Error(res.status === 404
            ? 'Aún no se ha generado el snapshot de Compra Ágil.'
            : `Error al cargar el snapshot de Compra Ágil (HTTP ${res.status}).`);
        }
        const data = await res.json();
        setComprasAgiles((data.items || []).map(adaptCompraAgil));
        setFetchedAt(data.fetchedAt ? new Date(data.fetchedAt) : null);
      }

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
