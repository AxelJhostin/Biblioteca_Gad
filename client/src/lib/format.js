export const formatDate = (value) => value
  ? new Intl.DateTimeFormat('es-EC', { dateStyle: 'medium', timeZone: 'America/Guayaquil' }).format(new Date(value))
  : '—';

export const formatDateTime = (value) => value
  ? new Intl.DateTimeFormat('es-EC', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Guayaquil' }).format(new Date(value))
  : '—';

export const stateClass = (state) => ({
  pendiente: 'warning', listo_retiro: 'primary', activo: 'success', atrasado: 'danger', devuelto: 'secondary', rechazado: 'dark', expirado: 'secondary',
}[state] || 'secondary');

export const stateLabel = (state) => ({
  pendiente: 'Pendiente', listo_retiro: 'Listo para retirar', activo: 'Activo', atrasado: 'Atrasado', devuelto: 'Devuelto', rechazado: 'Rechazado', expirado: 'Retiro vencido',
}[state] || state);
