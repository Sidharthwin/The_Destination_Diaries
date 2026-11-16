import { z } from "zod";
import { handle, ok } from "@/server/api";
import { requireUser } from "@/server/auth/session";
import { generateItinerary, getTripView } from "@/server/services/itinerary";

export const maxDuration = 60;

export function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const user = await requireUser();
    const id = z.string().uuid().parse((await ctx.params).id);
    const versionId = await generateItinerary(id, user.id);
    return ok({ versionId, ...(await getTripView(id, user.id)) }, 201);
  });
}
