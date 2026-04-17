import { useState, useEffect, useCallback } from 'react';
import api from '../api/mercadopublico';
import { inputDateToAPI, todayInputFormat } from '../utils/formatters';
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
      let data;

      if (params.codigo) {
        // Búsqueda por código exacto
        data = await api.getLicitacionPorCodigo(params.codigo);
      } else if (params.estado === 'activas') {
        data = await api.getLicitacionesActivas();
      } else {
        const fecha = params.fecha
          ? inputDateToAPI(params.fecha)
          : inputDateToAPI(todayInputFormat());
        data = await api.getLicitacionesPorFecha(fecha, params.estado || null);
      }

      let listado = data?.Listado || [];

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
