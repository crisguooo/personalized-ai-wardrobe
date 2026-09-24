import { BY_ID } from "../data/catalog.js";

// Neutrals bridge palettes; blues, earth tones and red accents each form a family.
const families = {
  navy: "blue",
  blue: "blue",
  brown: "earth",
  beige: "earth",
  olive: "earth",
  camel: "earth",
  red: "red",
  burgundy: "red",
};
export function palette(outfit) {
  const colors = [
    ...new Set(outfit.itemIds.map((id) => BY_ID[id]?.color).filter(Boolean)),
  ];
  const tones = [...new Set(colors.map((c) => families[c]).filter(Boolean))];
  const penalty =
    Math.max(0, colors.length - 3) * 20 + Math.max(0, tones.length - 1) * 4;
  return {
    colors,
    penalty,
    cohesive: colors.length <= 3 && tones.length <= 1,
    label:
      colors.length > 3
        ? "More than 3 colors — closest available match"
        : tones.length > 1
          ? "Mixed tones — closest available match"
          : tones[0] === "earth"
            ? "Earth tones"
            : tones[0] === "blue"
              ? "Cool blues & neutrals"
              : tones[0] === "red"
                ? "Red accents & neutrals"
                : "Tonal neutrals",
  };
}
export function coordinated(candidates) {
  if (!candidates.length) return [];
  const cohesive = candidates.filter((o) => palette(o).cohesive);
  if (cohesive.length) return cohesive;
  const underThree = candidates.filter((o) => palette(o).colors.length <= 3);
  return underThree.length ? underThree : candidates;
}
