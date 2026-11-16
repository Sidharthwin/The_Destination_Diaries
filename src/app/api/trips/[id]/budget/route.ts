import { z } from "zod";
import { handle, ok } from "@/server/api";
import { requireUser } from "@/server/auth/session";
import { getTripBudget } from "@/server/services/itinerary";

export function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const user = await requireUser();
    const id = z.string().uuid().parse((await ctx.params).id);
    return ok(await getTripBudget(id, user.id));
  });
}
