import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { DEV_AUTH_COOKIE, isDevAuthEnabled, isSupabaseConfigured } from "@/lib/supabase/config";
import { prisma } from "@/server/db/prisma";
import { forbidden, unauthorized } from "@/server/errors";
import { createSupabaseServerClient } from "./supabase";

export interface SessionUser {
  id: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  role: "USER" | "ADMIN";
}

interface Identity {
  id: string;
  email: string;
  name?: string | null;
  avatarUrl?: string | null;
}

/** Fixed identities for local development sign-in (never available in production). */
export const DEV_USERS: Record<string, Identity & { role: "USER" | "ADMIN" }> = {
  traveller: { id: "00000000-0000-4000-8000-000000000001", email: "traveller@dev.local", name: "Dev Traveller", role: "USER" },
  other: { id: "00000000-0000-4000-8000-000000000002", email: "other@dev.local", name: "Other Traveller", role: "USER" },
  admin: { id: "00000000-0000-4000-8000-000000000003", email: "admin@dev.local", name: "Dev Admin", role: "ADMIN" },
};

/**
 * The verified identity for this request. With Supabase this calls
 * `auth.getUser()`, which validates the session with the auth server — the
 * user is never taken from request bodies or unverified cookies.
 */
async function getIdentity(): Promise<(Identity & { devRole?: "USER" | "ADMIN" }) | null> {
  if (isDevAuthEnabled()) {
    const key = (await cookies()).get(DEV_AUTH_COOKIE)?.value;
    const dev = key ? DEV_USERS[key] : undefined;
    if (dev) return { ...dev, devRole: dev.role };
  }
  if (!isSupabaseConfigured()) return null;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user?.email) return null;
  const meta = data.user.user_metadata ?? {};
  return {
    id: data.user.id,
    email: data.user.email,
    name: (meta.full_name as string | undefined) ?? (meta.name as string | undefined) ?? null,
    avatarUrl: (meta.avatar_url as string | undefined) ?? null,
  };
}

function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

/** Ensures a Profile row exists for the identity (created on first sight). */
export async function ensureProfile(identity: Identity & { devRole?: "USER" | "ADMIN" }): Promise<SessionUser> {
  const bootstrapAdmin =
    identity.devRole === "ADMIN" || adminEmails().includes(identity.email.toLowerCase());
  const profile = await prisma.profile.upsert({
    where: { id: identity.id },
    update: bootstrapAdmin ? { role: "ADMIN" } : {},
    create: {
      id: identity.id,
      email: identity.email,
      displayName: identity.name ?? identity.email.split("@")[0],
      avatarUrl: identity.avatarUrl ?? null,
      role: bootstrapAdmin ? "ADMIN" : "USER",
      preference: { create: {} },
    },
  });
  return {
    id: profile.id,
    email: profile.email,
    displayName: profile.displayName,
    avatarUrl: profile.avatarUrl,
    role: profile.role,
  };
}

/** Current user or null. Safe to call from any server context. */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const identity = await getIdentity();
  if (!identity) return null;
  return ensureProfile(identity);
}

/** For API route handlers: throws 401 ServiceError when signed out. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw unauthorized();
  return user;
}

/** For API route handlers: throws 401/403. */
export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "ADMIN") throw forbidden("Administrator access required");
  return user;
}

/** For pages: redirects to /login (preserving the destination) when signed out. */
export async function requireUserPage(nextPath: string): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  return user;
}

/** For admin pages: signed-out → login; signed-in non-admin → dashboard. */
export async function requireAdminPage(nextPath: string): Promise<SessionUser> {
  const user = await requireUserPage(nextPath);
  if (user.role !== "ADMIN") redirect("/dashboard?notice=admin-only");
  return user;
}
