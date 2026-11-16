import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { safeNext } from "@/lib/utils/safe-next";
import { getCurrentUser } from "@/server/auth/session";
import { createSupabaseServerClient } from "@/server/auth/supabase";

/**
 * Lands here from Google OAuth (?code=…), email confirmation and password
 * recovery links (?code=… or ?token_hash=…&type=…). Exchanges the one-time
 * credential for a cookie session, creates the profile on first sign-in,
 * then redirects to a same-site path.
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const next = safeNext(url.searchParams.get("next"));
  const fail = () => NextResponse.redirect(new URL("/login?notice=auth-failed", url.origin));
  if (!isSupabaseConfigured()) return fail();

  const supabase = await createSupabaseServerClient();
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return fail();
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    if (error) return fail();
  } else {
    return fail();
  }

  // Creates the Profile row on first sign-in.
  const user = await getCurrentUser();
  if (!user) return fail();
  return NextResponse.redirect(new URL(next, url.origin));
}
