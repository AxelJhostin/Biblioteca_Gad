export function cleanText(value) {
  return String(value ?? '').trim().replace(/\s+/g, ' ');
}

export function normalizeDocument(value) {
  return cleanText(value).toUpperCase();
}

export function parsePositiveInteger(value) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
}

