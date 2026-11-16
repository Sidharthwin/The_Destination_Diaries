import { z } from "zod";
import { updateStopSchema } from "@/lib/validation/trips";
import { handle, ok, parseBody } from "@/server/api";
import { requireUser } from "@/server/auth/session";
import { getTripView, removeStop, updateStop } from "@/server/services/itinerary";

type Ctx = { params: Promise<{ id: string; stopId: string }> };
const ids = async (ctx: Ctx) => {
  const p = await ctx.params;
  return { id: z.string().uuid().parse(p.id), stopId: z.string().uuid().parse(p.stopId) };
};

export function PATCH(req: Request, ctx: Ctx) {
  return handle(async () => {
    const user = await requireUser();
    const { id, stopId } = await ids(ctx);
    const input = await parseBody(req, updateStopSchema);
    const result = await updateStop(id, user.id, stopId, input);
    return ok({ stopId: result.stopId, ...(await getTripView(id, user.id)) });
  });
}

export function DELETE(_req: Request, ctx: Ctx) {
  return handle(async () => {
    const user = await requireUser();
    const { id, stopId } = await ids(ctx);
    await removeStop(id, user.id, stopId);
    return ok(await getTripView(id, user.id));
  });
}
