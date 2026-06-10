import { useState, useCallback } from 'react';
import compraAgilApi from '../api/compraAgil';
import { adaptCompraAgil } from '../utils/compraAgilAdapter';

// Solo maneja la obtención de datos desde la API Compra Ágil.
// Los filtros de categoria y busqueda de texto se aplican en el componente (client-side).
export default function useComprasAgiles() {
  const [comprasAgiles, setComprasAgiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);

  const fetchComprasAgiles = useCallback(async (params = {}) => {
    setLoading(true);
    setError(null);

    try {
      let listado = [];

      if (params.codigo) {
        const data = await compraAgilApi.getCompraAgilPorCodigo(params.codigo);
        const item = data?.payload || data;
        listado = item ? [item] : [];
      } else {
        const data = await compraAgilApi.getComprasAgilesAbiertas(params);
        listado = data?.payload?.items || [];
      }

      setComprasAgiles(listado.map(adaptCompraAgil));
      setLastUpdate(new Date());
    } catch (err) {
      setError(err.message);
      setComprasAgiles([]);
    } finally {
      setLoading(false);
    }
  }, []);

  return { comprasAgiles, loading, error, lastUpdate, fetchComprasAgiles };
}
