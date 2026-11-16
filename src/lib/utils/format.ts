/** Number-based money formatting for the client (API returns paise as numbers). */
export function inr(paise: number | null | undefined): string {
  if (paise === null || paise === undefined) return "—";
  const rupees = paise / 100;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: Number.isInteger(rupees) ? 0 : 2,
  }).format(rupees);
}

export function clock(mins: number): string {
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  const suffix = h >= 12 ? "pm" : "am";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${suffix}`;
}

export function duration(mins: number): string {
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h} hr` : `${h} hr ${m} min`;
}

export function distance(meters: number): string {
  return meters < 1000 ? `${Math.round(meters / 10) * 10} m` : `${(meters / 1000).toFixed(1)} km`;
}

export function longDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-IN", {
    weekday: "short", day: "numeric", month: "short", timeZone: "UTC",
  });
}

export function dateRangeLabel(startIso: string, endIso: string): string {
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", timeZone: "UTC" };
  const s = new Date(`${startIso}T00:00:00Z`);
  const e = new Date(`${endIso}T00:00:00Z`);
  const year = e.getUTCFullYear();
  return startIso === endIso
    ? `${s.toLocaleDateString("en-IN", opts)} ${year}`
    : `${s.toLocaleDateString("en-IN", opts)} – ${e.toLocaleDateString("en-IN", opts)} ${year}`;
}

export const KIND_LABELS: Record<string, string> = {
  ATTRACTION: "Attraction", RESTAURANT: "Food", MUSEUM: "Museum", RELIGIOUS_SITE: "Sacred site",
  NATURE: "Nature", SHOPPING: "Market", ACTIVITY: "Experience", VIEWPOINT: "Viewpoint", OTHER: "Place",
};

export const MODE_LABELS: Record<string, string> = {
  WALK: "Walk", AUTO: "Auto-rickshaw", TAXI: "Car", BUS: "Bus", TRAIN: "Train",
};

export function titleCase(value: string): string {
  return value.toLowerCase().replaceAll("_", " ").replace(/^\w/, (c) => c.toUpperCase());
}
