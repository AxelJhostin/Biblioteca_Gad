const localeDate = new Intl.DateTimeFormat('es-EC', {
  dateStyle: 'medium',
  timeZone: 'America/Guayaquil',
});

const localeDateTime = new Intl.DateTimeFormat('es-EC', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'America/Guayaquil',
});

const titleCase = (value) => String(value || 'No registrado')
  .replaceAll('_', ' ')
  .replace(/^./, (letter) => letter.toLocaleUpperCase('es'));

const date = (value) => value ? localeDate.format(new Date(value)) : '—';
const dateTime = (value) => value ? localeDateTime.format(new Date(value)) : '—';

const FILTER_LABELS = {
  estado: 'Estado',
  tipo: 'Tipo',
  genero: 'Género',
  search: 'Búsqueda',
  digital: 'Solo digitales',
  disponible: 'Solo disponibles',
};

function filterSummary(filters) {
  const active = Object.entries(filters || {})
    .filter(([, value]) => value !== '' && value !== undefined && value !== false && value !== 'false')
    .map(([key, value]) => `${FILTER_LABELS[key] || key}: ${value === 'true' || value === true ? 'Sí' : titleCase(value)}`);
  return active.length ? active.join(' · ') : 'Sin filtros: se incluyen todos los registros disponibles.';
}

const definitions = {
  inventario: {
    title: 'Reporte de inventario bibliográfico',
    shortTitle: 'Inventario',
    subtitle: 'Existencias y disponibilidad del catálogo municipal',
    columns: [
      { key: 'id', label: 'ID libro', width: 68 },
      { key: 'titulo', label: 'Título', width: 145 },
      { key: 'autores', label: 'Autoría', width: 115 },
      { key: 'tipo', label: 'Tipo', width: 60 },
      { key: 'genero', label: 'Género', width: 66 },
      { key: 'anio', label: 'Año', width: 38, align: 'right' },
      { key: 'total', label: 'Total', width: 42, align: 'right' },
      { key: 'disponibles', label: 'Disp.', width: 42, align: 'right' },
      { key: 'comprometidos', label: 'Prest.', width: 42, align: 'right' },
      { key: 'digital', label: 'Digital', width: 48, align: 'center' },
    ],
    map: (item) => ({
      id: item.id_libro_texto,
      titulo: item.titulo,
      autores: item.autores,
      tipo: titleCase(item.tipo_material_otro || item.tipo_material),
      genero: titleCase(item.genero_otro || item.genero),
      anio: item.anio_publicacion || '—',
      total: Number(item.cantidad_total),
      disponibles: Number(item.cantidad_disponible),
      comprometidos: Number(item.cantidad_comprometida),
      digital: item.digital_disponible ? 'Sí' : 'No',
    }),
  },
  prestamos: {
    title: 'Reporte de préstamos',
    shortTitle: 'Préstamos',
    subtitle: 'Seguimiento de solicitudes, entregas y devoluciones',
    columns: [
      { key: 'codigo', label: 'Código', width: 72 },
      { key: 'estado', label: 'Estado', width: 55 },
      { key: 'cliente', label: 'Cliente', width: 105 },
      { key: 'cedula', label: 'Cédula', width: 66 },
      { key: 'materiales', label: 'Materiales', width: 180 },
      { key: 'solicitud', label: 'Solicitud', width: 78 },
      { key: 'limite', label: 'Fecha límite', width: 68 },
      { key: 'pendientes', label: 'Pend.', width: 40, align: 'right' },
      { key: 'responsable', label: 'Responsable', width: 88 },
    ],
    map: (item) => ({
      codigo: item.codigo,
      estado: titleCase(item.estado),
      cliente: item.nombre_completo,
      cedula: item.identificacion,
      materiales: item.materiales,
      solicitud: dateTime(item.fecha_solicitud),
      limite: date(item.fecha_limite),
      pendientes: Number(item.unidades_pendientes),
      responsable: item.bibliotecario_nombre,
    }),
  },
  movimientos: {
    title: 'Historial de movimientos',
    shortTitle: 'Movimientos',
    subtitle: 'Trazabilidad de las acciones relevantes del sistema',
    columns: [
      { key: 'fecha', label: 'Fecha y hora', width: 86 },
      { key: 'tipo', label: 'Movimiento', width: 92 },
      { key: 'actor', label: 'Responsable', width: 118 },
      { key: 'rol', label: 'Rol', width: 70 },
      { key: 'referencia', label: 'Referencia', width: 142 },
      { key: 'detalle', label: 'Detalle', width: 226 },
    ],
    map: (item) => ({
      fecha: dateTime(item.fecha_hora),
      tipo: titleCase(item.tipo),
      actor: item.actor_nombre,
      rol: titleCase(item.tipo_actor),
      referencia: [item.prestamo_codigo, item.id_libro_texto, item.libro_titulo].filter(Boolean).join(' · ') || '—',
      detalle: item.detalle || '—',
    }),
  },
};

export function prepareReport(type, items, filters) {
  const definition = definitions[type];
  if (!definition) return null;
  return {
    ...definition,
    filterSummary: filterSummary(filters),
    rows: items.map(definition.map),
  };
}

export const reportTypes = Object.keys(definitions);
