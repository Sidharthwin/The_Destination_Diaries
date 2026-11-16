import { prisma } from "@/server/db/prisma";

export async function savedPlaceIds(userId: string | undefined): Promise<Set<string>> {
  if (!userId) return new Set();
  const rows = await prisma.savedPlace.findMany({ where: { profileId: userId }, select: { placeId: true } });
  return new Set(rows.map((r) => r.placeId));
}
