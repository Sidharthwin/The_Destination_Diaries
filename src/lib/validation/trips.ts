import { z } from "zod";

export const travelStyleSchema = z.enum([
  "BUDGET", "BACKPACKING", "ADVENTURE", "RELAXATION", "CULTURAL", "FAMILY", "LUXURY",
]);

export const transportPrefSchema = z.enum([
  "PUBLIC_TRANSPORT", "CAR_WITH_DRIVER", "SELF_DRIVE", "TWO_WHEELER", "WALKING_FOCUSED", "MIXED",
]);

export const accommodationPrefSchema = z.enum([
  "HOSTEL", "BUDGET_HOTEL", "MID_RANGE_HOTEL", "LUXURY_HOTEL", "HOMESTAY", "RESORT",
]);

export const interestSlugSchema = z.enum([
  "history", "food", "nature", "photography", "adventure", "shopping",
  "religious", "museums", "local-experiences",
]);

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
  .refine((s) => !Number.isNaN(Date.parse(s)), "Invalid date");

export const createTripSchema = z
  .object({
    title: z.string().trim().min(1).max(120),
    destinationCityId: z.string().uuid(),
    startDate: isoDate,
    endDate: isoDate,
    travellers: z.number().int().min(1).max(20),
    totalBudgetRupees: z.number().int().min(0).max(100_000_000).optional(),
    travelStyle: travelStyleSchema.optional(),
    interests: z.array(interestSlugSchema).max(9).default([]),
    transportPref: transportPrefSchema.optional(),
    accommodationPref: accommodationPrefSchema.optional(),
    specialRequirements: z.string().trim().max(2000).optional(),
    isDraft: z.boolean().default(false),
  })
  .refine((t) => t.endDate >= t.startDate, {
    message: "End date must be on or after start date",
    path: ["endDate"],
  })
  .refine(
    (t) => {
      const days =
        (Date.parse(t.endDate) - Date.parse(t.startDate)) / 86_400_000 + 1;
      return days <= 21;
    },
    { message: "Trips longer than 21 days are not supported yet", path: ["endDate"] },
  );

export const updateTripSchema = z
  .object({
    title: z.string().trim().min(1).max(120).optional(),
    /** Only allowed while the trip has no itinerary yet. */
    destinationCityId: z.string().uuid().optional(),
    startDate: isoDate.optional(),
    endDate: isoDate.optional(),
    travellers: z.number().int().min(1).max(20).optional(),
    totalBudgetRupees: z.number().int().min(0).max(100_000_000).optional(),
    travelStyle: travelStyleSchema.optional(),
    interests: z.array(interestSlugSchema).max(9).optional(),
    transportPref: transportPrefSchema.optional(),
    accommodationPref: accommodationPrefSchema.optional(),
    specialRequirements: z.string().trim().max(2000).nullish(),
    status: z.enum(["DRAFT", "PLANNED", "ARCHIVED"]).optional(),
  })
  .strict();

export const addStopSchema = z.object({
  placeId: z.string().uuid(),
  dayIndex: z.number().int().min(0),
  /** Position within the day; appended at the end when omitted. */
  orderIndex: z.number().int().min(0).optional(),
  visitDurationMins: z.number().int().min(10).max(600).optional(),
  note: z.string().max(500).optional(),
});

export const updateStopSchema = z
  .object({
    dayIndex: z.number().int().min(0).optional(),
    orderIndex: z.number().int().min(0).optional(),
    visitDurationMins: z.number().int().min(10).max(600).optional(),
    note: z.string().max(500).nullish(),
    locked: z.boolean().optional(),
  })
  .strict();

export const replanSchema = z.object({
  reason: z.enum([
    "REMOVED_PLACE", "PLACE_CLOSED", "BUDGET_DECREASED", "RUNNING_LATE",
    "DATES_CHANGED", "SLOWER_PACE", "OTHER",
  ]),
  note: z.string().max(1000).optional(),
  /** Pace multiplier: 1 = unchanged, >1 = fewer stops per day. */
  paceFactor: z.number().min(0.5).max(2).default(1),
});

export const shareSchema = z.object({
  enabled: z.boolean(),
});

export type CreateTripInput = z.infer<typeof createTripSchema>;
export type UpdateTripInput = z.infer<typeof updateTripSchema>;
export type AddStopInput = z.infer<typeof addStopSchema>;
export type UpdateStopInput = z.infer<typeof updateStopSchema>;
export type ReplanInput = z.infer<typeof replanSchema>;
