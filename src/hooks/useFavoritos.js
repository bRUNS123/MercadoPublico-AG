import { useState, useEffect, useCallback, useRef } from 'react';
import { votesDB } from '../api/firebase';

export default function useFavoritos() {
  const [favoritos, setFavoritos] = useState({});
  const [isCollabActive, setIsCollabActive] = useState(false);
  const [roomId, setRoomId] = useState('public');
  const localPendingRef = useRef(false);
  const favoritosRef = useRef({});
  favoritosRef.current = favoritos;

  useEffect(() => {
    // Verificar si hay una sala compartida en la URL (ej: /#/?sala=miempresa)
    const urlParams = new URLSearchParams(window.location.hash.split('?')[1] || '');
    const sala = urlParams.get('sala') || localStorage.getItem('mp_collab_room') || 'public';
    setRoomId(sala);
    localStorage.setItem('mp_collab_room', sala);
    setIsCollabActive(votesDB.isActive());

    // Se suscribe a los cambios (Firebase o LocalStorage)
    const unsubscribe = votesDB.subscribeToVotes(sala, (data) => {
      if (localPendingRef.current) return; // ignorar mientras hay write local en vuelo
      if (!data || Object.keys(data).length === 0) {
        const backup = localStorage.getItem('mp_votes_backup');
        if (backup) {
          try { setFavoritos(JSON.parse(backup)); } catch { setFavoritos(data); }
          return;
        }
      }
      setFavoritos(data);
    });

    return () => unsubscribe();
  }, []);

  const rateLicitacion = useCallback((licitacion, score) => {
    const newFavoritos = { ...favoritosRef.current };

    if (!score || score <= 0) {
      delete newFavoritos[licitacion.CodigoExterno];
    } else {
      newFavoritos[licitacion.CodigoExterno] = {
        rating: parseInt(score, 10),
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
        }
      };
    }

    favoritosRef.current = newFavoritos;
    localPendingRef.current = true;
    setFavoritos(newFavoritos);

    // replaceVotes reemplaza el doc completo — necesario para que los borrados (score=0) funcionen en Firestore
    votesDB.replaceVotes(roomId, newFavoritos)
      .then(() => { localStorage.setItem('mp_votes_backup', JSON.stringify(newFavoritos)); localPendingRef.current = false; })
      .catch(err => { console.error('Error al guardar puntuación:', err); localPendingRef.current = false; });
  }, [roomId]);

  const changeRoom = (newRoom) => {
    localStorage.setItem('mp_collab_room', newRoom);
    window.location.search = `?sala=${newRoom}`; // reload page safely
  };

  return {
    favoritos,
    rateLicitacion,
    isCollabActive,
    roomId,
    changeRoom
  };
}
