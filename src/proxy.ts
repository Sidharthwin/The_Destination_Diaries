import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  DEV_AUTH_COOKIE, SUPABASE_ANON_KEY, SUPABASE_URL, isDevAuthEnabled, isSupabaseConfigured,
} from "@/lib/supabase/config";

const PROTECTED_PREFIXES = ["/dashboard", "/trips", "/my-trips", "/saved", "/profile", "/admin"];

/**
 * Refreshes the Supabase session cookie on every request and performs an
 * optimistic redirect for protected pages. This is a convenience only —
 * every page and API route re-verifies the user on the server.
 */
export async function proxy(request: NextRequest) {
  // Let server components know the requested path (for post-login redirects).
  request.headers.set("x-pathname", request.nextUrl.pathname + request.nextUrl.search);
  let response = NextResponse.next({ request });
  let signedIn = false;

  if (isDevAuthEnabled() && request.cookies.get(DEV_AUTH_COOKIE)?.value) {
    signedIn = true;
  } else if (isSupabaseConfigured()) {
    const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (toSet) => {
          for (const { name, value } of toSet) request.cookies.set(name, value);
          response = NextResponse.next({ request });
          for (const { name, value, options } of toSet) response.cookies.set(name, value, options);
        },
      },
    });
    const { data } = await supabase.auth.getUser();
    signedIn = Boolean(data.user);
  }

  const { pathname, search } = request.nextUrl;
  const isProtected = PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  if (isProtected && !signedIn) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|images/|api/|.*\\.(?:svg|png|jpg|jpeg|webp|ico)$).*)"],
};
