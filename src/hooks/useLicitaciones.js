import { useState, useCallback } from 'react';
import api from '../api/mercadopublico';
import { inputDateToAPI, todayInputFormat, subtractDays, getDatesInRange } from '../utils/formatters';
import { CATEGORIAS_INTERES } from '../utils/constants';

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
        // Rango de fechas: fetch cada día en paralelo y combinar
        const today = todayInputFormat();
        const desde = params.fechaDesde || subtractDays(today, 7);
        const hasta = params.fechaHasta || today;
        const dates = getDatesInRange(desde, hasta);

        const results = await Promise.all(
          dates.map(d =>
            api.getLicitacionesPorFecha(inputDateToAPI(d), params.estado || null)
              .catch(() => ({ Listado: [] }))
          )
        );

        // Combinar y deduplicar por CodigoExterno
        const seen = new Set();
        listado = results
          .flatMap(r => r?.Listado || [])
          .filter(l => {
            if (!l.CodigoExterno || seen.has(l.CodigoExterno)) return false;
            seen.add(l.CodigoExterno);
            return true;
          });
      }

      // Filtrar por búsqueda de texto
      if (params.busqueda) {
        const q = params.busqueda.toLowerCase();
        listado = listado.filter(l =>
          (l.Nombre || '').toLowerCase().includes(q) ||
          (l.Descripcion || '').toLowerCase().includes(q)
        );
      }

      // Filtrar por categorías rápidas (multi-selección, lógica OR entre categorías)
      if (params.categoria && params.categoria.length > 0) {
        const cats = CATEGORIAS_INTERES.filter(c => params.categoria.includes(c.id));
        if (cats.length > 0) {
          listado = listado.filter(l => {
            const text = ((l.Nombre || '') + ' ' + (l.Descripcion || '')).toLowerCase();
            return cats.some(cat => cat.keywords.some(kw => text.includes(kw)));
          });
        }
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
