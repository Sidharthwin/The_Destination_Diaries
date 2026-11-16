/** A Date `days` days before now. */
export function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 3600 * 1000);
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}
