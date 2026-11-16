import { createTripSchema } from "@/lib/validation/trips";
import { handle, ok, parseBody } from "@/server/api";
import { requireUser } from "@/server/auth/session";
import { createTrip, listTrips } from "@/server/services/trips";

export function GET() {
  return handle(async () => {
    const user = await requireUser();
    return ok({ trips: await listTrips(user.id) });
  });
}

export function POST(req: Request) {
  return handle(async () => {
    // The owner always comes from the verified session, never from the body.
    const user = await requireUser();
    const input = await parseBody(req, createTripSchema);
    const trip = await createTrip(user.id, input);
    return ok({ id: trip.id, status: trip.status }, 201);
  });
}
