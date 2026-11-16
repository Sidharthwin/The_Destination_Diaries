import { z } from "zod";
import { handle, ok } from "@/server/api";
import { requireUser } from "@/server/auth/session";
import { activateVersion, getTripView } from "@/server/services/itinerary";

export function POST(_req: Request, ctx: { params: Promise<{ id: string; versionId: string }> }) {
  return handle(async () => {
    const user = await requireUser();
    const p = await ctx.params;
    const id = z.string().uuid().parse(p.id);
    await activateVersion(id, user.id, z.string().uuid().parse(p.versionId));
    return ok(await getTripView(id, user.id));
  });
}
