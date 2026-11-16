import { notFound } from "next/navigation";
import { requireUserPage } from "@/server/auth/session";
import { ServiceError } from "@/server/errors";
import { getTripView } from "@/server/services/itinerary";

/** Shared loader for trip sub-pages: auth, id validation, and 404 for inaccessible trips. */
export async function loadTripPage(id: string, path: string) {
  const user = await requireUserPage(path);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  try {
    return { user, view: await getTripView(id, user.id) };
  } catch (err) {
    if (err instanceof ServiceError && err.code === "NOT_FOUND") notFound();
    throw err;
  }
}
