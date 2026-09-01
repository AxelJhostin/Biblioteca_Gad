export function parseAuthors(value) {
  return String(value || '').split(',').map((author) => author.trim()).filter(Boolean);
}

export function validateAuthors(value) {
  const authors = parseAuthors(value);
  if (!authors.length) return { authors, error: 'Ingresa al menos un autor.' };

  const tooShort = authors.filter((author) => author.length < 2);
  if (tooShort.length) {
    return {
      authors,
      error: `Cada autor debe tener al menos 2 caracteres. Corrige: ${tooShort.map((author) => `“${author}”`).join(', ')}.`,
    };
  }

  return { authors, error: '' };
}
