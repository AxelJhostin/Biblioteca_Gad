import { createContext, useContext, useMemo, useState } from 'react';

const RequestContext = createContext(null);
const key = 'biblioteca_solicitud';

export function RequestProvider({ children }) {
  const [items, setItems] = useState(() => {
    try { return JSON.parse(localStorage.getItem(key)) || []; } catch { return []; }
  });
  const persist = (next) => { setItems(next); localStorage.setItem(key, JSON.stringify(next)); };
  const value = useMemo(() => ({
    items,
    add(book) {
      const existing = items.find((item) => item.id === book.id);
      const next = existing
        ? items.map((item) => item.id === book.id ? { ...item, cantidad: Math.min(item.cantidad + 1, Number(book.cantidad_disponible)) } : item)
        : [...items, { id: book.id, titulo: book.titulo, id_libro_texto: book.id_libro_texto, cantidad: 1, max: Number(book.cantidad_disponible) }];
      persist(next);
    },
    update(id, cantidad) { persist(items.map((item) => item.id === id ? { ...item, cantidad } : item)); },
    remove(id) { persist(items.filter((item) => item.id !== id)); },
    clear() { persist([]); },
  }), [items]);
  return <RequestContext.Provider value={value}>{children}</RequestContext.Provider>;
}

export const useRequest = () => useContext(RequestContext);

