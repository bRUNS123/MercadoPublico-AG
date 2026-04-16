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
      setFavoritos(data);
    });

    return () => unsubscribe();
  }, []);

  const rateLicitacion = useCallback(async (licitacion, score) => {
    const newFavoritos = { ...favoritos };

    if (!score || score <= 0) {
      // Eliminar llave si el score es 0
      delete newFavoritos[licitacion.CodigoExterno];
    } else {
      // Guardar con score, timestamp y meta datos esenciales
      newFavoritos[licitacion.CodigoExterno] = {
        rating: parseInt(score, 10),
        savedAt: new Date().toISOString(),
        licitacion: { // Guardamos info basica para no engordar firebase
           CodigoExterno: licitacion.CodigoExterno,
           Nombre: licitacion.Nombre,
           CodigoEstado: licitacion.CodigoEstado,
           FechaCierre: licitacion.FechaCierre,
           MontoEstimado: licitacion.MontoEstimado,
           Estimacion: licitacion.Estimacion,
           Moneda: licitacion.Moneda,
           Tipo: licitacion.Tipo,
           Items: licitacion.Items
        } 
      };
    }

    setFavoritos(newFavoritos); // actualizacion optimista
    await votesDB.setVotes(roomId, newFavoritos);
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
