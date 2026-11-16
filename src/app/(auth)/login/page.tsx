import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/auth-forms";
import { isDevAuthEnabled, isSupabaseConfigured } from "@/lib/supabase/config";
import { safeNext } from "@/lib/utils/safe-next";
import { getCurrentUser } from "@/server/auth/session";

export const metadata: Metadata = { title: "Sign in" };

const NOTICES: Record<string, string> = {
  "auth-failed": "That sign-in link did not work. It may have expired — please try again.",
  "signed-out": "You have been signed out.",
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const sp = await searchParams;
  const next = safeNext(typeof sp.next === "string" ? sp.next : null);
  if (await getCurrentUser()) redirect(next);
  const notice = typeof sp.notice === "string" ? (NOTICES[sp.notice] ?? null) : null;
  return <LoginForm configured={isSupabaseConfigured()} devAuth={isDevAuthEnabled()} next={next} notice={notice} />;
}
