// Editorial style references, not brand endorsements or purchase predictions.
import { BRAND_IMAGES } from "./brand-images.js";
// Sources checked 2026-09-24. Descriptions/tag mappings are Wearwell's
// interpretation of each brand's public design language.
export const BRANDS = [
  [
    "cos",
    "COS",
    ["Minimal", "Tailored"],
    "Modern minimalism: clean lines and sculptural shapes you might enjoy.",
    ["minimal", "neutral", "balanced", "relaxedStructured"],
    "https://www.cos.com/en-us/about-us",
  ],
  [
    "arket",
    "ARKET",
    ["Minimal", "Casual"],
    "Nordic everyday dressing: easy layers and useful basics you might enjoy.",
    ["minimal", "casual", "layered", "relaxed"],
    "https://www.arket.com/en-no/about-arket/",
  ],
  [
    "toteme",
    "TOTEME",
    ["Minimal", "Tailored"],
    "Quiet, graphic dressing: rich textures and considered proportions you might enjoy.",
    ["neutral", "minimal", "tonal", "dressy"],
    "https://toteme.com/en-gb/blogs/info/info-about",
  ],
  [
    "the-row",
    "The Row",
    ["Minimal", "Tailored"],
    "Understated tailoring: fluid shapes and subtle details you might enjoy.",
    ["minimal", "neutral", "wide", "lowComplexity"],
    "https://www.therow.com/fr-nz/pages/about-us",
  ],
  [
    "apc",
    "A.P.C.",
    ["Minimal", "Casual"],
    "Discreet Parisian style: clean denim and understated essentials you might enjoy.",
    ["minimal", "straight", "casual", "simple"],
    "https://www.apc-us.com/pages/the-brand",
  ],
  [
    "theory",
    "Theory",
    ["Tailored", "Minimal"],
    "Modern tailoring: precise fits and polished everyday pieces you might enjoy.",
    ["dressy", "smart-casual", "fitted", "neutral"],
    "https://www.theory.com/about-us_pd.html",
  ],
  [
    "acne",
    "Acne Studios",
    ["Expressive", "Streetwear"],
    "Artful dressing: experimental shapes and denim with a twist you might enjoy.",
    ["volume", "interest", "edgy", "wide"],
    "https://www.acnestudios.com/apac/en/about/about.html",
  ],
  [
    "ganni",
    "GANNI",
    ["Expressive", "Romantic"],
    "Playful Copenhagen style: unexpected contrasts and expressive details you might enjoy.",
    ["feminine", "interest", "colorful", "contrast"],
    "https://www.ganni.com/en/ganni-world.html",
  ],
  [
    "carhartt",
    "Carhartt WIP",
    ["Streetwear", "Casual"],
    "Workwear-inspired dressing: utility, sturdy layers and relaxed fits you might enjoy.",
    ["streetwear", "masculine", "relaxed", "earth"],
    "https://us.carhartt-wip.com/en-us/brands",
  ],
  [
    "stussy",
    "Stüssy",
    ["Streetwear", "Casual"],
    "Graphic streetwear: relaxed tees and a casual attitude you might enjoy.",
    ["streetwear", "relaxed", "volume", "casual"],
    "https://www.stussy.com/blogs/features/book-about-t-shirts",
  ],
  [
    "arcteryx",
    "Arc’teryx",
    ["Outdoor", "Casual"],
    "Technical outdoor dressing: functional shells and purposeful layers you might enjoy.",
    ["sporty", "layered", "minimal", "masculine"],
    "https://arcteryx.com.au/pages/who-we-are",
  ],
  [
    "patagonia",
    "Patagonia",
    ["Outdoor", "Casual"],
    "Easy outdoor style: textured fleece and practical layers you might enjoy.",
    ["sporty", "casual", "layered", "earth"],
    "https://www.patagonia.com/shop/category/fleece/jackets",
  ],
  [
    "sezane",
    "Sézane",
    ["Romantic", "Tailored"],
    "Parisian ease: vintage-inspired detail and tactile knitwear you might enjoy.",
    ["feminine", "preppy", "earth", "smart-casual"],
    "https://www.sezane.com/us-en/about-us-sezane",
  ],
  [
    "reformation",
    "Reformation",
    ["Romantic", "Expressive"],
    "Vintage-inspired dressing: defined shapes and feminine details you might enjoy.",
    ["feminine", "fitted", "balanced", "interest"],
    "https://www.thereformation.com/timeline.html",
  ],
  [
    "polo",
    "Polo Ralph Lauren",
    ["Preppy", "Tailored"],
    "American prep: classic collars, knitwear and polished layers you might enjoy.",
    ["preppy", "smart-casual", "layered", "dressy"],
    "https://www.ralphlauren.com/runway-looks",
  ],
  [
    "uniqlo",
    "UNIQLO",
    ["Minimal", "Casual"],
    "Everyday simplicity: practical basics and easy combinations you might enjoy.",
    ["simple", "casual", "minimal", "lowComplexity"],
    "https://www.uniqlo.com/uk/en/special-feature/lifewear-magazine/about",
  ],
].map(([id, name, styles, description, signals, url]) => ({
  id,
  image: BRAND_IMAGES[id],
  name,
  styles,
  description,
  signals,
  url,
}));
export const BRAND_STYLES = [
  "All styles",
  ...new Set(BRANDS.flatMap((b) => b.styles)),
];
export function brandReferences(profile = {}, style = "All styles") {
  const score = (b) =>
    b.signals.reduce(
      (sum, key) =>
        sum +
        ((profile.evidence?.[key]?.observations ?? 0) >= 2
          ? (profile.weights?.[key] ?? 0)
          : 0),
      0,
    ) / b.signals.length;
  return BRANDS.filter(
    (b) => style === "All styles" || b.styles.includes(style),
  )
    .map((b) => ({ ...b, score: score(b) }))
    .sort(
      (a, b) =>
        b.score - a.score ||
        BRANDS.findIndex((x) => x.id === a.id) -
          BRANDS.findIndex((x) => x.id === b.id),
    );
}
