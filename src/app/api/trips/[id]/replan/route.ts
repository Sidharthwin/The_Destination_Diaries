import { z } from "zod";
import { replanSchema } from "@/lib/validation/trips";
import { handle, ok, parseBody } from "@/server/api";
import { requireUser } from "@/server/auth/session";
import { getTripView, replanItinerary } from "@/server/services/itinerary";

export const maxDuration = 60;

export function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const user = await requireUser();
    const id = z.string().uuid().parse((await ctx.params).id);
    const input = await parseBody(req, replanSchema);
    const versionId = await replanItinerary(id, user.id, input);
    return ok({ versionId, ...(await getTripView(id, user.id)) }, 201);
  });
}
