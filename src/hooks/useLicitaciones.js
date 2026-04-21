import { useState, useCallback } from 'react';
import api from '../api/mercadopublico';
import { inputDateToAPI, todayInputFormat, subtractDays, getDatesInRange } from '../utils/formatters';

// Solo maneja la obtención de datos desde la API.
// Los filtros de categoria y busqueda se aplican en el componente (client-side, instantáneo).
export default function useLicitaciones() {
  const [licitaciones, setLicitaciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);

  const fetchLicitaciones = useCallback(async (params = {}) => {
    setLoading(true);
    setError(null);

    try {
      let listado = [];

      if (params.codigo) {
        const data = await api.getLicitacionPorCodigo(params.codigo);
        listado = data?.Listado || [];
      } else if (params.estado === 'activas') {
        const data = await api.getLicitacionesActivas();
        listado = data?.Listado || [];
      } else {
        const today = todayInputFormat();
        const desde = params.fechaDesde || subtractDays(today, 7);
        const hasta = params.fechaHasta || today;
        const dates = getDatesInRange(desde, hasta);

        const results = await Promise.all(
          dates.map(d =>
            api.getLicitacionesPorFechaSimple(inputDateToAPI(d), params.estado || null)
              .catch(() => ({ Listado: [] }))
          )
        );

        const seen = new Set();
        listado = results
          .flatMap(r => r?.Listado || [])
          .filter(l => {
            if (!l.CodigoExterno || seen.has(l.CodigoExterno)) return false;
            seen.add(l.CodigoExterno);
            return true;
          });
      }

      setLicitaciones(listado);
      setLastUpdate(new Date());
    } catch (err) {
      setError(err.message);
      setLicitaciones([]);
    } finally {
      setLoading(false);
    }
  }, []);

  return { licitaciones, loading, error, lastUpdate, fetchLicitaciones };
}
