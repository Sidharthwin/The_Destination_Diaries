import { z } from "zod";
import { updateTripSchema } from "@/lib/validation/trips";
import { handle, ok, parseBody } from "@/server/api";
import { requireUser } from "@/server/auth/session";
import { getTripView, refreshActiveVersion } from "@/server/services/itinerary";
import { deleteTrip, updateTrip } from "@/server/services/trips";

type Ctx = { params: Promise<{ id: string }> };
const tripId = async (ctx: Ctx) => z.string().uuid().parse((await ctx.params).id);

export function GET(req: Request, ctx: Ctx) {
  return handle(async () => {
    const user = await requireUser();
    const versionId = new URL(req.url).searchParams.get("version") ?? undefined;
    return ok(await getTripView(await tripId(ctx), user.id, versionId ? z.string().uuid().parse(versionId) : undefined));
  });
}

export function PATCH(req: Request, ctx: Ctx) {
  return handle(async () => {
    const user = await requireUser();
    const id = await tripId(ctx);
    const input = await parseBody(req, updateTripSchema);
    const { datesChanged } = await updateTrip(id, user.id, input);
    // Budget, travellers and stay preference all change the stored estimate.
    await refreshActiveVersion(id);
    return ok({ ...(await getTripView(id, user.id)), datesChanged });
  });
}

export function DELETE(_req: Request, ctx: Ctx) {
  return handle(async () => {
    const user = await requireUser();
    await deleteTrip(await tripId(ctx), user.id);
    return ok({ deleted: true });
  });
}
