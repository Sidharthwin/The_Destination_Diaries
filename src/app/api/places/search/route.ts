import { placeSearchQuerySchema } from "@/lib/validation/places";
import { handle, ok, parseQuery } from "@/server/api";
import { searchPlaces } from "@/server/services/places";

export function GET(req: Request) {
  return handle(async () => ok(await searchPlaces(parseQuery(req, placeSearchQuerySchema))));
}
