import { BY_ID } from "../data/catalog.js";
import { COLOR_METADATA } from "../data/styling.js";
const clamp = (n) => Math.max(0, Math.min(1, n));
export function palette(outfit, profile = {}) {
  const items = outfit.itemIds.map((id) => BY_ID[id]).filter(Boolean);
  const colors = [...new Set(items.map((i) => i.color))];
  const dominant = [
    ...new Set(
      items.filter((i) => i.category !== "accessory").map((i) => i.color),
    ),
  ];
  const tones = [
    ...new Set(
      colors.map((c) => COLOR_METADATA[c].tone).filter((t) => t !== "neutral"),
    ),
  ];
  const accentColors = colors.filter((c) => COLOR_METADATA[c].accent);
  const accessoryAccent = colors.filter((c) => !dominant.includes(c));
  const neutralCount = items.filter(
    (i) =>
      ["neutral", "dark"].includes(i.colorFamily) &&
      !COLOR_METADATA[i.color].accent,
  ).length;
  const neutralAccent =
    accentColors.length === 1 && neutralCount >= items.length - 2;
  const highContrast =
    colors.some((c) => COLOR_METADATA[c].dark) &&
    colors.some((c) => COLOR_METADATA[c].light);
  const tonal = tones.length <= 1;
  const unrelated = Math.max(
    0,
    tones.length -
      1 -
      +(
        neutralAccent ||
        (accessoryAccent.length === 1 && dominant.length <= 2)
      ),
  );
  const excess =
    Math.max(0, dominant.length - 3) +
    Math.max(0, colors.length - Math.max(3, dominant.length + 1)) * 0.5;
  const expression = Math.max(0, profile.weights?.multiColor ?? 0);
  const basePenalty =
    excess * 0.17 +
    unrelated * 0.14 +
    Math.max(0, accentColors.length - 1) * 0.1;
  const score = clamp(
    0.88 +
      0.06 * (colors.length === 1) +
      0.04 * tonal +
      0.04 * neutralAccent -
      basePenalty * (1 - expression * 0.85),
  );
  return {
    colors,
    dominantCount: dominant.length,
    unrelated,
    neutralAccent,
    highContrast,
    tonal,
    score,
    penalty: 1 - score,
    cohesive: colors.length <= 3 && unrelated === 0,
    label: neutralAccent
      ? "Neutrals with an accent"
      : colors.length > 3
        ? "Expressive palette"
        : !tonal
          ? "Contrasting tones"
          : tones[0] === "earth"
            ? "Earth tones"
            : tones[0] === "blue"
              ? "Cool blues & neutrals"
              : tones[0] === "red"
                ? "Red accents & neutrals"
                : "Tonal neutrals",
  };
}
// Compatibility facade: color is a soft score; never discard a valid palette.
export const coordinated = (candidates, profile) =>
  [...candidates].sort(
    (a, b) =>
      palette(b, profile).score - palette(a, profile).score ||
      a.id.localeCompare(b.id),
  );
