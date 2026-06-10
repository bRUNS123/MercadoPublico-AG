import { useState, useEffect, useCallback, useRef } from 'react';
import { votesDB } from '../api/firebase';

export default function useDescartados() {
  const [descartados, setDescartados] = useState({});
  const [roomId, setRoomId] = useState('desc_public');
  const localPendingRef = useRef(false);
  const descartadosRef = useRef({});
  descartadosRef.current = descartados;

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.hash.split('?')[1] || '');
    const sala = urlParams.get('sala') || localStorage.getItem('mp_collab_room') || 'public';
    const room = `desc_${sala}`;
    setRoomId(room);

    const unsubscribe = votesDB.subscribeToVotes(room, (data) => {
      if (localPendingRef.current) return;
      setDescartados(data || {});
    });
    return () => unsubscribe();
  }, []);

  const descartarLicitacion = useCallback((licitacion) => {
    const codigo = licitacion.CodigoExterno;
    // Leer del ref para evitar stale closure
    const next = { ...descartadosRef.current };

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

    descartadosRef.current = next;
    localPendingRef.current = true;
    setDescartados(next);

    // replaceVotes reemplaza el doc completo — necesario para que los borrados (restaurar) funcionen en Firestore
    votesDB.replaceVotes(roomId, next)
      .then(() => { localPendingRef.current = false; })
      .catch(err => { console.error('Error al descartar:', err); localPendingRef.current = false; });
  }, [roomId]);

  const isDescartada = useCallback((codigo) => !!descartadosRef.current[codigo], []);

  return { descartados, descartarLicitacion, isDescartada };
}
