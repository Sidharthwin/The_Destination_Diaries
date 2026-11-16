import { z } from "zod";
import { handle, ok } from "@/server/api";
import { getPlace } from "@/server/services/places";

export function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const id = z.string().uuid().parse((await ctx.params).id);
    return ok(await getPlace(id));
  });
}
