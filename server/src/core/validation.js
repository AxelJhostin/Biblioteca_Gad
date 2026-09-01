export function cleanText(value) {
  return String(value ?? '').trim().replace(/\s+/g, ' ');
}

export function normalizeDocument(value) {
  return cleanText(value).toUpperCase();
}

export function isValidEcuadorianId(value) {
  const identification = String(value || '');
  if (!/^\d{10}$/.test(identification)) return false;
  const province = Number(identification.slice(0, 2));
  if (!((province >= 1 && province <= 24) || province === 30)) return false;
  if (Number(identification[2]) >= 6) return false;
  const sum = identification.slice(0, 9).split('').reduce((total, digit, index) => {
    let product = Number(digit) * (index % 2 === 0 ? 2 : 1);
    if (product > 9) product -= 9;
    return total + product;
  }, 0);
  return (10 - (sum % 10)) % 10 === Number(identification[9]);
}

export function parsePositiveInteger(value) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
}
