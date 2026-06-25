import { useState, useEffect, useCallback } from 'react';

// Datos personales/privados de la empresa → se guardan SOLO en este navegador
// (localStorage), nunca en Firebase ni en la sala colaborativa.
const STORAGE_KEY = 'mp_mis_procesos';
const META_KEY = 'mp_mis_procesos_meta';

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

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(procesos));
  }, [procesos]);

  useEffect(() => {
    localStorage.setItem(META_KEY, JSON.stringify(meta));
  }, [meta]);

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

  return { procesos, meta, importarProcesos, fusionarProcesos, limpiar, setEmpresa };
}
