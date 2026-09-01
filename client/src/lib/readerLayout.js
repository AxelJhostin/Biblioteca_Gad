export const MIN_READER_ZOOM = 0.5;
export const MAX_READER_ZOOM = 2;
export const READER_ZOOM_STEP = 0.1;

export function clampReaderZoom(value) {
  return Math.min(MAX_READER_ZOOM, Math.max(MIN_READER_ZOOM, Number(value) || 1));
}

export function normalizeReaderPage(page, totalPages, viewMode = 'single') {
  const total = Math.max(1, Number(totalPages) || 1);
  const current = Math.min(total, Math.max(1, Number(page) || 1));
  if (viewMode !== 'double' || current === 1) return current;
  return current % 2 === 0 ? current : current - 1;
}

export function visibleReaderPages(page, totalPages, viewMode = 'single') {
  const total = Math.max(0, Number(totalPages) || 0);
  if (!total) return [];
  const current = normalizeReaderPage(page, total, viewMode);
  if (viewMode !== 'double' || current === 1) return [current];
  return [current, current + 1].filter((value) => value <= total);
}

export function nextReaderPage(page, totalPages, viewMode = 'single') {
  const total = Math.max(1, Number(totalPages) || 1);
  const current = normalizeReaderPage(page, total, viewMode);
  if (viewMode !== 'double') return Math.min(total, current + 1);
  if (current === 1) return Math.min(2, total);
  const lastSpread = total % 2 === 0 ? total : total - 1;
  return Math.min(Math.max(1, lastSpread), current + 2);
}

export function previousReaderPage(page, totalPages, viewMode = 'single') {
  const current = normalizeReaderPage(page, totalPages, viewMode);
  if (viewMode !== 'double') return Math.max(1, current - 1);
  return current <= 2 ? 1 : current - 2;
}

export function readerPageWidth(containerWidth, viewMode = 'single', zoom = 1) {
  const available = Math.max(280, Number(containerWidth) || 760);
  const base = viewMode === 'double'
    ? Math.min(600, Math.max(240, (available - 28) / 2))
    : Math.min(820, available);
  return Math.round(base * clampReaderZoom(zoom));
}
