export const TRAVEL_STYLES = [
  { value: "BUDGET", label: "Budget", description: "Maximum experience per rupee — smart savings everywhere." },
  { value: "BACKPACKING", label: "Backpacking", description: "Hostels, local transport, and the long way round." },
  { value: "ADVENTURE", label: "Adventure", description: "Treks, rapids, and early alarms worth setting." },
  { value: "RELAXATION", label: "Relaxation", description: "Slow mornings, unhurried afternoons." },
  { value: "CULTURAL", label: "Cultural", description: "Forts, temples, galleries, and living traditions." },
  { value: "FAMILY", label: "Family", description: "Paced for all ages, with room to breathe." },
  { value: "LUXURY", label: "Luxury", description: "Heritage stays and seamless, private travel." },
] as const;

export const INTERESTS = [
  { slug: "history", label: "History" },
  { slug: "food", label: "Food" },
  { slug: "nature", label: "Nature" },
  { slug: "photography", label: "Photography" },
  { slug: "adventure", label: "Adventure" },
  { slug: "shopping", label: "Shopping" },
  { slug: "religious", label: "Religious destinations" },
  { slug: "museums", label: "Museums" },
  { slug: "local-experiences", label: "Local experiences" },
] as const;

export const TRANSPORT_PREFS = [
  { value: "PUBLIC_TRANSPORT", label: "Public transport" },
  { value: "CAR_WITH_DRIVER", label: "Car with driver" },
  { value: "SELF_DRIVE", label: "Self-drive" },
  { value: "TWO_WHEELER", label: "Two-wheeler" },
  { value: "WALKING_FOCUSED", label: "Mostly walking" },
  { value: "MIXED", label: "Mix it up" },
] as const;

export const ACCOMMODATION_PREFS = [
  { value: "HOSTEL", label: "Hostel" },
  { value: "BUDGET_HOTEL", label: "Budget hotel" },
  { value: "MID_RANGE_HOTEL", label: "Mid-range hotel" },
  { value: "LUXURY_HOTEL", label: "Luxury hotel" },
  { value: "HOMESTAY", label: "Homestay" },
  { value: "RESORT", label: "Resort" },
] as const;

export const BUDGET_CATEGORIES = [
  { value: "ACCOMMODATION", label: "Accommodation" },
  { value: "INTERCITY_TRANSPORT", label: "Intercity transport" },
  { value: "LOCAL_TRANSPORT", label: "Local transport" },
  { value: "FOOD", label: "Food" },
  { value: "ATTRACTION_ENTRY", label: "Attraction entry" },
  { value: "ACTIVITIES", label: "Activities" },
  { value: "SHOPPING", label: "Shopping" },
  { value: "MISC", label: "Miscellaneous" },
] as const;

export const SITE_NAME = "Destination Diaries";
export const SITE_TAGLINE = "Your next adventure, intelligently planned.";
