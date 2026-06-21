import { useState, useEffect, useRef } from 'react';
import { votesDB } from '../api/firebase';
import { buildPatterns, getCommunityScores, getRelevanceScore } from '../utils/patterns';

export default function usePatterns(favoritos, catVotes, descartados = {}) {
  const [patterns, setPatterns] = useState({});
  const [roomId, setRoomId] = useState('public');
  const lastKeyRef = useRef('');

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.hash.split('?')[1] || '');
    const sala = urlParams.get('sala') || localStorage.getItem('mp_collab_room') || 'public';
    setRoomId(sala);

    // Suscribirse a patrones aprendidos en Firebase
    const unsubscribe = votesDB.subscribeToVotes(`patterns_${sala}`, (data) => {
      setPatterns(data || {});
    });

    return () => unsubscribe();
  }, []);

  // Rebuilds patterns cuando cambian las licitaciones bien puntuadas o los votos de categoría
  useEffect(() => {
    const goodKeys = Object.entries(favoritos)
      .filter(([, f]) => f.rating >= 7)
      .map(([k]) => k)
      .sort()
      .join(',');
    const catKeys = Object.keys(catVotes).sort().join(',');
    const descKeys = Object.keys(descartados).sort().join(',');
    const dataKey = goodKeys + '||' + catKeys + '||' + descKeys;

    if (dataKey === lastKeyRef.current || (!goodKeys && !descKeys)) return;
    lastKeyRef.current = dataKey;

    const newPatterns = buildPatterns(favoritos, catVotes, descartados);
    if (Object.keys(newPatterns).length === 0) return;

    setPatterns(newPatterns);
    votesDB.setVotes(`patterns_${roomId}`, newPatterns);
  }, [favoritos, catVotes, roomId]);

  const getScores = (licitacion) => getCommunityScores(licitacion, patterns);
  const getRelScore = (licitacion) => getRelevanceScore(licitacion, patterns);

  return { patterns, getScores, getRelevanceScore: getRelScore };
}
