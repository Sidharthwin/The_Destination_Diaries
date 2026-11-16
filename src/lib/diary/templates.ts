import type { TemplateId } from "./types";

export interface DiaryTemplate {
  id: TemplateId;
  name: string;
  tagline: string;
  /** Page colours */
  paper: string;
  ink: string;
  muted: string;
  accent: string;
  /** Cover colours */
  cover: string;
  coverInk: string;
  heading: "serif" | "hand" | "sans";
  photo: "taped" | "polaroid" | "stamp" | "bleed" | "plain";
  /** Ruled lines on text pages */
  ruled: boolean;
}

export const TEMPLATES: DiaryTemplate[] = [
  {
    id: "journal", name: "Heirloom Journal", tagline: "Cloth-bound, cream pages, photographs taped in.",
    paper: "#f7f2e6", ink: "#252923", muted: "#6b6f63", accent: "#a84e33",
    cover: "#173d32", coverInk: "#e9dcc0", heading: "serif", photo: "taped", ruled: false,
  },
  {
    id: "fieldnotes", name: "Field Notes", tagline: "Kraft paper, ruled lines, written in the moment.",
    paper: "#e6d8bb", ink: "#2c2a22", muted: "#6e6550", accent: "#7a3b1f",
    cover: "#b98b54", coverInk: "#2c2a22", heading: "hand", photo: "polaroid", ruled: true,
  },
  {
    id: "postcard", name: "Postcards Home", tagline: "Bright borders and stamps, one card per memory.",
    paper: "#fbf6ec", ink: "#27303f", muted: "#66707f", accent: "#d97757",
    cover: "#d97757", coverInk: "#fff8ec", heading: "serif", photo: "stamp", ruled: false,
  },
  {
    id: "monsoon", name: "Monsoon", tagline: "Dark, cinematic pages where photographs run to the edge.",
    paper: "#14231f", ink: "#efe7d6", muted: "#a9b3a6", accent: "#e0a070",
    cover: "#0c1714", coverInk: "#e0a070", heading: "serif", photo: "bleed", ruled: false,
  },
  {
    id: "atlas", name: "Atlas", tagline: "White space, clean type, the quiet of a gallery wall.",
    paper: "#ffffff", ink: "#1c1c1a", muted: "#77776f", accent: "#173d32",
    cover: "#f1ede4", coverInk: "#1c1c1a", heading: "sans", photo: "plain", ruled: false,
  },
];

export function getTemplate(id: TemplateId | string): DiaryTemplate {
  return TEMPLATES.find((t) => t.id === id) ?? TEMPLATES[0];
}
