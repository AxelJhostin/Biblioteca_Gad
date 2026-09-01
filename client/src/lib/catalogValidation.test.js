import { describe, expect, it } from 'vitest';
import { parseAuthors, validateAuthors } from './catalogValidation.js';

describe('validación de autores del catálogo', () => {
  it('separa y limpia los autores escritos con comas', () => {
    expect(parseAuthors('  Juan Montalvo,  Dolores Veintimilla  , ')).toEqual(['Juan Montalvo', 'Dolores Veintimilla']);
  });

  it('explica con claridad qué autor es demasiado corto', () => {
    const result = validateAuthors('Juan Montalvo, X');
    expect(result.error).toContain('al menos 2 caracteres');
    expect(result.error).toContain('“X”');
  });
});
