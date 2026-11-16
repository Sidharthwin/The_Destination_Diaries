export function formatDiaryDate(iso: string): string {
  if (!iso) return "";
  const date = new Date(`${iso}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

export function dateSpan(start: string, end: string): string {
  if (!start) return "";
  if (!end || end === start) return formatDiaryDate(start);
  const s = new Date(`${start}T00:00:00Z`);
  const e = new Date(`${end}T00:00:00Z`);
  const sameMonth = s.getUTCMonth() === e.getUTCMonth() && s.getUTCFullYear() === e.getUTCFullYear();
  const left = s.toLocaleDateString("en-IN", { day: "numeric", ...(sameMonth ? {} : { month: "long" }), timeZone: "UTC" });
  return `${left} – ${formatDiaryDate(end)}`;
}
