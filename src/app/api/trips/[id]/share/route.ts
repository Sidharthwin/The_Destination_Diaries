import { z } from "zod";
import { siteUrl } from "@/lib/supabase/config";
import { shareSchema } from "@/lib/validation/trips";
import { handle, ok, parseBody } from "@/server/api";
import { requireUser } from "@/server/auth/session";
import { setSharing } from "@/server/services/trips";

export function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const user = await requireUser();
    const id = z.string().uuid().parse((await ctx.params).id);
    const { enabled } = await parseBody(req, shareSchema);
    const result = await setSharing(id, user.id, enabled);
    return ok({ ...result, url: result.shareEnabled ? `${siteUrl()}/shared/${result.shareSlug}` : null });
  });
}
