import { z } from "zod";
import { handle, ok } from "@/server/api";
import { requireUser } from "@/server/auth/session";
import { getTripBudget } from "@/server/services/itinerary";
import { deleteActualExpense } from "@/server/services/trips";

export function DELETE(_req: Request, ctx: { params: Promise<{ id: string; expenseId: string }> }) {
  return handle(async () => {
    const user = await requireUser();
    const p = await ctx.params;
    const id = z.string().uuid().parse(p.id);
    await deleteActualExpense(id, user.id, z.string().uuid().parse(p.expenseId));
    return ok(await getTripBudget(id, user.id));
  });
}
