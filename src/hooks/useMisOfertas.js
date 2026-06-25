import { useState, useEffect, useCallback } from 'react';

// Datos personales/privados de la empresa → se guardan SOLO en este navegador
// (localStorage), nunca en Firebase ni en la sala colaborativa.
const STORAGE_KEY = 'mp_mis_procesos';
const META_KEY = 'mp_mis_procesos_meta';
// Anotaciones del usuario por código: { resultado: 'adjudicada'|'no_adjudicada'|'', comentario }
// Separadas de los procesos para que el re-sync no las borre.
const ANOT_KEY = 'mp_mis_anotaciones';

function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export default function useMisOfertas() {
  const [procesos, setProcesos] = useState(() => load(STORAGE_KEY, []));
  const [meta, setMeta] = useState(() => load(META_KEY, { actualizado: null, empresa: 'GEOPRO' }));
  const [anotaciones, setAnotaciones] = useState(() => load(ANOT_KEY, {}));

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(procesos));
  }, [procesos]);

  useEffect(() => {
    localStorage.setItem(META_KEY, JSON.stringify(meta));
  }, [meta]);

  useEffect(() => {
    localStorage.setItem(ANOT_KEY, JSON.stringify(anotaciones));
  }, [anotaciones]);

  // Actualiza la anotación de un proceso (merge parcial).
  const setAnotacion = useCallback((codigo, patch) => {
    setAnotaciones(prev => ({ ...prev, [codigo]: { ...prev[codigo], ...patch } }));
  }, []);

  // Reemplaza el set completo (importación desde el panel pegado).
  const importarProcesos = useCallback((nuevos) => {
    setProcesos(nuevos);
    setMeta(m => ({ ...m, actualizado: new Date().toISOString() }));
  }, []);

  // Fusiona por código, conservando lo nuevo cuando hay colisión.
  const fusionarProcesos = useCallback((nuevos) => {
    setProcesos(prev => {
      const map = new Map(prev.map(o => [o.codigo, o]));
      nuevos.forEach(o => map.set(o.codigo, o));
      return Array.from(map.values());
    });
    setMeta(m => ({ ...m, actualizado: new Date().toISOString() }));
  }, []);

  const limpiar = useCallback(() => {
    setProcesos([]);
    setMeta(m => ({ ...m, actualizado: null }));
  }, []);

  const setEmpresa = useCallback((empresa) => {
    setMeta(m => ({ ...m, empresa }));
  }, []);

  return { procesos, meta, anotaciones, setAnotacion, importarProcesos, fusionarProcesos, limpiar, setEmpresa };
}
