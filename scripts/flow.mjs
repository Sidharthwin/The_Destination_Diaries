// Dev helper: signs in as the dev traveller, creates + generates a trip, prints its id.
const base = process.env.BASE_URL ?? "http://localhost:3100";
const jar = [];
async function call(path, method = "GET", body) {
  const res = await fetch(base + path, {
    method,
    headers: { "content-type": "application/json", cookie: jar.join("; ") },
    body: body ? JSON.stringify(body) : undefined,
  });
  for (const c of res.headers.getSetCookie?.() ?? []) jar.push(c.split(";")[0]);
  return { status: res.status, json: await res.json().catch(() => null) };
}
await call("/api/dev-auth", "POST", { user: process.argv[3] ?? "traveller" });
const city = (await call(`/api/places/search?q=${process.argv[2] ?? "Jaipur"}`)).json.data.cities[0];
const created = await call("/api/trips", "POST", {
  title: `Long weekend in ${city.name}`, destinationCityId: city.id, startDate: "2027-02-12", endDate: "2027-02-14",
  travellers: 2, totalBudgetRupees: 45000, travelStyle: "CULTURAL", interests: ["history", "photography", "food"],
  transportPref: "MIXED", accommodationPref: "MID_RANGE_HOTEL",
});
const id = created.json.data.id;
const gen = await call(`/api/trips/${id}/generate`, "POST");
console.log(id, gen.status);
