import '@testing-library/jest-dom/vitest';

// Node 25 expone un localStorage experimental sin archivo durante las pruebas.
// Se fuerza la implementación de JSDOM que usa realmente el navegador.
const values = new Map();
const storage = {
  getItem: (key) => values.has(key) ? values.get(key) : null,
  setItem: (key, value) => values.set(key, String(value)),
  removeItem: (key) => values.delete(key),
  clear: () => values.clear(),
  key: (index) => [...values.keys()][index] ?? null,
  get length() { return values.size; },
};
Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: storage });
Object.defineProperty(window, 'localStorage', { configurable: true, value: storage });
