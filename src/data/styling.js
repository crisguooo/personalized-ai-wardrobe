// Construction defaults, not rules about which outfits a person should like.
// The existing IDs, fits and thermal guides remain stable.
const clamp = (n) => Math.max(1, Math.min(5, n));
export const COLOR_METADATA = {
  white: { family: "neutral", tone: "neutral", light: true },
  cream: { family: "neutral", tone: "neutral", light: true },
  grey: { family: "neutral", tone: "neutral" },
  black: { family: "dark", tone: "neutral", dark: true },
  navy: { family: "dark", tone: "blue", dark: true },
  blue: { family: "pastel", tone: "blue", light: true },
  beige: { family: "earth", tone: "earth", light: true },
  brown: { family: "earth", tone: "earth", dark: true },
  camel: { family: "earth", tone: "earth" },
  olive: { family: "earth", tone: "earth" },
  burgundy: { family: "dark", tone: "red", dark: true, accent: true },
  red: { family: "bright", tone: "red", accent: true },
};

export function stylingMetadata(item) {
  const { key, category, subcategory, fit, thermal } = item;
  const volume =
    {
      fitted: 1,
      skinny: 1,
      regular: 2,
      straight: 2,
      relaxed: 3,
      "wide-leg": 4,
      oversized: 5,
    }[fit] ?? 2;
  const structured = [
    "blazer",
    "coat",
    "trousers",
    "jeans",
    "cargo",
    "boots",
    "ankle-boots",
    "loafers",
    "bag",
    "belt",
  ].includes(subcategory);
  const soft = [
    "tee",
    "tank",
    "tube",
    "knit",
    "hoodie",
    "sweatshirt",
    "cardigan",
    "fleece",
    "thermal",
    "leggings",
    "sweatpants",
    "scarf",
    "gloves",
  ].includes(subcategory);
  const structure = structured ? "structured" : soft ? "soft" : "medium";
  const texture = ["knit", "cardigan", "scarf"].includes(subcategory)
    ? "knit"
    : ["jeans"].includes(subcategory) || key === "denim-jacket"
      ? "denim"
      : ["hoodie", "sweatshirt", "sweatpants", "fleece"].includes(subcategory)
        ? "fleece"
        : subcategory === "puffer" || subcategory === "vest"
          ? "quilted"
          : key === "leather-jacket" ||
              ["boots", "loafers", "belt", "bag"].includes(subcategory)
            ? "leather"
            : "smooth";
  const length =
    item.length === "cropped" || key === "cropped-jacket"
      ? "cropped"
      : item.length === "long" ||
          (category === "bottom" && thermal.coverage === 3)
        ? "long"
        : category === "top" && fit === "fitted"
          ? "waist"
          : "hip";
  const constructionBulk =
    category === "accessory"
      ? 1
      : clamp(Math.ceil(item.warmth * 0.65 + volume * 0.45));
  const bulk = ["tee", "tank", "tube", "shirt", "thermal"].includes(subcategory)
    ? Math.min(volume >= 4 ? 3 : 2, constructionBulk)
    : constructionBulk;
  const layerCapacity = ["midlayer", "outerwear"].includes(category)
    ? clamp(
        volume +
          (category === "outerwear" ? 1 : 0) +
          (subcategory === "puffer" || subcategory === "parka" ? 2 : 0),
      )
    : 1;
  return {
    volume,
    length,
    structure,
    texture,
    bulk,
    // This archetype is cut close; thermal warmth is not a proxy for its capacity.
    layerCapacity:
      key === "leather-jacket" ? 2 : key === "cardigan" ? 3 : layerCapacity,
    formality: [1, 3, 4][item.formality] ?? 3,
    exposure: ["top", "bottom"].includes(category)
      ? clamp(
          4 -
            thermal.coverage +
            (length === "cropped" ? 2 : 0) +
            (item.neckline === "off-shoulder" ? 2 : 0),
        )
      : 1,
    visualWeight: clamp(
      Math.round((volume + bulk) / 2) + (structure === "structured" ? 1 : 0),
    ),
  };
}
