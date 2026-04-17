import { useState, useEffect, useCallback } from 'react';
import { votesDB } from '../api/firebase';

const getDeviceId = () => {
  let id = localStorage.getItem('mp_device_id');
  if (!id) {
    id = Date.now().toString(36) + Math.random().toString(36).slice(2);
    localStorage.setItem('mp_device_id', id);
  }
  return id;
};

export default function useCategoryVotes() {
  const [catVotes, setCatVotes] = useState({});
  const [catRoomId, setCatRoomId] = useState('cat_public');
  const deviceId = getDeviceId();

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.hash.split('?')[1] || '');
    const sala = urlParams.get('sala') || localStorage.getItem('mp_collab_room') || 'public';
    const room = `cat_${sala}`;
    setCatRoomId(room);

    const unsubscribe = votesDB.subscribeToVotes(room, (data) => {
      setCatVotes(data);
    });

    return () => unsubscribe();
  }, []);

  // Alterna el voto del dispositivo para una licitación+categoría
  const voteCategory = useCallback(async (codigoExterno, categoriaId) => {
    const key = `${codigoExterno}__${categoriaId}`;
    const current = catVotes[key] || {};
    const alreadyVoted = current[deviceId] === true;

    const updated = { ...current };
    if (alreadyVoted) {
      delete updated[deviceId];
    } else {
      updated[deviceId] = true;
    }

    const newCatVotes = { ...catVotes, [key]: updated };
    setCatVotes(newCatVotes);
    await votesDB.setVotes(catRoomId, newCatVotes);
  }, [catVotes, catRoomId, deviceId]);

  // Retorna { confirmed, total, myVote } para una licitación+categoría
  const getVotes = useCallback((codigoExterno, categoriaId) => {
    const key = `${codigoExterno}__${categoriaId}`;
    const voteObj = catVotes[key] || {};
    const values = Object.values(voteObj);
    return {
      confirmed: values.filter(Boolean).length,
      total: values.length,
      myVote: voteObj[deviceId] ?? null,
    };
  }, [catVotes, deviceId]);

  return { catVotes, voteCategory, getVotes };
}
