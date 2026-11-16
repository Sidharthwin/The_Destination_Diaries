import { z } from "zod";
import { handle, ok, parseBody } from "@/server/api";
import { requireUser } from "@/server/auth/session";
import { prisma } from "@/server/db/prisma";
import { notFound } from "@/server/errors";

const schema = z.object({
  kind: z.enum(["CLOSED", "WRONG_INFO", "DUPLICATE", "INAPPROPRIATE", "OTHER"]),
  detail: z.string().trim().min(5).max(2000),
});

export function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const user = await requireUser();
    const id = z.string().uuid().parse((await ctx.params).id);
    const input = await parseBody(req, schema);
    const place = await prisma.place.findUnique({ where: { id }, select: { id: true } });
    if (!place) throw notFound("Place");
    const report = await prisma.placeReport.create({
      data: { placeId: id, reporterId: user.id, kind: input.kind, detail: input.detail },
    });
    return ok({ id: report.id }, 201);
  });
}
