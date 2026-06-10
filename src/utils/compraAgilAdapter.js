import { ESTADOS_COMPRA_AGIL, REGIONES } from './constants';

/**
 * Convierte un item de la API Compra Ágil v2 (/v2/compra-agil o el payload de detalle)
 * a la forma "Licitación" que ya consumen LicitacionesTable / LicitacionDetail
 * y los hooks de favoritos / descartados / categorías (todos indexan por CodigoExterno).
 */
export function adaptCompraAgil(item) {
  const institucion = item.institucion || {};
  // El listado trae "montos", el detalle trae "presupuesto" — ambos comparten nombres de campo
  const montos = item.montos || item.presupuesto || {};

  return {
    CodigoExterno: item.codigo,
    Nombre: item.nombre,
    Descripcion: item.descripcion,
    FechaPublicacion: item.fechas?.fecha_publicacion,
    FechaCierre: item.fechas?.fecha_cierre,
    CodigoEstado: ESTADOS_COMPRA_AGIL[item.estado?.codigo] ?? null,
    Tipo: 'AG',
    Moneda: montos.moneda || 'CLP',
    MontoEstimado: montos.monto_disponible_clp ?? montos.presupuesto_estimado ?? null,
    Estimacion: null,
    CodigoModalidadPago: null,
    Comprador: {
      NombreOrganismo: institucion.organismo_comprador,
      NombreUnidad: institucion.unidad_compra,
      RutUnidad: institucion.rut,
      RegionUnidad: institucion.nombre_region?.trim() || REGIONES[institucion.region] || null,
      ComunaUnidad: null,
    },
    Items: {
      Listado: (item.productos_solicitados || []).map(p => ({
        NombreProducto: p.nombre,
        Descripcion: p.descripcion,
        Cantidad: p.cantidad,
      })),
    },
    _esCompraAgil: true,
    _raw: item,
  };
}
