import { useState, useEffect, useCallback } from 'react';
import { createRoomDB } from '../api/firebase';

const descDB = createRoomDB('desc');

export default function useDescartados() {
  const [descartados, setDescartados] = useState({});
  const [roomId, setRoomId] = useState('public');

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.hash.split('?')[1] || '');
    const sala = urlParams.get('sala') || localStorage.getItem('mp_collab_room') || 'public';
    setRoomId(sala);

    const unsubscribe = descDB.subscribeToVotes(sala, (data) => {
      setDescartados(data || {});
    });
    return () => unsubscribe();
  }, []);

  const descartarLicitacion = useCallback(async (licitacion) => {
    const codigo = licitacion.CodigoExterno;
    const prev = { ...descartados };
    const next = { ...descartados };

    if (next[codigo]) {
      delete next[codigo];
    } else {
      next[codigo] = {
        savedAt: new Date().toISOString(),
        licitacion: {
          CodigoExterno: licitacion.CodigoExterno,
          Nombre: licitacion.Nombre,
          Descripcion: licitacion.Descripcion,
          Tipo: licitacion.Tipo,
          CodigoEstado: licitacion.CodigoEstado,
        },
      };
    }

    setDescartados(next);
    try {
      await descDB.setVotes(roomId, next);
    } catch (err) {
      console.error('Error al descartar:', err);
      setDescartados(prev);
    }
  }, [descartados, roomId]);

  const isDescartada = useCallback((codigo) => !!descartados[codigo], [descartados]);

  return { descartados, descartarLicitacion, isDescartada };
}
