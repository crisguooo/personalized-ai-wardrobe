import { assignLayers } from "../data/layers.js";
// Construction recipes are soft priors. The exploration lane preserves other
// physically valid silhouettes so repeated preferences can overturn defaults.
export const FORMULAS = [
  {
    id: "fitted-wide",
    label: "Defined top + wide bottom",
    top: (i) => i.volume <= 1 || i.length === "cropped",
    bottom: (i) => i.volume >= 3,
    prior: 0.94,
  },
  {
    id: "oversized-straight",
    label: "Oversized top + clean leg",
    top: (i) => i.volume >= 4,
    bottom: (i) => i.volume <= 2,
    prior: 0.92,
  },
  {
    id: "roomy-shell",
    label: "Roomy outer + fitted base + relaxed leg",
    top: (i) => i.volume <= 2,
    bottom: (i) => i.volume >= 3,
    outerwear: (i) => i.volume >= 3 || i.bulk >= 4,
    prior: 0.96,
  },
  {
    id: "structured-relaxed",
    label: "Structured top + relaxed bottom",
    top: (i) => i.structure === "structured" || i.subcategory === "shirt",
    bottom: (i) => i.volume >= 3,
    prior: 0.9,
  },
  {
    id: "easy-straight",
    label: "Easy top + straight leg",
    top: (i) => i.volume <= 3 && i.length !== "cropped",
    bottom: (i) => i.volume >= 2 && i.volume <= 3,
    prior: 0.82,
  },
  {
    id: "fluid-volume",
    label: "Relaxed volume throughout",
    top: (i) => i.volume >= 3,
    bottom: (i) => i.volume >= 3,
    prior: 0.68,
  },
];
export function matchedFormulas(items) {
  const top = items.find((i) => i.category === "top"),
    bottom = items.find((i) => i.category === "bottom"),
    outer = assignLayers(items).outer;
  if (!top || !bottom) return [];
  return FORMULAS.filter(
    (f) =>
      f.top(top) &&
      f.bottom(bottom) &&
      (!f.outerwear || (outer && f.outerwear(outer))),
  );
}
export function formulaScore(items, profile = {}) {
  const defined = items
    .filter((i) => ["top", "bottom"].includes(i.category))
    .every((i) => i.volume <= 1);
  const fallback =
    0.62 + (defined ? Math.max(0, profile.weights?.fittedPair ?? 0) * 0.4 : 0);
  return Math.min(
    1,
    Math.max(
      fallback,
      ...matchedFormulas(items).map(
        (f) =>
          f.prior +
          Math.max(0, profile.weights?.[`formula_${f.id}`] ?? 0) * 0.35,
      ),
    ),
  );
}
