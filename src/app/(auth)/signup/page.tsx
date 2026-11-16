import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SignupForm } from "@/components/auth/auth-forms";
import { isDevAuthEnabled, isSupabaseConfigured } from "@/lib/supabase/config";
import { safeNext } from "@/lib/utils/safe-next";
import { getCurrentUser } from "@/server/auth/session";

export const metadata: Metadata = { title: "Create an account" };

export default async function SignupPage({ searchParams }: PageProps<"/signup">) {
  const sp = await searchParams;
  const next = safeNext(typeof sp.next === "string" ? sp.next : null);
  if (await getCurrentUser()) redirect(next);
  return <SignupForm configured={isSupabaseConfigured()} devAuth={isDevAuthEnabled()} next={next} />;
}
