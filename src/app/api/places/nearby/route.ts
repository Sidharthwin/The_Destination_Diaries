import { nearbyQuerySchema } from "@/lib/validation/places";
import { handle, ok, parseQuery } from "@/server/api";
import { nearbyPlaces } from "@/server/services/places";

export function GET(req: Request) {
  return handle(async () => ok({ places: await nearbyPlaces(parseQuery(req, nearbyQuerySchema)) }));
}
