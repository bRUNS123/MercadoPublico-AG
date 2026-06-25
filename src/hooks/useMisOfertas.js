import { useState, useEffect, useCallback } from 'react';

// Datos personales/privados de la empresa → se guardan SOLO en este navegador
// (localStorage), nunca en Firebase ni en la sala colaborativa.
const STORAGE_KEY = 'mp_mis_ofertas';
const META_KEY = 'mp_mis_ofertas_meta';

function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export default function useMisOfertas() {
  const [ofertas, setOfertas] = useState(() => load(STORAGE_KEY, []));
  const [meta, setMeta] = useState(() => load(META_KEY, { actualizado: null, empresa: 'GEOPRO' }));

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ofertas));
  }, [ofertas]);

  useEffect(() => {
    localStorage.setItem(META_KEY, JSON.stringify(meta));
  }, [meta]);

  // Reemplaza el set completo (importación desde el panel pegado).
  const importarOfertas = useCallback((nuevas) => {
    setOfertas(nuevas);
    setMeta(m => ({ ...m, actualizado: new Date().toISOString() }));
  }, []);

  // Fusiona por código, conservando lo nuevo cuando hay colisión.
  const fusionarOfertas = useCallback((nuevas) => {
    setOfertas(prev => {
      const map = new Map(prev.map(o => [o.codigo, o]));
      nuevas.forEach(o => map.set(o.codigo, o));
      return Array.from(map.values());
    });
    setMeta(m => ({ ...m, actualizado: new Date().toISOString() }));
  }, []);

  const limpiar = useCallback(() => {
    setOfertas([]);
    setMeta(m => ({ ...m, actualizado: null }));
  }, []);

  const setEmpresa = useCallback((empresa) => {
    setMeta(m => ({ ...m, empresa }));
  }, []);

  return { ofertas, meta, importarOfertas, fusionarOfertas, limpiar, setEmpresa };
}
