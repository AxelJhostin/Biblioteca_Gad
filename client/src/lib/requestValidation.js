const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ecuadorMobilePattern = /^09\d{8}$/;
const ecuadorLandlinePattern = /^0[2-7]\d{7}$/;
const personNamePattern = /^[\p{L}]+(?:[\s.'’-][\p{L}]+)*$/u;

export const numericInput = (value, maxLength) => String(value || '').replace(/\D/g, '').slice(0, maxLength);
export const personNameInput = (value) => String(value || '').replace(/[^\p{L}\s.'’-]/gu, '').slice(0, 180);

export function normalizeRequestClient(client) {
  return {
    identificacion: String(client.identificacion || '').trim(),
    nombre_completo: String(client.nombre_completo || '').trim().replace(/\s+/g, ' '),
    telefono: String(client.telefono || '').trim().replace(/\s+/g, ' '),
    correo: String(client.correo || '').trim().toLowerCase(),
  };
}

export function validateLoanRequest(client, items) {
  const value = normalizeRequestClient(client);
  const errors = {};

  if (!/^\d{10}$/.test(value.identificacion)) errors.identificacion = 'La cédula debe contener exactamente 10 dígitos numéricos.';

  if (value.nombre_completo.length < 3) errors.nombre_completo = 'Ingresa el nombre completo del solicitante.';
  else if (value.nombre_completo.length > 180) errors.nombre_completo = 'El nombre no puede superar 180 caracteres.';
  else if (!personNamePattern.test(value.nombre_completo)) errors.nombre_completo = 'El nombre solo puede contener letras, espacios, apóstrofes, puntos o guiones.';

  if (!value.telefono && !value.correo) {
    errors.telefono = 'Ingresa un teléfono o un correo para poder gestionar la solicitud.';
  } else if (value.telefono) {
    if (!ecuadorMobilePattern.test(value.telefono) && !ecuadorLandlinePattern.test(value.telefono)) {
      errors.telefono = 'Ingresa un número ecuatoriano válido: celular de 10 dígitos (09…) o fijo de 9 dígitos.';
    }
  }

  if (value.correo && !emailPattern.test(value.correo)) errors.correo = 'Ingresa un correo electrónico válido.';
  if (!items.length) errors.items = 'Añade al menos un libro antes de enviar la solicitud.';

  return { value, errors };
}

export function serverFieldErrors(response) {
  return Object.fromEntries((response?.errors || []).map((item) => [
    String(item.field || '').replace(/^cliente\./, ''),
    item.message,
  ]));
}
