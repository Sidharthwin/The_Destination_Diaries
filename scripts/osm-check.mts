// Dev helper: one live, read-only Overpass request to check the OSM adapter. Usage: npx tsx scripts/osm-check.ts
import { OsmOverpassProvider } from "../src/server/providers/places/osm";

const provider = new OsmOverpassProvider();
const places = await provider.fetchPlaces({ cityId: "-", cityName: "Hampi", citySlug: "hampi", lat: 15.335, lng: 76.46 });
console.log(`${places.length} places · ${provider.attribution} · ${provider.licence}`);
for (const p of places.slice(0, 12)) console.log(`- ${p.name} [${p.kind}] ${p.lat.toFixed(4)},${p.lng.toFixed(4)} ${p.sourceUrl}`);
