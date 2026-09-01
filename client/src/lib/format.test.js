import { stateClass, stateLabel } from './format.js';

test('mapea estados operativos a colores consistentes', () => {
  expect(stateClass('pendiente')).toBe('warning');
  expect(stateClass('atrasado')).toBe('danger');
  expect(stateClass('devuelto')).toBe('secondary');
  expect(stateClass('listo_retiro')).toBe('primary');
  expect(stateLabel('listo_retiro')).toBe('Listo para retirar');
  expect(stateLabel('expirado')).toBe('Retiro vencido');
});
