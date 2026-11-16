import { z } from "zod";
import { handle, ok, parseBody } from "@/server/api";
import { requireUser } from "@/server/auth/session";
import { prisma } from "@/server/db/prisma";
import { ServiceError } from "@/server/errors";

const schema = z.object({ placeId: z.string().uuid() });

export function GET() {
  return handle(async () => {
    const user = await requireUser();
    const rows = await prisma.savedPlace.findMany({ where: { profileId: user.id }, select: { placeId: true } });
    return ok({ placeIds: rows.map((r) => r.placeId) });
  });
}

export function POST(req: Request) {
  return handle(async () => {
    const user = await requireUser();
    const { placeId } = await parseBody(req, schema);
    const place = await prisma.place.findUnique({ where: { id: placeId }, select: { id: true } });
    if (!place) throw new ServiceError("VALIDATION", "Unknown place");
    await prisma.savedPlace.upsert({
      where: { profileId_placeId: { profileId: user.id, placeId } },
      update: {},
      create: { profileId: user.id, placeId },
    });
    return ok({ saved: true }, 201);
  });
}

export function DELETE(req: Request) {
  return handle(async () => {
    const user = await requireUser();
    const { placeId } = await parseBody(req, schema);
    await prisma.savedPlace.deleteMany({ where: { profileId: user.id, placeId } });
    return ok({ saved: false });
  });
}
