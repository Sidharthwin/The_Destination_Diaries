import { z } from "zod";

const coerceNum = (min: number, max: number) =>
  z.coerce.number().min(min).max(max);

export const placeSearchQuerySchema = z.object({
  q: z.string().trim().min(1).max(120).optional(),
  city: z.string().trim().max(80).optional(), // city slug
  state: z.string().trim().max(80).optional(), // state slug
  kind: z
    .enum([
      "ATTRACTION", "RESTAURANT", "MUSEUM", "RELIGIOUS_SITE", "NATURE",
      "SHOPPING", "ACTIVITY", "VIEWPOINT", "OTHER",
    ])
    .optional(),
  category: z.string().trim().max(40).optional(), // category slug
  limit: z.coerce.number().int().min(1).max(50).default(20),
  offset: z.coerce.number().int().min(0).max(10_000).default(0),
});

export const nearbyQuerySchema = z.object({
  lat: coerceNum(-90, 90),
  lng: coerceNum(-180, 180),
  radiusKm: z.coerce.number().min(0.1).max(100).default(5),
  kind: z
    .enum([
      "ATTRACTION", "RESTAURANT", "MUSEUM", "RELIGIOUS_SITE", "NATURE",
      "SHOPPING", "ACTIVITY", "VIEWPOINT", "OTHER",
    ])
    .optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const feedbackSchema = z.object({
  email: z.string().email().optional(),
  topic: z.string().trim().min(1).max(120),
  message: z.string().trim().min(10).max(5000),
});

export type PlaceSearchQuery = z.infer<typeof placeSearchQuerySchema>;
export type NearbyQuery = z.infer<typeof nearbyQuerySchema>;
