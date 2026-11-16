import type { Diary, PhotoRef } from "./types";

/**
 * Example diaries written by the Destination Diaries team to show what the
 * product makes. They are illustrations, not accounts by real travellers,
 * and are labelled as samples wherever they appear.
 */

const d = (file: string, caption: string, credit: string): PhotoRef => ({ id: file, src: `/images/${file}`, caption, credit });

const P = {
  amer: d("destinations/jaipur.jpg", "Amer Fort, doubled in the lake", "Arkadipta Chandra, CC BY-SA 4.0"),
  hawa: d("diary/hawa-mahal.jpg", "953 windows, they say. I lost count at forty.", "Chainwit., CC BY-SA 4.0"),
  bazaar: d("diary/jaipur-bazaar.jpg", "An old postcard of Johari Bazaar, bought for ten rupees", "TuckDB Postcards, CC BY 4.0"),
  nahargarh: d("diary/nahargarh.jpg", "The whole city from Nahargarh", "Harshil s mehta, CC BY 4.0"),
  palace: d("diary/city-palace.jpg", "A gate at the City Palace", "Daniel Villafruela, CC BY-SA 3.0"),
  nets: d("destinations/kochi.jpg", "The nets at dusk", "Vyacheslav Argenberg, CC BY 4.0"),
  kochiStreet: d("diary/kochi-street.jpg", "Fort Kochi wears its years well", "Kanad Sanyal, CC BY-SA 4.0"),
  kathakali: d("diary/kathakali.jpg", "Two hours of make-up for this", "Aliva Sahoo, CC BY-SA 4.0"),
  backwaters: d("diary/backwaters.jpg", "The slow road south", "Paul Arps, CC BY 2.0"),
  kanchenjunga: d("destinations/darjeeling.jpg", "Kanchenjunga, finally", "Souviknshm, CC BY-SA 4.0"),
  train: d("diary/toy-train.jpg", "Steam, soot and a school zone", "Syed Sajidul Islam, CC BY-SA 4.0"),
  tea: d("diary/tea-garden.jpg", "Two leaves and a bud", "Benoy, CC BY-SA 3.0"),
  hampi: d("destinations/hampi.jpg", "Virupaksha above the banana fields", "Abhishek.ujoshi, CC BY-SA 4.0"),
  chariot: d("diary/stone-chariot.jpg", "The stone chariot", "Ram Nagesh Thota, CC BY-SA 4.0"),
  rishikesh: d("destinations/rishikesh.jpg", "The bridge at first light", "Kaustubh Nayyar, CC BY-SA 4.0"),
};

const stamp = "2026-11-16T00:00:00.000Z";
const AUTHOR = "The Destination Diaries team";

export const SAMPLE_DIARIES: Diary[] = [
  {
    id: "sample-pink-city",
    slug: "pink-city-slowly",
    sample: true,
    title: "Pink City, Slowly",
    subtitle: "Three winter days in Jaipur",
    author: AUTHOR,
    destination: "Jaipur, Rajasthan",
    startDate: "2026-01-09",
    endDate: "2026-01-11",
    template: "journal",
    coverPhoto: P.amer,
    library: [],
    createdAt: stamp,
    updatedAt: stamp,
    chapters: [
      {
        id: "pc-1", title: "The fort before the crowds", place: "Amer", date: "2026-01-09",
        note: "Go early. The light does half the work.",
        photos: [P.amer, P.nahargarh],
        body:
          "We reached Amer while the lake was still perfectly flat, and for a few minutes there were two forts: one of sandstone and one of water. A flock of pigeons kept rearranging itself over both.\n\nInside, the courtyards open one into the next like a story that refuses to end. I stopped trying to photograph the mirror hall and simply stood in it. Some places are better remembered than recorded.\n\nBy the time we walked back down, the road was full and the lake had lost its reflection to the breeze. It felt like being let in on a secret that the day then took back.",
      },
      {
        id: "pc-2", title: "A wall made of windows", place: "The old city", date: "2026-01-10",
        note: "Best seen from the café across the road, with chai.",
        photos: [P.hawa, P.palace, P.bazaar],
        body:
          "The Hawa Mahal is less a building than a screen: five storeys of lattice, built so that the women of the court could watch the street without being watched back. From the pavement it looks like a honeycomb that someone has painted the colour of a sunset.\n\nWe spent the afternoon getting pleasantly lost in the bazaars behind it. A shopkeeper sold me an old postcard of this very street for ten rupees and would not hear of bargaining, because, he said, history has a fixed price.\n\nEvery lane seemed to have its own trade — bangles, then block prints, then sweets — as if the city had been filed alphabetically by someone with a sweet tooth.",
      },
      {
        id: "pc-3", title: "The city, all at once", place: "Nahargarh", date: "2026-01-11",
        note: "Bring a shawl. The ridge is colder than you think.",
        photos: [P.nahargarh],
        body:
          "On the last evening we drove up to the ridge. From Nahargarh the whole of Jaipur is laid out below like a map of itself: the grid of the old city, the lake, and the haze beyond.\n\nNobody talks much up there at sunset. The lamps came on in ones and twos, then in hundreds, and the city turned from pink to gold to a scatter of small lights.\n\nI have decided that this is how to leave a place — from above, quietly, promising to come back.",
      },
    ],
  },
  {
    id: "sample-malabar",
    slug: "salt-and-spice",
    sample: true,
    title: "Salt & Spice",
    subtitle: "A long weekend on the Malabar coast",
    author: AUTHOR,
    destination: "Kochi, Kerala",
    startDate: "2026-08-14",
    endDate: "2026-08-16",
    template: "monsoon",
    coverPhoto: P.nets,
    library: [],
    createdAt: stamp,
    updatedAt: stamp,
    chapters: [
      {
        id: "ml-1", title: "The nets", place: "Fort Kochi", date: "2026-08-14",
        note: "Six men to lift one net. Ask before you help — then help.",
        photos: [P.nets, P.kochiStreet],
        body:
          "The fishing nets stand along the shore like enormous insects resting on the water. Each one is worked by a team who haul on ropes weighted with stones, and the whole contraption rises, dripping, into the evening.\n\nThe catch that night was small. Nobody seemed to mind. The sky did what the sea would not, and turned every colour it had.\n\nBehind the shore, Fort Kochi's streets carry the handwriting of everyone who has ever traded here. The walls are peeling in the most photogenic way imaginable.",
      },
      {
        id: "ml-2", title: "A face painted green", place: "Fort Kochi", date: "2026-08-15",
        note: "Arrive an hour early to watch the make-up.",
        photos: [P.kathakali],
        body:
          "We arrived early enough to watch the make-up. It is a performance of its own: a face built up, layer on layer, until the man disappears and a character looks back from the mirror.\n\nThen the drums began, and for an hour a whole epic was told with eyes, fingers and the stamp of a foot. I understood perhaps a third of it and was moved by all of it.",
      },
      {
        id: "ml-3", title: "The slow road south", place: "The backwaters", date: "2026-08-16",
        note: "Nothing happens here, beautifully.",
        photos: [P.backwaters],
        body:
          "On the last day we went looking for the backwaters, and found that they are less a place than a pace. The boat moves at the speed of a thought you are in no hurry to finish.\n\nPalms, a church, a child waving from a bank, a kingfisher that was there and then was not. It rained twice, briefly, as if to keep everything rinsed.\n\nI wrote most of this diary on that deck. It seemed the right speed for remembering.",
      },
    ],
  },
  {
    id: "sample-clouds",
    slug: "above-the-clouds",
    sample: true,
    title: "Above the Clouds",
    subtitle: "Tea, steam and a mountain that hides",
    author: AUTHOR,
    destination: "Darjeeling, West Bengal",
    startDate: "2026-04-03",
    endDate: "2026-04-05",
    template: "fieldnotes",
    coverPhoto: P.kanchenjunga,
    library: [],
    createdAt: stamp,
    updatedAt: stamp,
    chapters: [
      {
        id: "cl-1", title: "The little engine", place: "Darjeeling to Ghum", date: "2026-04-03",
        note: "Sit on the left going up!",
        photos: [P.train],
        body:
          "The toy train does not so much leave the station as think about it for a while and then agree. It shares the road with cars, shops and schoolchildren, and whistles at all of them.\n\nAt the loop it turns a full circle around a garden, as if to admire its own tail. Everyone on board leaned out of the same side at once.",
      },
      {
        id: "cl-2", title: "Two leaves and a bud", place: "The tea gardens", date: "2026-04-04",
        note: "First flush tastes like the hillside smells.",
        photos: [P.tea, P.kanchenjunga],
        body:
          "The tea bushes run down the slopes in rows so neat they look combed. We walked between them in the morning and were shown how to pick: two leaves and a bud, nothing more, a small precise theft repeated ten thousand times a day.\n\nAfterwards, a cup. I have drunk Darjeeling tea all my life and only now understand what it was trying to tell me.",
      },
      {
        id: "cl-3", title: "The mountain shows itself", place: "Tiger Hill", date: "2026-04-05",
        note: "4 a.m. alarm. Worth it. Just.",
        photos: [P.kanchenjunga],
        body:
          "For two days the mountain had been a rumour behind the cloud. On the third morning we stood in the cold with strangers and thermos flasks, and waited.\n\nThen the cloud thinned, and there it was — not on the horizon but above it, where I had been looking at sky. The first light touched the summit and moved down it slowly, like someone lowering a lamp.\n\nNobody cheered. A few people laughed, the way you do when something is too large to have an opinion about.",
      },
    ],
  },
];

/** Loose photos used by marketing demos. */
export const SAMPLE_PHOTOS = P;

export function getSampleBySlug(slug: string): Diary | undefined {
  return SAMPLE_DIARIES.find((x) => x.slug === slug);
}
