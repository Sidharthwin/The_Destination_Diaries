import { cookies } from "next/headers";
import { z } from "zod";
import { DEV_AUTH_COOKIE, isDevAuthEnabled } from "@/lib/supabase/config";
import { fail, handle, ok, parseBody } from "@/server/api";
import { DEV_USERS, ensureProfile } from "@/server/auth/session";

/**
 * Local development sign-in. Returns 404 unless NODE_ENV !== "production"
 * and DEV_AUTH=1 — it cannot be switched on in a production build.
 */
export function POST(req: Request) {
  return handle(async () => {
    if (!isDevAuthEnabled()) return fail("NOT_FOUND", "Not found", 404);
    const { user } = await parseBody(req, z.object({ user: z.enum(["traveller", "other", "admin"]) }));
    const dev = DEV_USERS[user];
    await ensureProfile({ ...dev, devRole: dev.role });
    (await cookies()).set(DEV_AUTH_COOKIE, user, { httpOnly: true, sameSite: "lax", path: "/" });
    return ok({ signedInAs: dev.email });
  });
}

export function DELETE() {
  return handle(async () => {
    if (!isDevAuthEnabled()) return fail("NOT_FOUND", "Not found", 404);
    (await cookies()).delete(DEV_AUTH_COOKIE);
    return ok({ signedOut: true });
  });
}
