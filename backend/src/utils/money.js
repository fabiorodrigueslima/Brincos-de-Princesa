// Monetary arithmetic stays in integer cents; only provider JSON uses decimals.
export function toCents(value) {
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(String(value));
  if (!match) throw new Error('INVALID_MONEY');
  const cents = Number(match[1]) * 100 + Number((match[2] ?? '').padEnd(2, '0'));
  if (!Number.isSafeInteger(cents)) throw new Error('INVALID_MONEY');
  return cents;
}

export function toDecimal(cents) {
  if (!Number.isSafeInteger(cents) || cents < 0) throw new Error('INVALID_MONEY');
  return `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, '0')}`;
}
