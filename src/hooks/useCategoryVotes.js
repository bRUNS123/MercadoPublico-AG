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
      setCatVotes(data || {});
    });
    return () => unsubscribe();
  }, []);

  // value: true = confirmar, false = rechazar. Si ya tiene ese valor, lo quita (toggle).
  const voteCategory = useCallback(async (codigoExterno, categoriaId, value = true) => {
    const key = `${codigoExterno}__${categoriaId}`;
    const current = catVotes[key] || {};
    const existing = current[deviceId];

    const updated = { ...current };
    if (existing === value) {
      delete updated[deviceId]; // toggle off
    } else {
      updated[deviceId] = value;
    }

    const newCatVotes = { ...catVotes, [key]: updated };
    setCatVotes(newCatVotes);
    try {
      await votesDB.setVotes(catRoomId, newCatVotes);
    } catch (err) {
      console.error('Error al guardar voto:', err);
      setCatVotes(catVotes); // revert
    }
  }, [catVotes, catRoomId, deviceId]);

  // { confirmed, rejected, total, myVote }
  const getVotes = useCallback((codigoExterno, categoriaId) => {
    const key = `${codigoExterno}__${categoriaId}`;
    const voteObj = catVotes[key] || {};
    const values = Object.values(voteObj);
    return {
      confirmed: values.filter(v => v === true).length,
      rejected:  values.filter(v => v === false).length,
      total:     values.length,
      myVote:    voteObj[deviceId] ?? null, // true | false | null
    };
  }, [catVotes, deviceId]);

  return { catVotes, voteCategory, getVotes };
}
