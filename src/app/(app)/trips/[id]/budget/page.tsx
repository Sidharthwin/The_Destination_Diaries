import type { Metadata } from "next";
import { BudgetPanel, type BudgetData } from "@/components/trip/budget-panel";
import { TripHeader } from "@/components/trip/trip-header";
import { getTripBudget } from "@/server/services/itinerary";
import { loadTripPage } from "@/server/services/trip-page";

export const metadata: Metadata = { title: "Budget" };

export default async function BudgetPage({ params }: PageProps<"/trips/[id]/budget">) {
  const { id } = await params;
  const { user, view } = await loadTripPage(id, `/trips/${id}/budget`);
  const budget = await getTripBudget(id, user.id);
  // BigInt paise → numbers at the server/client boundary.
  const data = JSON.parse(JSON.stringify(budget, (_k, v) => (typeof v === "bigint" ? Number(v) : v))) as BudgetData;
  return (
    <>
      <TripHeader trip={view.trip} />
      <BudgetPanel tripId={id} initial={data} days={view.days.map((d) => ({ index: d.index, date: d.date }))} canEdit travellers={view.trip.travellers} />
    </>
  );
}
