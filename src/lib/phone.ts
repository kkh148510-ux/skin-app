export function normalizePhone(input: string | null | undefined): string {
  if (!input) return '';
  return input.replace(/\D/g, '');
}

export function formatPhone(input: string | null | undefined): string {
  const n = normalizePhone(input);
  if (n.length === 11) return `${n.slice(0, 3)}-${n.slice(3, 7)}-${n.slice(7)}`;
  if (n.length === 10) return `${n.slice(0, 3)}-${n.slice(3, 6)}-${n.slice(6)}`;
  if (n.length >= 7) return `${n.slice(0, 3)}-${n.slice(3, 7)}${n.length > 7 ? '-' + n.slice(7) : ''}`;
  if (n.length >= 4) return `${n.slice(0, 3)}-${n.slice(3)}`;
  return n;
}

export function isValidPhone(input: string): boolean {
  const n = normalizePhone(input);
  return /^010\d{7,8}$/.test(n);
}
