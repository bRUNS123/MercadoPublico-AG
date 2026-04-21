// ─── Estados de Licitación ───
export const ESTADOS = {
  5: { nombre: 'Publicada', color: '#22c55e', bg: 'rgba(34,197,94,0.15)' },
  6: { nombre: 'Cerrada', color: '#eab308', bg: 'rgba(234,179,8,0.15)' },
  7: { nombre: 'Desierta', color: '#94a3b8', bg: 'rgba(148,163,184,0.15)' },
  8: { nombre: 'Adjudicada', color: '#3b82f6', bg: 'rgba(59,130,246,0.15)' },
  18: { nombre: 'Revocada', color: '#ef4444', bg: 'rgba(239,68,68,0.15)' },
  19: { nombre: 'Suspendida', color: '#f97316', bg: 'rgba(249,115,22,0.15)' },
};

export const ESTADO_NOMBRES = {
  publicada: 'Publicada',
  cerrada: 'Cerrada',
  desierta: 'Desierta',
  adjudicada: 'Adjudicada',
  revocada: 'Revocada',
  suspendida: 'Suspendida',
  activas: 'Activas',
  todos: 'Todos',
};

// ─── Tipos de Licitación ───
export const TIPOS = {
  L1: 'Licitación Pública < 100 UTM',
  LE: 'Licitación Pública 100–1000 UTM',
  LP: 'Licitación Pública > 1000 UTM',
  LS: 'Servicios Personales Especializados',
  A1: 'Lic. Privada (sin oferentes previos)',
  B1: 'Lic. Privada (otras causales)',
  J1: 'Lic. Privada (confidencial)',
  F1: 'Lic. Privada (convenios extranjeros)',
  E1: 'Lic. Privada (remanente contrato)',
  CO: 'Lic. Privada 100–1000 UTM',
  B2: 'Lic. Privada > 1000 UTM',
  A2: 'Trato Directo (sin oferentes)',
  D1: 'Trato Directo (proveedor único)',
  E2: 'Lic. Privada < 100 UTM',
  C2: 'Trato Directo (cotización)',
  C1: 'Compra Directa (OC)',
  F2: 'Trato Directo (cotización conf.)',
  F3: 'Compra Directa (OC conf.)',
  G2: 'Trato Directo (cotización neg.)',
  G1: 'Compra Directa (OC neg.)',
  R1: 'OC menor a 3 UTM',
  CA: 'OC sin resolución',
  SE: 'OC sin emisión automática',
};

// ─── Monedas ───
export const MONEDAS = {
  CLP: { nombre: 'Peso Chileno', simbolo: '$' },
  CLF: { nombre: 'Unidad de Fomento', simbolo: 'UF' },
  USD: { nombre: 'Dólar Americano', simbolo: 'US$' },
  UTM: { nombre: 'UTM', simbolo: 'UTM' },
  EUR: { nombre: 'Euro', simbolo: '€' },
};

// ─── Modalidades de Pago ───
export const MODALIDADES_PAGO = {
  1: 'Pago a 30 días',
  2: 'Pago a 30, 60 y 90 días',
  3: 'Pago al día',
  4: 'Pago Anual',
  5: 'Pago a 60 días',
  6: 'Pagos Mensuales',
  7: 'Pago Contra Entrega Conforme',
  8: 'Pago Bimensual',
  9: 'Pago Por Estado de Avance',
  10: 'Pago Trimestral',
};

// ─── Unidades de Tiempo ───
export const UNIDADES_TIEMPO = {
  1: 'Horas',
  2: 'Días',
  3: 'Semanas',
  4: 'Meses',
  5: 'Años',
};

// ─── Categorías de interés para filtro rápido (Construcción / Ingeniería) ───
// Keywords sin acentos — el matching normaliza ambos lados antes de comparar
export const CATEGORIAS_INTERES = [
  {
    id: 'construccion',
    label: 'Construcción',
    keywords: ['construcci', 'edifici', 'paviment', 'demolici', 'urbanizaci', 'vialidad', 'alcantarill', 'infraestructur', 'hormigon', 'topograf'],
  },
  {
    id: 'ingenieria',
    label: 'Ingeniería Civil',
    keywords: [
      'ingenier', 'estructur', 'calculo', 'civil', 'geotecn',
      'diseno estructur', 'analisis estructur', 'mecanica suelo',
      'sismico', 'acero estructur', 'fundacion',
      'patologia estructur', 'reforzamiento', 'memoria de calculo',
    ],
  },
  {
    id: 'ito_ite',
    label: 'ITO / ITE',
    keywords: [
      'aito', 'inspector tecnico', 'inspeccion tecnica',
      'inspeccion de obra', 'asesoria ito', 'apoyo ito',
      'supervision de obra', 'inspeccion tecnica de edificio',
      'asistencia tecnica de obra',
    ],
  },
  {
    id: 'mantencion',
    label: 'Mantención',
    keywords: ['mantenci', 'mantenimi', 'reparaci', 'mejorami', 'conservaci', 'rehabilitaci'],
  },
  {
    id: 'consultoria',
    label: 'Consultoría',
    keywords: ['consultor', 'asesor', 'estudio', 'informe', 'diagnostico', 'levantamiento'],
  },
  {
    id: 'suministros',
    label: 'Suministros',
    keywords: ['suministr', 'material', 'insumo', 'herramient', 'equip'],
  },
];

// ─── API Base URL ───
export const API_BASE_URL = import.meta.env.DEV
  ? '/api-mp/servicios/v1/publico'
  : 'https://api.mercadopublico.cl/servicios/v1/publico';
