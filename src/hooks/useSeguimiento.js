import { useState, useEffect, useCallback, useRef } from 'react';
import { votesDB } from '../api/firebase';

export default function useSeguimiento() {
  const [seguimiento, setSeguimiento] = useState({});
  const [roomId, setRoomId] = useState('seg_public');
  const localPendingRef = useRef(false);
  const seguimientoRef = useRef({});
  seguimientoRef.current = seguimiento;

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.hash.split('?')[1] || '');
    const sala = urlParams.get('sala') || localStorage.getItem('mp_collab_room') || 'public';
    const room = `seg_${sala}`;
    setRoomId(room);

    const unsubscribe = votesDB.subscribeToVotes(room, (data) => {
      if (localPendingRef.current) return;
      setSeguimiento(data || {});
    });
    return () => unsubscribe();
  }, []);

  const setEstadoSeguimiento = useCallback((licitacion, estado) => {
    const codigo = licitacion.CodigoExterno;
    const next = { ...seguimientoRef.current };

    if (!estado) {
      delete next[codigo];
    } else {
      next[codigo] = {
        estado,
        savedAt: new Date().toISOString(),
        licitacion: {
          CodigoExterno: licitacion.CodigoExterno,
          Nombre: licitacion.Nombre,
          CodigoEstado: licitacion.CodigoEstado,
          FechaCierre: licitacion.FechaCierre,
          MontoEstimado: licitacion.MontoEstimado,
          Estimacion: licitacion.Estimacion,
          Moneda: licitacion.Moneda,
          Tipo: licitacion.Tipo,
          _esCompraAgil: licitacion._esCompraAgil,
        },
      };
    }

    seguimientoRef.current = next;
    localPendingRef.current = true;
    setSeguimiento(next);

    // replaceVotes reemplaza el doc completo — necesario para que los borrados (sin clasificar) funcionen en Firestore
    votesDB.replaceVotes(roomId, next)
      .then(() => { localPendingRef.current = false; })
      .catch(err => { console.error('Error al guardar seguimiento:', err); localPendingRef.current = false; });
  }, [roomId]);

  return { seguimiento, setEstadoSeguimiento };
}
