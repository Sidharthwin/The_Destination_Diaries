export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export function isSupabaseConfigured(): boolean {
  return SUPABASE_URL.startsWith("http") && SUPABASE_ANON_KEY.length > 0;
}

/**
 * Local development sign-in. Lets you use the app end to end before Supabase
 * credentials exist, and powers automated browser tests.
 *
 * It is impossible to enable in production: it requires NODE_ENV !==
 * "production" AND an explicit DEV_AUTH=1.
 */
export function isDevAuthEnabled(): boolean {
  return process.env.NODE_ENV !== "production" && process.env.DEV_AUTH === "1";
}

export const DEV_AUTH_COOKIE = "dd-dev-user";

export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
}
