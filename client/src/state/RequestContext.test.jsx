import { renderHook, act } from '@testing-library/react';
import { RequestProvider, useRequest } from './RequestContext.jsx';

beforeEach(() => localStorage.clear());

test('añade, limita y elimina materiales de la solicitud', () => {
  const wrapper = ({ children }) => <RequestProvider>{children}</RequestProvider>;
  const { result } = renderHook(() => useRequest(), { wrapper });
  act(() => result.current.add({ id: 1, titulo: 'Libro', id_libro_texto: 'A-1', cantidad_disponible: 1 }));
  act(() => result.current.add({ id: 1, titulo: 'Libro', id_libro_texto: 'A-1', cantidad_disponible: 1 }));
  expect(result.current.items).toHaveLength(1);
  expect(result.current.items[0].cantidad).toBe(1);
  act(() => result.current.remove(1));
  expect(result.current.items).toHaveLength(0);
});

