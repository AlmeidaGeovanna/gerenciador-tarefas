const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Verifica se o texto é uma data real no formato YYYY-MM-DD (ex.: rejeita 2026-02-30). */
export function isValidIsoDate(value: string): boolean {
  const match = ISO_DATE.exec(value);
  if (!match) return false;
  const [, y, m, d] = match.map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

/** Retorna a data (YYYY-MM-DD) de um instante em um fuso horário específico. */
export function dateInTimeZone(instant: Date, timeZone: string): string {
  // O locale en-CA formata datas como YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(instant);
}

/** Soma dias a uma data YYYY-MM-DD. */
export function addDays(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + days));
  return date.toISOString().slice(0, 10);
}
