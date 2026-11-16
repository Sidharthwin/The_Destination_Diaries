/**
 * SAMPLE DATA — clearly labelled.
 *
 * A hand-curated, representative dataset of five geographically diverse
 * Indian destinations. Place names are real; coordinates are APPROXIMATE and
 * hand-entered, visit durations are editorial rules of thumb. Nothing here is
 * verified: every place is seeded as UNVERIFIED with a MANUAL source record.
 *
 * Deliberately NOT seeded: prices, ratings, opening hours. Those must come
 * from a licensed source or an admin verification, never from invention.
 */

export type SeedPlaceKind =
  | "ATTRACTION" | "RESTAURANT" | "MUSEUM" | "RELIGIOUS_SITE" | "NATURE"
  | "SHOPPING" | "ACTIVITY" | "VIEWPOINT" | "OTHER";

export interface SeedPlace {
  name: string;
  kind: SeedPlaceKind;
  lat: number;
  lng: number;
  categories: string[];
  visitMins: number;
  description: string;
}

export interface SeedDestination {
  stateCode: string;
  district: string;
  city: string;
  cityKind: "CITY" | "TOWN" | "VILLAGE";
  lat: number;
  lng: number;
  description: string;
  heroImageUrl?: string;
  heroImageAttribution?: string;
  places: SeedPlace[];
}

export const CATEGORIES: { slug: string; name: string }[] = [
  { slug: "history", name: "History" },
  { slug: "food", name: "Food" },
  { slug: "nature", name: "Nature" },
  { slug: "photography", name: "Photography" },
  { slug: "adventure", name: "Adventure" },
  { slug: "shopping", name: "Shopping" },
  { slug: "religious", name: "Religious destinations" },
  { slug: "museums", name: "Museums" },
  { slug: "local-experiences", name: "Local experiences" },
];

/** All 28 states and 8 union territories (ISO 3166-2:IN). */
export const STATES: { name: string; code: string; kind: "STATE" | "UNION_TERRITORY" }[] = [
  { name: "Andhra Pradesh", code: "IN-AP", kind: "STATE" },
  { name: "Arunachal Pradesh", code: "IN-AR", kind: "STATE" },
  { name: "Assam", code: "IN-AS", kind: "STATE" },
  { name: "Bihar", code: "IN-BR", kind: "STATE" },
  { name: "Chhattisgarh", code: "IN-CG", kind: "STATE" },
  { name: "Goa", code: "IN-GA", kind: "STATE" },
  { name: "Gujarat", code: "IN-GJ", kind: "STATE" },
  { name: "Haryana", code: "IN-HR", kind: "STATE" },
  { name: "Himachal Pradesh", code: "IN-HP", kind: "STATE" },
  { name: "Jharkhand", code: "IN-JH", kind: "STATE" },
  { name: "Karnataka", code: "IN-KA", kind: "STATE" },
  { name: "Kerala", code: "IN-KL", kind: "STATE" },
  { name: "Madhya Pradesh", code: "IN-MP", kind: "STATE" },
  { name: "Maharashtra", code: "IN-MH", kind: "STATE" },
  { name: "Manipur", code: "IN-MN", kind: "STATE" },
  { name: "Meghalaya", code: "IN-ML", kind: "STATE" },
  { name: "Mizoram", code: "IN-MZ", kind: "STATE" },
  { name: "Nagaland", code: "IN-NL", kind: "STATE" },
  { name: "Odisha", code: "IN-OD", kind: "STATE" },
  { name: "Punjab", code: "IN-PB", kind: "STATE" },
  { name: "Rajasthan", code: "IN-RJ", kind: "STATE" },
  { name: "Sikkim", code: "IN-SK", kind: "STATE" },
  { name: "Tamil Nadu", code: "IN-TN", kind: "STATE" },
  { name: "Telangana", code: "IN-TS", kind: "STATE" },
  { name: "Tripura", code: "IN-TR", kind: "STATE" },
  { name: "Uttar Pradesh", code: "IN-UP", kind: "STATE" },
  { name: "Uttarakhand", code: "IN-UK", kind: "STATE" },
  { name: "West Bengal", code: "IN-WB", kind: "STATE" },
  { name: "Andaman and Nicobar Islands", code: "IN-AN", kind: "UNION_TERRITORY" },
  { name: "Chandigarh", code: "IN-CH", kind: "UNION_TERRITORY" },
  { name: "Dadra and Nagar Haveli and Daman and Diu", code: "IN-DH", kind: "UNION_TERRITORY" },
  { name: "Delhi", code: "IN-DL", kind: "UNION_TERRITORY" },
  { name: "Jammu and Kashmir", code: "IN-JK", kind: "UNION_TERRITORY" },
  { name: "Ladakh", code: "IN-LA", kind: "UNION_TERRITORY" },
  { name: "Lakshadweep", code: "IN-LD", kind: "UNION_TERRITORY" },
  { name: "Puducherry", code: "IN-PY", kind: "UNION_TERRITORY" },
];

export const DESTINATIONS: SeedDestination[] = [
  {
    stateCode: "IN-RJ",
    district: "Jaipur",
    city: "Jaipur",
    cityKind: "CITY",
    lat: 26.9124,
    lng: 75.7873,
    description:
      "The Pink City: hilltop forts, astronomical instruments in stone, and bazaars that have traded gems and block prints for three centuries.",
    places: [
      { name: "Amber Fort", kind: "ATTRACTION", lat: 26.9855, lng: 75.8513, categories: ["history", "photography"], visitMins: 150, description: "A honey-coloured hill fort of courtyards, mirrored halls and ramparts above Maota Lake." },
      { name: "Hawa Mahal", kind: "ATTRACTION", lat: 26.9239, lng: 75.8267, categories: ["history", "photography"], visitMins: 45, description: "The five-storey 'Palace of Winds', a lattice of pink sandstone windows facing the old city street." },
      { name: "City Palace", kind: "ATTRACTION", lat: 26.9258, lng: 75.8237, categories: ["history", "museums"], visitMins: 120, description: "The royal residence at the heart of the walled city, with painted gateways and textile galleries." },
      { name: "Jantar Mantar", kind: "ATTRACTION", lat: 26.9247, lng: 75.8246, categories: ["history"], visitMins: 60, description: "An 18th-century open-air observatory of monumental masonry instruments." },
      { name: "Nahargarh Fort", kind: "VIEWPOINT", lat: 26.9373, lng: 75.8155, categories: ["history", "photography", "nature"], visitMins: 90, description: "A ridge-top fort on the Aravallis, known for wide views over the city, especially at dusk." },
      { name: "Jaigarh Fort", kind: "ATTRACTION", lat: 26.9851, lng: 75.8456, categories: ["history"], visitMins: 90, description: "A rugged military fort above Amber, linked to it by fortified passages." },
      { name: "Albert Hall Museum", kind: "MUSEUM", lat: 26.9118, lng: 75.8195, categories: ["museums", "history"], visitMins: 75, description: "The state museum in Ram Niwas Garden, housed in an Indo-Saracenic landmark." },
      { name: "Jal Mahal", kind: "VIEWPOINT", lat: 26.9535, lng: 75.8462, categories: ["photography"], visitMins: 30, description: "A palace that appears to float in Man Sagar Lake; viewed from the lakeside promenade." },
      { name: "Birla Mandir", kind: "RELIGIOUS_SITE", lat: 26.8922, lng: 75.8155, categories: ["religious"], visitMins: 45, description: "A white marble temple at the foot of Moti Dungri hill." },
      { name: "Galta Ji", kind: "RELIGIOUS_SITE", lat: 26.9173, lng: 75.859, categories: ["religious", "nature"], visitMins: 75, description: "A temple complex with natural spring-fed tanks set in a narrow hill pass." },
      { name: "Govind Dev Ji Temple", kind: "RELIGIOUS_SITE", lat: 26.9293, lng: 75.824, categories: ["religious", "local-experiences"], visitMins: 40, description: "A much-loved Krishna temple within the City Palace gardens." },
      { name: "Johari Bazaar", kind: "SHOPPING", lat: 26.9196, lng: 75.8265, categories: ["shopping", "local-experiences"], visitMins: 90, description: "The old city's jewellery street, also lined with textile and sweet shops." },
      { name: "Bapu Bazaar", kind: "SHOPPING", lat: 26.9163, lng: 75.8205, categories: ["shopping"], visitMins: 75, description: "A lively market for block-printed fabric, mojari footwear and handicrafts." },
      { name: "Patrika Gate", kind: "VIEWPOINT", lat: 26.8407, lng: 75.801, categories: ["photography"], visitMins: 30, description: "A vividly painted ceremonial gateway at Jawahar Circle garden." },
      { name: "Masala Chowk", kind: "RESTAURANT", lat: 26.9112, lng: 75.817, categories: ["food", "local-experiences"], visitMins: 60, description: "An open-air food court gathering many of the city's well-known street food stalls." },
    ],
  },
  {
    stateCode: "IN-KL",
    district: "Ernakulam",
    city: "Kochi",
    cityKind: "CITY",
    lat: 9.9312,
    lng: 76.2673,
    description:
      "A harbour city layered with Portuguese, Dutch, Jewish and Malabari histories — spice warehouses, cantilevered fishing nets and backwater light.",
    places: [
      { name: "Fort Kochi Beach", kind: "NATURE", lat: 9.9638, lng: 76.2376, categories: ["nature", "photography"], visitMins: 60, description: "A breezy seafront walkway at the mouth of the harbour." },
      { name: "Chinese Fishing Nets", kind: "ATTRACTION", lat: 9.9683, lng: 76.242, categories: ["photography", "local-experiences"], visitMins: 40, description: "Shore-operated cantilevered nets worked by teams of fishermen along the waterfront." },
      { name: "St. Francis Church", kind: "RELIGIOUS_SITE", lat: 9.9659, lng: 76.2409, categories: ["history", "religious"], visitMins: 30, description: "Among the oldest European-built churches in India, where Vasco da Gama was first buried." },
      { name: "Santa Cruz Cathedral Basilica", kind: "RELIGIOUS_SITE", lat: 9.9645, lng: 76.2432, categories: ["religious", "photography"], visitMins: 30, description: "A basilica with a pastel interior and twin spires in Fort Kochi." },
      { name: "Mattancherry Palace", kind: "MUSEUM", lat: 9.9583, lng: 76.2594, categories: ["history", "museums"], visitMins: 60, description: "The 'Dutch Palace', known for its Kerala mural paintings." },
      { name: "Paradesi Synagogue", kind: "RELIGIOUS_SITE", lat: 9.9573, lng: 76.2596, categories: ["history", "religious"], visitMins: 40, description: "A 16th-century synagogue with hand-painted floor tiles at the end of Jew Town." },
      { name: "Jew Town", kind: "SHOPPING", lat: 9.957, lng: 76.26, categories: ["shopping", "history"], visitMins: 75, description: "A narrow lane of antique dealers and spice merchants in Mattancherry." },
      { name: "Kerala Folklore Museum", kind: "MUSEUM", lat: 9.9383, lng: 76.3187, categories: ["museums", "history"], visitMins: 90, description: "A dense private collection of masks, costumes and architectural salvage from across Kerala." },
      { name: "Marine Drive", kind: "VIEWPOINT", lat: 9.9774, lng: 76.2769, categories: ["photography"], visitMins: 45, description: "A waterfront promenade facing the backwaters in Ernakulam." },
      { name: "Hill Palace Museum", kind: "MUSEUM", lat: 9.9523, lng: 76.3636, categories: ["museums", "history"], visitMins: 120, description: "The former seat of the Kochi royal family at Tripunithura, now an archaeological museum." },
      { name: "Cherai Beach", kind: "NATURE", lat: 10.1416, lng: 76.1783, categories: ["nature"], visitMins: 120, description: "A long sandy beach on Vypin island with backwaters just behind it." },
      { name: "Kerala Kathakali Centre", kind: "ACTIVITY", lat: 9.9655, lng: 76.2433, categories: ["local-experiences"], visitMins: 90, description: "An intimate theatre staging Kathakali performances, including the make-up ritual." },
      { name: "Mangalavanam Bird Sanctuary", kind: "NATURE", lat: 9.9897, lng: 76.2734, categories: ["nature"], visitMins: 60, description: "A pocket of mangrove in the city centre that shelters resident and migratory birds." },
      { name: "Princess Street", kind: "ATTRACTION", lat: 9.966, lng: 76.2425, categories: ["local-experiences", "food", "photography"], visitMins: 45, description: "One of Fort Kochi's oldest streets, with colonial facades, cafés and galleries." },
      { name: "Broadway Market", kind: "SHOPPING", lat: 9.98, lng: 76.279, categories: ["shopping", "local-experiences"], visitMins: 60, description: "Ernakulam's old wholesale market for spices, fabric and household goods." },
    ],
  },
  {
    stateCode: "IN-WB",
    district: "Darjeeling",
    city: "Darjeeling",
    cityKind: "TOWN",
    lat: 27.041,
    lng: 88.2663,
    description:
      "A ridge-top hill town of tea gardens and a narrow-gauge railway, with Kanchenjunga filling the northern horizon on clear mornings.",
    places: [
      { name: "Tiger Hill", kind: "VIEWPOINT", lat: 26.9958, lng: 88.2936, categories: ["nature", "photography"], visitMins: 90, description: "The classic pre-dawn viewpoint for sunrise on the Kanchenjunga range." },
      { name: "Batasia Loop", kind: "ATTRACTION", lat: 27.0167, lng: 88.247, categories: ["photography", "history"], visitMins: 40, description: "A spiral of the toy train track around a hilltop garden and war memorial." },
      { name: "Ghoom Monastery", kind: "RELIGIOUS_SITE", lat: 27.0116, lng: 88.2482, categories: ["religious"], visitMins: 45, description: "A Gelug monastery near Ghum housing a tall Maitreya Buddha statue." },
      { name: "Padmaja Naidu Himalayan Zoological Park", kind: "NATURE", lat: 27.0587, lng: 88.2545, categories: ["nature"], visitMins: 120, description: "A high-altitude zoo known for its work with red pandas and snow leopards." },
      { name: "Himalayan Mountaineering Institute", kind: "MUSEUM", lat: 27.0594, lng: 88.2538, categories: ["museums", "adventure", "history"], visitMins: 75, description: "A mountaineering school with a museum of Himalayan expeditions." },
      { name: "Happy Valley Tea Estate", kind: "ACTIVITY", lat: 27.0535, lng: 88.259, categories: ["nature", "local-experiences"], visitMins: 75, description: "A working tea garden just below town, with guided walks through the factory in season." },
      { name: "Peace Pagoda", kind: "RELIGIOUS_SITE", lat: 27.0276, lng: 88.259, categories: ["religious", "photography"], visitMins: 45, description: "A white Japanese Buddhist stupa on the slopes of Jalapahar hill." },
      { name: "Chowrasta and Mall Road", kind: "SHOPPING", lat: 27.044, lng: 88.2674, categories: ["shopping", "local-experiences"], visitMins: 75, description: "The town's pedestrian square and promenade, lined with tea shops and bookshops." },
      { name: "Observatory Hill", kind: "RELIGIOUS_SITE", lat: 27.047, lng: 88.268, categories: ["religious", "nature"], visitMins: 45, description: "A wooded hilltop above Chowrasta with the Mahakal temple, sacred to Hindus and Buddhists." },
      { name: "Darjeeling Himalayan Railway", kind: "ACTIVITY", lat: 27.038, lng: 88.263, categories: ["history", "local-experiences", "photography"], visitMins: 120, description: "The narrow-gauge 'toy train' — joy rides run between Darjeeling and Ghum." },
      { name: "Rock Garden", kind: "NATURE", lat: 27.018, lng: 88.218, categories: ["nature"], visitMins: 90, description: "A terraced garden built around a waterfall in a valley below town." },
      { name: "Tibetan Refugee Self Help Centre", kind: "SHOPPING", lat: 27.057, lng: 88.267, categories: ["shopping", "local-experiences"], visitMins: 60, description: "A crafts cooperative producing carpets, woodwork and woollens." },
      { name: "Glenary's", kind: "RESTAURANT", lat: 27.043, lng: 88.2668, categories: ["food"], visitMins: 60, description: "A long-running bakery and restaurant on Nehru Road." },
      { name: "Bengal Natural History Museum", kind: "MUSEUM", lat: 27.046, lng: 88.266, categories: ["museums"], visitMins: 45, description: "A small museum of Himalayan and Bengal fauna." },
    ],
  },
  {
    stateCode: "IN-KA",
    district: "Vijayanagara",
    city: "Hampi",
    cityKind: "VILLAGE",
    lat: 15.335,
    lng: 76.46,
    description:
      "The ruined capital of the Vijayanagara empire, scattered across a surreal landscape of granite boulders along the Tungabhadra.",
    places: [
      { name: "Virupaksha Temple", kind: "RELIGIOUS_SITE", lat: 15.335, lng: 76.46, categories: ["religious", "history"], visitMins: 75, description: "A living temple with a towering gopuram at the head of Hampi Bazaar." },
      { name: "Vittala Temple", kind: "ATTRACTION", lat: 15.3421, lng: 76.4753, categories: ["history", "photography"], visitMins: 120, description: "The site of the stone chariot and the famed musical pillars." },
      { name: "Hampi Bazaar", kind: "ATTRACTION", lat: 15.3345, lng: 76.4625, categories: ["history", "shopping"], visitMins: 45, description: "A kilometre-long colonnaded street that was once the empire's market." },
      { name: "Hemakuta Hill", kind: "VIEWPOINT", lat: 15.3335, lng: 76.459, categories: ["photography", "history"], visitMins: 60, description: "A gentle granite slope dotted with early shrines; a favourite at sunset." },
      { name: "Matanga Hill", kind: "VIEWPOINT", lat: 15.333, lng: 76.469, categories: ["nature", "photography", "adventure"], visitMins: 90, description: "The highest point in Hampi, reached by a steep scramble, with a full panorama of the ruins." },
      { name: "Lotus Mahal", kind: "ATTRACTION", lat: 15.3206, lng: 76.4712, categories: ["history", "photography"], visitMins: 45, description: "A graceful pavilion in the Zenana enclosure blending temple and Indo-Islamic forms." },
      { name: "Elephant Stables", kind: "ATTRACTION", lat: 15.3213, lng: 76.4725, categories: ["history"], visitMins: 30, description: "A long domed building that housed the royal elephants." },
      { name: "Queen's Bath", kind: "ATTRACTION", lat: 15.3132, lng: 76.469, categories: ["history"], visitMins: 25, description: "A plain-walled bathing pavilion with an ornate arcaded interior." },
      { name: "Hazara Rama Temple", kind: "ATTRACTION", lat: 15.317, lng: 76.468, categories: ["history", "religious"], visitMins: 40, description: "A royal chapel whose walls carry Ramayana friezes." },
      { name: "Royal Enclosure", kind: "ATTRACTION", lat: 15.3148, lng: 76.47, categories: ["history"], visitMins: 60, description: "The fortified core of the capital, with the Mahanavami platform and a stepped tank." },
      { name: "Achyutaraya Temple", kind: "ATTRACTION", lat: 15.332, lng: 76.4705, categories: ["history"], visitMins: 45, description: "A quieter temple complex in a valley behind Matanga Hill." },
      { name: "Archaeological Museum, Kamalapura", kind: "MUSEUM", lat: 15.305, lng: 76.476, categories: ["museums", "history"], visitMins: 60, description: "Sculpture and a scale model of the Hampi landscape." },
      { name: "Lakshmi Narasimha Statue", kind: "ATTRACTION", lat: 15.3295, lng: 76.461, categories: ["religious", "history"], visitMins: 20, description: "A monolithic Narasimha, the largest statue in Hampi." },
      { name: "Sanapur Lake", kind: "NATURE", lat: 15.361, lng: 76.448, categories: ["nature", "adventure"], visitMins: 120, description: "A reservoir ringed by boulders across the river from the main ruins." },
      { name: "Tungabhadra Coracle Crossing", kind: "ACTIVITY", lat: 15.344, lng: 76.4735, categories: ["local-experiences", "adventure"], visitMins: 45, description: "Round basket-boats ferrying visitors on the river near Vittala Temple." },
    ],
  },
  {
    stateCode: "IN-UK",
    district: "Dehradun",
    city: "Rishikesh",
    cityKind: "CITY",
    lat: 30.0869,
    lng: 78.2676,
    description:
      "Where the Ganga leaves the Himalaya: suspension bridges, evening aarti, ashrams, and white water upstream.",
    places: [
      { name: "Lakshman Jhula", kind: "ATTRACTION", lat: 30.1262, lng: 78.3296, categories: ["photography", "history"], visitMins: 40, description: "The well-known suspension bridge area over the Ganga at Tapovan." },
      { name: "Ram Jhula", kind: "ATTRACTION", lat: 30.1228, lng: 78.3145, categories: ["photography"], visitMins: 30, description: "A pedestrian suspension bridge linking Sivananda Nagar and Swarg Ashram." },
      { name: "Triveni Ghat", kind: "RELIGIOUS_SITE", lat: 30.1033, lng: 78.2988, categories: ["religious", "local-experiences"], visitMins: 60, description: "The town's principal bathing ghat, known for its evening Ganga aarti." },
      { name: "Parmarth Niketan", kind: "RELIGIOUS_SITE", lat: 30.12, lng: 78.312, categories: ["religious", "local-experiences"], visitMins: 75, description: "A large riverside ashram that hosts a sunset aarti." },
      { name: "Beatles Ashram", kind: "ATTRACTION", lat: 30.1108, lng: 78.311, categories: ["history", "photography"], visitMins: 90, description: "The abandoned ashram of Maharishi Mahesh Yogi, now covered in murals." },
      { name: "Neelkanth Mahadev Temple", kind: "RELIGIOUS_SITE", lat: 30.081, lng: 78.341, categories: ["religious", "nature"], visitMins: 150, description: "A forest-ringed Shiva temple reached by a winding hill road." },
      { name: "Neer Garh Waterfall", kind: "NATURE", lat: 30.143, lng: 78.337, categories: ["nature", "adventure"], visitMins: 120, description: "A tiered waterfall reached by a short uphill walk." },
      { name: "Shivpuri Rafting Stretch", kind: "ACTIVITY", lat: 30.138, lng: 78.39, categories: ["adventure"], visitMins: 180, description: "A popular starting point for white-water rafting on the Ganga (seasonal)." },
      { name: "Rajaji National Park (Chilla Range)", kind: "NATURE", lat: 29.976, lng: 78.218, categories: ["nature", "photography"], visitMins: 240, description: "Sal forest and grassland with elephants and deer; safaris are seasonal." },
      { name: "Tera Manzil Temple", kind: "RELIGIOUS_SITE", lat: 30.1265, lng: 78.331, categories: ["religious"], visitMins: 40, description: "A thirteen-storey temple beside Lakshman Jhula." },
      { name: "Kunjapuri Temple", kind: "VIEWPOINT", lat: 30.183, lng: 78.313, categories: ["religious", "nature", "photography"], visitMins: 120, description: "A hilltop shrine with a Himalayan sunrise panorama." },
      { name: "Chotiwala", kind: "RESTAURANT", lat: 30.1215, lng: 78.3155, categories: ["food"], visitMins: 60, description: "A long-established vegetarian restaurant near Ram Jhula." },
      { name: "Lakshman Jhula Market", kind: "SHOPPING", lat: 30.1255, lng: 78.3285, categories: ["shopping", "local-experiences"], visitMins: 60, description: "Lanes of bookshops, rudraksha sellers and cafés around the bridge." },
      { name: "Mohan Chatti Adventure Zone", kind: "ACTIVITY", lat: 30.11, lng: 78.4, categories: ["adventure"], visitMins: 180, description: "A valley east of town known for bungee and giant-swing operators." },
    ],
  },
];

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
