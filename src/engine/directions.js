import { assignLayers, isLayer } from "../data/layers.js";
import { BY_ID } from "../data/catalog.js";
import { COLOR_METADATA } from "../data/styling.js";
import { palette } from "./palette.js";
import { formulaScore, matchedFormulas } from "./formulas.js";
import {
  visualWeightScore,
  focalHierarchyScore,
  proportionScore,
} from "./aesthetics.js";

const clamp = (n) => Math.max(0, Math.min(1, n));
const mean = (xs) => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);
// Specific style languages, not a transitive "all casual pieces go together" rule.
export const DIRECTIONS = [
  {
    id: "minimal clean",
    tags: { minimal: 1, "smart-casual": 0.8, casual: 0.55, preppy: 0.55 },
    occasions: { Everyday: 0.9, Work: 0.9, Date: 0.7, Comfy: 0.6 },
  },
  {
    id: "relaxed street",
    tags: {
      streetwear: 1,
      edgy: 0.8,
      sporty: 0.75,
      casual: 0.7,
      minimal: 0.55,
    },
    occasions: { Everyday: 0.85, "Going out": 0.8, Comfy: 0.8 },
  },
  {
    id: "sporty casual",
    tags: { sporty: 1, streetwear: 0.75, casual: 0.8, minimal: 0.5 },
    occasions: { Everyday: 0.7, Comfy: 1 },
  },
  {
    id: "soft feminine",
    tags: { feminine: 1, minimal: 0.65, preppy: 0.65, "smart-casual": 0.55 },
    occasions: { Date: 1, "Going out": 0.75, Everyday: 0.6 },
  },
  {
    id: "polished casual",
    tags: { "smart-casual": 1, minimal: 0.85, preppy: 0.8, casual: 0.45 },
    occasions: { Work: 1, Date: 0.85, Everyday: 0.85 },
  },
  {
    id: "edgy",
    tags: { edgy: 1, streetwear: 0.8, minimal: 0.6 },
    occasions: { "Going out": 1, Date: 0.7, Everyday: 0.5 },
  },
  {
    id: "preppy",
    tags: { preppy: 1, "smart-casual": 0.85, minimal: 0.6, feminine: 0.55 },
    occasions: { Work: 0.85, Date: 0.75, Everyday: 0.7 },
  },
];
export function directionAffinity(item, direction) {
  const d = DIRECTIONS.find((d) => d.id === direction) ?? DIRECTIONS[0];
  const tags = item.styleTags.filter((t) => t !== "casual");
  // Generic basics may support a direction; they never establish every direction.
  const values = (tags.length ? tags : ["casual"]).map(
    (t) => d.tags[t] ?? 0.12,
  );
  const formalityMismatch = ["sporty casual", "relaxed street"].includes(d.id)
    ? Math.max(0, item.formality - 3) * 0.1
    : 0;
  const quietShoe =
    item.category === "shoes" &&
    item.texture === "smooth" &&
    item.visualWeight <= 2.5 &&
    item.bulk <= 2;
  if (
    quietShoe &&
    ["minimal clean", "polished casual", "preppy"].includes(direction)
  )
    return 0.72;
  return clamp(
    0.7 * Math.max(...values) + 0.3 * mean(values) - formalityMismatch,
  );
}
export function directionOrder(profile = {}, occasion = "Everyday") {
  return DIRECTIONS.map((d) => ({
    ...d,
    priority:
      (d.occasions[occasion] ?? 0.2) +
      (profile.weights?.[`direction_${d.id}`] ?? 0) * 0.8 +
      Object.entries(d.tags).reduce(
        (s, [tag, affinity]) =>
          s + Math.max(0, profile.weights?.[tag] ?? 0) * affinity,
        0,
      ) *
        0.3,
  })).sort((a, b) => b.priority - a.priority || a.id.localeCompare(b.id));
}
export function inferDirection(items, occasion = "Everyday") {
  return directionOrder({}, occasion)
    .map((d) => ({
      id: d.id,
      score:
        mean(items.map((i) => directionAffinity(i, d.id))) + d.priority * 0.06,
    }))
    .sort((a, b) => b.score - a.score)[0].id;
}
export function salience(item) {
  return (
    Math.max(
      0,
      (item.colorSpec ?? COLOR_METADATA[item.color]).saturation - 0.25,
    ) *
      1.05 +
    (item.volume >= 4 ? 0.22 : 0) +
    (item.texture !== "smooth" ? 0.16 : 0) +
    (item.structure === "structured" ? 0.13 : 0) +
    (item.visualWeight >= 4 ? 0.16 : 0)
  );
}
export function chooseHero(items, direction) {
  return [...items].sort(
    (a, b) =>
      salience(b) +
        directionAffinity(b, direction) * 0.2 -
        (salience(a) + directionAffinity(a, direction) * 0.2) ||
      a.id.localeCompare(b.id),
  )[0]?.id;
}
export function shoeCompatibility(items, direction) {
  const shoe = items.find((i) => i.category === "shoes");
  const bottom = items.find((i) => i.category === "bottom");
  if (!shoe || !bottom) return 0.5;
  const body = items.filter(
    (i) => ["top", "bottom"].includes(i.category) || isLayer(i),
  );
  const weight = Math.max(...body.map((i) => i.visualWeight));
  const grounding = clamp(
    1 -
      Math.max(0, weight - shoe.visualWeight - 1) * 0.24 -
      Math.max(0, shoe.visualWeight - bottom.visualWeight - 2) * 0.12,
  );
  const formality = clamp(
    1 - Math.abs(mean(body.map((i) => i.formality)) - shoe.formality) * 0.2,
  );
  return clamp(
    0.55 * directionAffinity(shoe, direction) +
      0.3 * grounding +
      0.15 * formality,
  );
}
// Evaluate the complete composition before evaluating whether an extra earns its place.
export function composition(outfit, direction = outfit.aestheticDirection) {
  const items = outfit.itemIds.map((id) => BY_ID[id]).filter(Boolean);
  direction ??= inferDirection(items);
  const affinities = items.map((i) => directionAffinity(i, direction));
  const outsiders = affinities.filter((a) => a < 0.45).length;
  const language = clamp(
    0.7 * mean(affinities) + 0.3 * Math.min(...affinities) - outsiders * 0.1,
  );
  const color = palette(outfit);
  const shoe = shoeCompatibility(items, direction);
  const structure =
    0.28 * language +
    0.2 * shoe +
    0.16 * visualWeightScore(items) +
    0.14 * focalHierarchyScore(items) +
    0.12 * formulaScore(items) +
    0.1 * proportionScore(items);
  // Color competition and unrelated language degrade the entire look, not one tiny subscore.
  const cohesion = clamp(
    structure * (0.45 + 0.55 * color.score) * (0.7 + 0.3 * language) -
      outsiders * 0.07 -
      Math.max(0, color.unrelated - 1) * 0.1,
  );
  return {
    cohesion,
    language,
    shoe,
    quality: cohesion - Math.max(0, items.length - 3) * 0.022,
  };
}
export function additionValue(outfit, item) {
  const next = { ...outfit, itemIds: [...outfit.itemIds, item.id] };
  return composition(next).quality - composition(outfit).quality;
}
export function annotateLook(outfit, occasion = "Everyday") {
  const items = outfit.itemIds.map((id) => BY_ID[id]).filter(Boolean);
  const aestheticDirection = DIRECTIONS.some(
    (d) => d.id === outfit.aestheticDirection,
  )
    ? outfit.aestheticDirection
    : inferDirection(items, occasion);
  return {
    ...outfit,
    aestheticDirection,
    heroItemId: outfit.itemIds.includes(outfit.heroItemId)
      ? outfit.heroItemId
      : chooseHero(items, aestheticDirection),
    outfitArchetype: matchedFormulas(items)[0]?.id ?? "individual proportion",
    colorStrategy: palette(outfit).strategy,
    layerStructure: assignLayers(items, outfit.generationLayerStructure)
      .structure,
  };
}
export function intentionalityScores(
  outfit,
  occasion = "Everyday",
  requiredForWeather = [],
) {
  const look = annotateLook(outfit, occasion);
  const complete = composition(look);
  const extras = look.itemIds
    .map((id) => BY_ID[id])
    .filter((i) => ["outerwear", "midlayer", "accessory"].includes(i.category));
  const removable = extras
    .filter((i) => !requiredForWeather.includes(i.id))
    .filter((i) => {
      const without = {
        ...look,
        itemIds: look.itemIds.filter((id) => id !== i.id),
      };
      return complete.quality - composition(without).quality < 0.018;
    });
  const cohesion = clamp(complete.cohesion - removable.length * 0.08);
  return {
    cohesion,
    intentionality: clamp(cohesion - removable.length * 0.1),
    shoeCompatibility: complete.shoe,
    directionCoherence: complete.language,
    redundantItemIds: removable.map((i) => i.id),
    aestheticDirection: look.aestheticDirection,
  };
}
