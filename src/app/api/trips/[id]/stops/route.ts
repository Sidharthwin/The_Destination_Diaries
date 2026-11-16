import { z } from "zod";
import { addStopSchema } from "@/lib/validation/trips";
import { handle, ok, parseBody } from "@/server/api";
import { requireUser } from "@/server/auth/session";
import { addStop, getTripView } from "@/server/services/itinerary";

export function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const user = await requireUser();
    const id = z.string().uuid().parse((await ctx.params).id);
    const input = await parseBody(req, addStopSchema);
    const { stopId } = await addStop(id, user.id, input);
    return ok({ stopId, ...(await getTripView(id, user.id)) }, 201);
  });
}
