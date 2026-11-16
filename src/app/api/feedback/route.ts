import { feedbackSchema } from "@/lib/validation/places";
import { handle, ok, parseBody } from "@/server/api";
import { getCurrentUser } from "@/server/auth/session";
import { prisma } from "@/server/db/prisma";

export function POST(req: Request) {
  return handle(async () => {
    const input = await parseBody(req, feedbackSchema);
    const user = await getCurrentUser();
    const row = await prisma.feedback.create({
      data: {
        profileId: user?.id ?? null,
        email: input.email ?? user?.email ?? null,
        topic: input.topic,
        message: input.message,
      },
    });
    return ok({ id: row.id }, 201);
  });
}
