import { stateClass } from './format.js';

test('mapea estados operativos a colores consistentes', () => {
  expect(stateClass('pendiente')).toBe('warning');
  expect(stateClass('atrasado')).toBe('danger');
  expect(stateClass('devuelto')).toBe('secondary');
});

