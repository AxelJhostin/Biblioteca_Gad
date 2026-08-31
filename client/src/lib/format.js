export const formatDate = (value) => value
  ? new Intl.DateTimeFormat('es-EC', { dateStyle: 'medium', timeZone: 'America/Guayaquil' }).format(new Date(value))
  : '—';

export const formatDateTime = (value) => value
  ? new Intl.DateTimeFormat('es-EC', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Guayaquil' }).format(new Date(value))
  : '—';

export const stateClass = (state) => ({
  pendiente: 'warning', activo: 'success', atrasado: 'danger', devuelto: 'secondary', rechazado: 'dark',
}[state] || 'secondary');

