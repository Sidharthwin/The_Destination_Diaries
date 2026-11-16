import { z } from "zod";
import { interestSlugSchema, travelStyleSchema } from "@/lib/validation/trips";
import { handle, ok, parseBody } from "@/server/api";
import { requireUser } from "@/server/auth/session";
import { prisma } from "@/server/db/prisma";

const schema = z
  .object({
    displayName: z.string().trim().min(1).max(80).optional(),
    homeCity: z.string().trim().max(80).nullish(),
    travelStyle: travelStyleSchema.nullish(),
    interests: z.array(interestSlugSchema).max(9).optional(),
    dietary: z.string().trim().max(120).nullish(),
    pacePreference: z.enum(["relaxed", "moderate", "packed"]).nullish(),
  })
  .strict();

export function PATCH(req: Request) {
  return handle(async () => {
    const user = await requireUser();
    const input = await parseBody(req, schema);
    await prisma.profile.update({
      where: { id: user.id },
      data: {
        displayName: input.displayName,
        homeCity: input.homeCity === undefined ? undefined : input.homeCity || null,
      },
    });
    const pref = {
      travelStyle: input.travelStyle,
      interests: input.interests,
      dietary: input.dietary === undefined ? undefined : input.dietary || null,
      pacePreference: input.pacePreference,
    };
    await prisma.userPreference.upsert({
      where: { profileId: user.id },
      update: pref,
      create: { profileId: user.id, ...pref, interests: input.interests ?? [] },
    });
    return ok({ updated: true });
  });
}
