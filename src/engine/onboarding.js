import { BY_ID } from "../data/catalog.js";

// Essentials come first. Everything after shoes is optional.
export const SETUP_GROUPS = [
  {
    key: "tops",
    title: "What kind of tops do you own?",
    items: [
      "crew-tee",
      "fitted-tee",
      "oversized-tee",
      "baby-tee",
      "off-shoulder",
      "tank",
    ],
  },
  {
    key: "bottoms",
    title: "What do you reach for on the bottom?",
    items: [
      "straight-jeans",
      "wide-jeans",
      "trousers",
      "sweatpants",
      "mini-skirt",
      "midi-skirt",
    ],
  },
  {
    key: "shoes",
    title: "Which shoes are in your rotation?",
    items: ["sneakers", "loafers", "mary-janes", "ankle-boots"],
  },
  {
    key: "layers",
    title: "Any cozy favorites?",
    items: ["knit", "sweatshirt", "hoodie", "cardigan", "zip-hoodie"],
    optional: true,
  },
  {
    key: "outerwear",
    title: "What do you throw on top?",
    items: [
      "denim-jacket",
      "leather-jacket",
      "blazer",
      "trench",
      "puffer",
      "bomber",
    ],
    optional: true,
  },
  {
    key: "accessories",
    title: "Any finishing touches?",
    items: ["shoulder-bag", "cap"],
    optional: true,
  },
];
export const freshOnboarding = () => ({
  step: "welcome",
  group: 0,
  selections: {},
  colorIndex: 0,
  resumeStep: "fits",
});
export function normalizeOnboarding(raw) {
  const draft = freshOnboarding();
  if (!raw || typeof raw !== "object") return draft;
  draft.group = Number.isInteger(raw.group)
    ? Math.max(0, Math.min(SETUP_GROUPS.length - 1, raw.group))
    : 0;
  for (const group of SETUP_GROUPS) {
    draft.selections[group.key] = Array.isArray(raw.selections?.[group.key])
      ? [
          ...new Set(
            raw.selections[group.key].filter((key) =>
              group.items.includes(key),
            ),
          ),
        ]
      : [];
  }
  const choices = draft.selections[SETUP_GROUPS[draft.group].key];
  draft.colorIndex = Number.isInteger(raw.colorIndex)
    ? Math.max(0, Math.min(Math.max(0, choices.length - 1), raw.colorIndex))
    : 0;
  draft.step = ["welcome", "fits", "colors", "ready"].includes(raw.step)
    ? raw.step
    : "welcome";
  if (draft.step === "colors" && !choices.length) draft.step = "fits";
  draft.resumeStep =
    raw.resumeStep === "colors" && choices.length ? "colors" : "fits";
  return draft;
}
export function hasEssentials(ids) {
  const categories = new Set(ids.map((id) => BY_ID[id]?.category));
  return ["top", "bottom", "shoes"].every((category) =>
    categories.has(category),
  );
}
export function canStartEarly(ids) {
  return new Set(ids.filter((id) => BY_ID[id])).size >= 8 && hasEssentials(ids);
}
export function nextGroup(draft) {
  return draft.group === SETUP_GROUPS.length - 1
    ? { ...draft, step: "ready", resumeStep: "fits" }
    : { ...draft, step: "fits", group: draft.group + 1, colorIndex: 0 };
}
