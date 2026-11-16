import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { DEV_AUTH_COOKIE, isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/server/auth/supabase";

export async function POST(request: NextRequest) {
  if (isSupabaseConfigured()) {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  }
  (await cookies()).delete(DEV_AUTH_COOKIE);
  return NextResponse.redirect(new URL("/login?notice=signed-out", request.nextUrl.origin), { status: 303 });
}
