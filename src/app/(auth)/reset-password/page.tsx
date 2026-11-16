import type { Metadata } from "next";
import { ResetPasswordForm } from "@/components/auth/auth-forms";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getCurrentUser } from "@/server/auth/session";

export const metadata: Metadata = { title: "Choose a new password" };

export default async function ResetPasswordPage() {
  // The emailed link signs the user in via /auth/callback before landing here.
  const user = await getCurrentUser();
  return <ResetPasswordForm configured={isSupabaseConfigured()} hasSession={Boolean(user)} />;
}
