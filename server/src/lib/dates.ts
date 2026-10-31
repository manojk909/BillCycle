// Business dates are date-only values stored as UTC midnight.
const DAY_MS = 24 * 60 * 60 * 1000;

/** The local calendar date today, as a UTC-midnight Date */
export function today(): Date {
  const d = new Date();
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
}

export function toDateOnly(d: Date | string): Date {
  const x = new Date(d);
  return new Date(Date.UTC(x.getUTCFullYear(), x.getUTCMonth(), x.getUTCDate()));
}

export const addDays = (d: Date, days: number) => new Date(toDateOnly(d).getTime() + days * DAY_MS);

export const daysBetween = (from: Date, to: Date) =>
  Math.round((toDateOnly(to).getTime() - toDateOnly(from).getTime()) / DAY_MS);

export const toISODate = (d: Date) => toDateOnly(d).toISOString().slice(0, 10);
