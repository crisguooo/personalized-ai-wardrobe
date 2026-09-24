// Construction defaults, not rules about which outfits a person should like.
// The existing IDs, fits and thermal guides remain stable.
const clamp = (n) => Math.max(1, Math.min(5, n));
// Perceptual styling estimates (not colorimetry of a user's photographed fabric).
// Hue uses degrees; value/lightness and saturation are normalized to [0, 1].
const color = (
  name,
  hue,
  family,
  temperature,
  value,
  saturation,
  neutral = false,
) => ({
  name,
  hue,
  family,
  temperature,
  value,
  saturation,
  neutral,
  tone: family,
  light: value >= 0.68,
  dark: value <= 0.3,
  accent: !neutral,
});
export const COLOR_METADATA = {
  white: color("soft white", null, "achromatic", "neutral", 0.94, 0.03, true),
  cream: color("cream", 45, "earth", "warm", 0.86, 0.18, true),
  grey: color("stone grey", null, "achromatic", "neutral", 0.56, 0.03, true),
  charcoal: color("charcoal", null, "achromatic", "neutral", 0.22, 0.03, true),
  black: color("soft black", null, "achromatic", "neutral", 0.08, 0.02, true),
  navy: color("dark navy", 220, "blue", "cool", 0.23, 0.33, true),
  blue: color("dusty blue", 207, "blue", "cool", 0.59, 0.28),
  "powder-blue": color("powder blue", 210, "blue", "cool", 0.82, 0.21),
  beige: color("sand beige", 38, "earth", "warm", 0.72, 0.23, true),
  brown: color("chocolate brown", 23, "earth", "warm", 0.32, 0.38, true),
  camel: color("camel", 33, "earth", "warm", 0.55, 0.38, true),
  olive: color("muted olive", 65, "green", "warm", 0.42, 0.25),
  burgundy: color("burgundy", 345, "red", "cool", 0.27, 0.46),
  red: color("vermillion red", 8, "red", "warm", 0.48, 0.72),
};
export function garmentColor(item, key) {
  const spec = COLOR_METADATA[key];
  const denim = item.texture === "denim" && key === "blue";
  const area =
    item.category === "outerwear"
      ? item.length === "long"
        ? 5
        : 3.5
      : item.category === "bottom"
        ? item.length === "long"
          ? 3.1
          : 1.9
        : item.category === "top"
          ? item.length === "cropped"
            ? 1.8
            : 2.8
          : item.category === "midlayer"
            ? item.length === "long"
              ? 3.4
              : 2.7
            : item.category === "shoes"
              ? item.length === "long"
                ? 1.4
                : 1
              : ({
                  jewelry: 0.12,
                  eyes: 0.2,
                  waist: 0.25,
                  hands: 0.4,
                  head: 0.5,
                  bag: 0.7,
                  neck: 0.75,
                }[item.accessorySlot] ?? 0.5);
  return {
    ...spec,
    ...(denim
      ? { name: "medium denim blue", hue: 215, value: 0.43, saturation: 0.45 }
      : {}),
    area,
  };
}

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
    // Archetype defaults only; existing catalog IDs and fit choices stay stable.
    rise:
      category === "bottom"
        ? [
            "wide-jeans",
            "trousers",
            "wool-trousers",
            "pleated-skirt",
            "leggings",
            "thermal-leggings",
            "midi-skirt",
          ].includes(key)
          ? "high"
          : "mid"
        : null,
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
