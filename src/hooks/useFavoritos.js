import { useState, useEffect, useCallback } from 'react';
import { votesDB } from '../api/firebase';

export default function useFavoritos() {
  const [favoritos, setFavoritos] = useState({});
  const [isCollabActive, setIsCollabActive] = useState(false);
  const [roomId, setRoomId] = useState('public');

  useEffect(() => {
    // Verificar si hay una sala compartida en la URL (ej: /#/?sala=miempresa)
    const urlParams = new URLSearchParams(window.location.hash.split('?')[1] || '');
    const sala = urlParams.get('sala') || localStorage.getItem('mp_collab_room') || 'public';
    setRoomId(sala);
    localStorage.setItem('mp_collab_room', sala);
    setIsCollabActive(votesDB.isActive());

    // Se suscribe a los cambios (Firebase o LocalStorage)
    const unsubscribe = votesDB.subscribeToVotes(sala, (data) => {
      // Si el almacenamiento principal viene vacío, intentar recuperar del backup
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

  const rateLicitacion = useCallback(async (licitacion, score) => {
    const previous = { ...favoritos };
    const newFavoritos = { ...favoritos };

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

    setFavoritos(newFavoritos);
    try {
      await votesDB.setVotes(roomId, newFavoritos);
      // Guardar siempre en localStorage como respaldo, independiente de Firebase
      localStorage.setItem('mp_votes_backup', JSON.stringify(newFavoritos));
    } catch (err) {
      console.error('Error al guardar puntuación:', err);
      setFavoritos(previous); // revertir si falló
    }
  }, [favoritos, roomId]);

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
