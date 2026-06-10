import { useState, useEffect, useCallback, useRef } from 'react';
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
  const localPendingRef = useRef(false);
  const catVotesRef = useRef({});
  catVotesRef.current = catVotes;

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.hash.split('?')[1] || '');
    const sala = urlParams.get('sala') || localStorage.getItem('mp_collab_room') || 'public';
    const room = `cat_${sala}`;
    setCatRoomId(room);

    // Cargar backup local inmediatamente mientras llega el snapshot de Firebase
    const backupKey = `mp_catvotes_backup_${room}`;
    const backup = localStorage.getItem(backupKey);
    if (backup) {
      try { setCatVotes(JSON.parse(backup)); } catch { /* ignore */ }
    }

    const unsubscribe = votesDB.subscribeToVotes(room, (data) => {
      if (localPendingRef.current) return;
      const votes = data || {};
      setCatVotes(votes);
      // Actualizar backup local con datos frescos del servidor
      if (Object.keys(votes).length > 0) {
        localStorage.setItem(backupKey, JSON.stringify(votes));
      }
    });
    return () => unsubscribe();
  }, []);

  const voteCategory = useCallback((codigoExterno, categoriaId, value = true) => {
    const key = `${codigoExterno}__${categoriaId}`;
    // Leer del ref para evitar stale closure en votos rápidos
    const current = catVotesRef.current[key] || {};
    const existing = current[deviceId];

    const updated = { ...current };
    if (existing === value) {
      delete updated[deviceId];
    } else {
      updated[deviceId] = value;
    }

    const newCatVotes = { ...catVotesRef.current, [key]: updated };
    catVotesRef.current = newCatVotes;

    localPendingRef.current = true;
    setCatVotes(newCatVotes);

    // Backup local inmediato — garantiza que el voto sobrevive una recarga aunque Firebase tarde
    const backupKey = `mp_catvotes_backup_${catRoomId}`;
    try { localStorage.setItem(backupKey, JSON.stringify(newCatVotes)); } catch { /* storage lleno */ }

    const done = () => { localPendingRef.current = false; };
    const fail = (err) => { console.error('Error al guardar voto:', err); localPendingRef.current = false; };

    if (Object.keys(updated).length === 0) {
      votesDB.deleteVoteKey(catRoomId, key).then(done).catch(fail);
    } else {
      votesDB.setVotes(catRoomId, { [key]: updated }).then(done).catch(fail);
    }
  }, [catRoomId, deviceId]);

  const getVotes = useCallback((codigoExterno, categoriaId) => {
    const key = `${codigoExterno}__${categoriaId}`;
    const voteObj = catVotes[key] || {};
    const values = Object.values(voteObj);
    return {
      confirmed: values.filter(v => v === true).length,
      rejected:  values.filter(v => v === false).length,
      total:     values.length,
      myVote:    voteObj[deviceId] ?? null,
    };
  }, [catVotes, deviceId]);

  return { catVotes, voteCategory, getVotes };
}
