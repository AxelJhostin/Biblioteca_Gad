import { describe, expect, it } from 'vitest';
import {
  clampReaderZoom,
  nextReaderPage,
  normalizeReaderPage,
  previousReaderPage,
  readerPageWidth,
  visibleReaderPages,
} from './readerLayout.js';

describe('distribución del lector digital', () => {
  it('mantiene la portada sola y agrupa las páginas interiores en pliegos', () => {
    expect(visibleReaderPages(1, 8, 'double')).toEqual([1]);
    expect(visibleReaderPages(2, 8, 'double')).toEqual([2, 3]);
    expect(visibleReaderPages(5, 8, 'double')).toEqual([4, 5]);
    expect(visibleReaderPages(8, 8, 'double')).toEqual([8]);
  });

  it('navega por una página o por pliegos sin salir del documento', () => {
    expect(nextReaderPage(1, 7, 'double')).toBe(2);
    expect(nextReaderPage(2, 7, 'double')).toBe(4);
    expect(nextReaderPage(6, 7, 'double')).toBe(6);
    expect(previousReaderPage(6, 7, 'double')).toBe(4);
    expect(previousReaderPage(2, 7, 'double')).toBe(1);
    expect(nextReaderPage(7, 7, 'single')).toBe(7);
  });

  it('normaliza páginas y limita el zoom entre 50 % y 200 %', () => {
    expect(normalizeReaderPage(7, 10, 'double')).toBe(6);
    expect(clampReaderZoom(0.1)).toBe(0.5);
    expect(clampReaderZoom(2.8)).toBe(2);
    expect(readerPageWidth(1000, 'double', 1)).toBe(486);
    expect(readerPageWidth(820, 'single', 1.5)).toBe(1230);
  });
});
