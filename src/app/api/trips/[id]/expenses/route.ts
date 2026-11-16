import { z } from "zod";
import { handle, ok, parseBody } from "@/server/api";
import { requireUser } from "@/server/auth/session";
import { getTripBudget } from "@/server/services/itinerary";
import { addActualExpense } from "@/server/services/trips";

const schema = z.object({
  category: z.enum([
    "ACCOMMODATION", "INTERCITY_TRANSPORT", "LOCAL_TRANSPORT", "FOOD",
    "ATTRACTION_ENTRY", "ACTIVITIES", "SHOPPING", "MISC",
  ]),
  amountRupees: z.number().positive().max(100_000_000),
  spentAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  note: z.string().trim().max(300).optional(),
  dayIndex: z.number().int().min(0).optional(),
});

export function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const user = await requireUser();
    const id = z.string().uuid().parse((await ctx.params).id);
    await addActualExpense(id, user.id, await parseBody(req, schema));
    return ok(await getTripBudget(id, user.id), 201);
  });
}
