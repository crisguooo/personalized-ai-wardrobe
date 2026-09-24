import { BY_ID } from "../data/catalog.js";
import { palette, colorFeatures } from "./palette.js";
import { matchedFormulas } from "./formulas.js";
import { aestheticScores } from "./aesthetics.js";
import { inferDirection } from "./directions.js";
export const REASONS = [
  "Too basic",
  "Too fitted",
  "Too baggy",
  "Color combination",
  "Too feminine",
  "Too masculine",
  "Too dressy",
  "Too casual",
  "Too much going on",
  "Just not me",
];
export const LABELS = {
  relaxed: "Relaxed silhouettes",
  fitted: "Fitted silhouettes",
  straight: "Straight-leg bottoms",
  wide: "Wide-leg bottoms",
  skinny: "Skinny bottoms",
  neutral: "Neutral palettes",
  earth: "Earth tones",
  colorful: "A pop of color",
  monochrome: "Tonal dressing",
  contrast: "Light & dark contrast",
  layered: "Layered looks",
  simple: "Simple combinations",
  dressy: "Polished pieces",
  casual: "Casual dressing",
  balanced: "Fitted top, loose bottom",
  volume: "Volume on volume",
  fittedPair: "Defined silhouettes",
  sweats: "Matching sweats",
  feminine: "Feminine details",
  masculine: "Structured, utilitarian pieces",
  streetwear: "Streetwear influences",
  preppy: "Preppy details",
  minimal: "Minimal pieces",
  sporty: "Sporty details",
  edgy: "Edgy details",
  "smart-casual": "Smart casual details",
  interest: "Visual interest",
  lowComplexity: "Low visual complexity",
  neutralAccent: "Neutrals with one accent",
  tonal: "Tonal palettes",
  multiColor: "Expressive color combinations",
  relaxedStructured: "Relaxed tops with structured bottoms",
  colorWarm: "Warm palettes",
  colorCool: "Cool palettes",
  colorNeutral: "Neutral temperatures",
  colorMuted: "Muted colors",
  colorVivid: "Vivid colors",
  colorLowContrast: "Soft tonal contrast",
  colorMediumContrast: "Moderate light-dark contrast",
  colorHighContrast: "Strong light-dark contrast",
  colorSimplePalette: "Focused palettes",
  colorComplexPalette: "Layered color relationships",
  colorAccent: "Controlled color accents",
  colorTonal: "Tonal color depth",
  colorContrast: "Intentional color contrast",
};
const loose = (i) => ["relaxed", "oversized", "wide-leg"].includes(i.fit);
const slim = (i) => ["fitted", "skinny"].includes(i.fit);
export function features(outfit) {
  const items = outfit.itemIds.map((id) => BY_ID[id]).filter(Boolean),
    top = items.find((i) => i.category === "top"),
    bottom = items.find((i) => i.category === "bottom");
  if (!top || !bottom) return {};
  const colors = [...new Set(items.map((i) => i.color))],
    dark = colors.some((c) =>
      ["black", "navy", "brown", "burgundy"].includes(c),
    ),
    light = colors.some((c) => ["white", "beige", "cream"].includes(c));
  const f = {
    relaxed: +loose(top),
    fitted: +slim(top),
    straight: +(bottom.fit === "straight"),
    wide: +(bottom.fit === "wide-leg"),
    skinny: +(bottom.fit === "skinny"),
    neutral: +colors.every(
      (c) => !["red", "blue", "burgundy", "olive"].includes(c),
    ),
    earth: +colors.some((c) =>
      ["brown", "beige", "camel", "olive"].includes(c),
    ),
    colorful: +colors.some((c) => ["red", "burgundy"].includes(c)),
    monochrome: +(colors.length === 1),
    contrast: +(dark && light),
    layered: +items.some((i) => ["midlayer", "outerwear"].includes(i.category)),
    simple: +(items.length === 3),
    dressy:
      items.reduce((s, i) => s + i.formality, 0) / items.length / 4 - 0.25,
    casual:
      1 - (items.reduce((s, i) => s + i.formality, 0) / items.length - 1) / 4,
    balanced: +(slim(top) && loose(bottom)),
    volume: +(loose(top) && loose(bottom)),
    fittedPair: +(slim(top) && slim(bottom)),
    sweats: +(
      ["hoodie", "sweatshirt"].includes(top.subcategory) &&
      bottom.subcategory === "sweatpants" &&
      top.color === bottom.color
    ),
    masculine: +(bottom.subcategory === "cargo" || top.subcategory === "polo"),
  };
  for (const tag of [
    "feminine",
    "streetwear",
    "preppy",
    "minimal",
    "sporty",
    "edgy",
    "smart-casual",
  ])
    f[tag] =
      items.filter((i) => i.styleTags.includes(tag)).length / items.length;
  const colorsInfo = palette(outfit);
  f.neutralAccent = +colorsInfo.neutralAccent;
  f.tonal = +colorsInfo.tonal;
  f.multiColor = colorFeatures(colorsInfo).colorComplexPalette;
  Object.assign(f, colorFeatures(colorsInfo));
  f.relaxedStructured = +(loose(top) && bottom.structure === "structured");
  f.interest = visualInterest(items, colorsInfo);
  f.lowComplexity = 1 - f.interest;
  for (const formula of matchedFormulas(items)) f[`formula_${formula.id}`] = 1;
  const aesthetics = aestheticScores(items, "Everyday");
  // These features let repeated likes support intentional departures too.
  f.weightContrast = 1 - aesthetics.visualWeight;
  f.styleMix = 1 - aesthetics.styleCoherence;
  f.seasonMix = 1 - aesthetics.thermalCoherence;
  f.multipleFocals = 1 - aesthetics.focalHierarchy;
  f[
    `direction_${outfit.aestheticDirection ?? inferDirection(items, outfit.occasion)}`
  ] = 1;
  return f;
}

export function visualInterest(items, colorInfo) {
  const body = items.filter((i) =>
    ["top", "bottom", "midlayer", "outerwear"].includes(i.category),
  );
  const top = body.find((i) => i.category === "top"),
    bottom = body.find((i) => i.category === "bottom");
  if (!top || !bottom) return 0;
  const textureContrast = new Set(body.map((i) => i.texture)).size > 1;
  const volumeContrast = Math.abs(top.volume - bottom.volume) >= 2;
  const layers = body.length - 2;
  const accessory = items.some((i) => i.category === "accessory");
  const proportion = top.length === "cropped" && bottom.length === "long";
  const focal = body.some((i) => i.volume >= 4 || i.visualWeight >= 4);
  return Math.min(
    1,
    0.12 +
      0.16 * textureContrast +
      0.17 * volumeContrast +
      0.14 * Math.min(2, layers) +
      0.12 * accessory +
      0.12 * proportion +
      0.1 * focal +
      0.12 * (colorInfo.highContrast || colorInfo.neutralAccent) +
      0.08 * colorFeatures(colorInfo).colorComplexPalette,
  );
}
