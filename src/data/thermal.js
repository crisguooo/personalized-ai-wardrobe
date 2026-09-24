// Wearwell's adjustable product rules. These are not measured fabric ratings.
// [base low °C, base high °C, warmth reduction °C, coverage (0–3), winter level]
const GUIDES = {
  "cashmere-knit": [19, 23, 0, 3],
  "flannel-shirt": [23, 26, 0, 3],
  "ribbed-top": [23, 26, 0, 3],
  "long-cardigan": [14, 20, 6, 3],
  "wool-trousers": [21, 25, 6, 3, 1],
  "thermal-leggings": [21, 25, 6, 3, 1],
  "pleated-skirt": [24, 28, 2, 2],
  "cotton-shorts": [28, 32, 0, 1],
  "cropped-jacket": [16, 22, 4, 3],
  "short-wool-jacket": [7, 14, 9, 3, 1],
  "chelsea-boots": [25, 28, 2, 3],
  "crew-tee": [27, 30, 0, 1],
  "fitted-tee": [27, 30, 0, 1],
  "oversized-tee": [27, 30, 0, 1],
  "baby-tee": [28, 31, 0, 1],
  "off-shoulder": [28, 31, 0, 1],
  tank: [29, 33, 0, 0],
  tube: [29, 33, 0, 0],
  polo: [27, 30, 0, 1],
  "long-sleeve": [25, 28, 0, 3],
  "linen-shirt": [26, 29, 0, 3],
  "button-shirt": [24, 27, 0, 3],
  knit: [21, 24, 0, 3],
  sweatshirt: [20, 23, 0, 3],
  hoodie: [18, 22, 0, 3],
  turtleneck: [19, 23, 0, 3],
  "thermal-top": [23, 27, 0, 3],
  "light-cardigan": [20, 24, 3, 3],
  cardigan: [17, 22, 5, 3],
  "zip-hoodie": [16, 21, 5, 3],
  "fleece-jacket": [8, 16, 7, 3],
  vest: [14, 20, 4, 1],
  "denim-shorts": [27, 31, 0, 1],
  "mini-skirt": [27, 31, 0, 1],
  "midi-skirt": [25, 29, 2, 2],
  "cropped-trousers": [25, 28, 2, 2],
  "linen-trousers": [24, 28, 3, 3],
  leggings: [24, 27, 3, 3],
  trousers: [24, 27, 3, 3],
  "straight-jeans": [23, 26, 4, 3],
  "wide-jeans": [23, 26, 4, 3],
  "skinny-jeans": [23, 26, 4, 3],
  cargo: [23, 26, 4, 3],
  sweatpants: [22, 25, 5, 3],
  "fleece-pants": [21, 25, 6, 3, 1],
  blazer: [16, 22, 4, 3],
  "denim-jacket": [15, 21, 5, 3],
  "leather-jacket": [12, 19, 6, 3],
  trench: [12, 20, 6, 3],
  bomber: [13, 20, 6, 3],
  raincoat: [17, 23, 3, 3],
  "wool-coat": [4, 13, 10, 3, 1],
  puffer: [-5, 10, 13, 3, 1],
  "long-puffer": [-12, 5, 18, 3, 2],
  parka: [-15, 4, 18, 3, 2],
  sandals: [28, 34, 0, 1],
  "mary-janes": [27, 30, 0, 2],
  loafers: [26, 29, 1, 2],
  sneakers: [26, 29, 1, 3],
  "ankle-boots": [25, 28, 2, 3],
  "tall-boots": [24, 27, 3, 3],
  "winter-boots": [-25, 5, 3, 3, 2],
  scarf: [0, 12, 0.5, 0, 1],
  beanie: [-10, 8, 0.5, 0, 1],
  gloves: [-15, 5, 0.5, 0, 1],
};
export function thermalGuide(key, category) {
  const [minC, maxC, insulationC, coverage, winterLevel = 0] = GUIDES[key] ?? [
    -30, 45, 0, 0,
  ];
  const active = !!GUIDES[key];
  return {
    minC,
    maxC,
    insulationC,
    coverage,
    winterLevel,
    active,
    // Ambient wear limits are separate from additive insulation estimates.
    wearMinC: key === "puffer" ? -5 : null,
    wearMaxC:
      key === "winter-boots"
        ? 5
        : ["outerwear", "midlayer"].includes(category) ||
            ["scarf", "beanie", "gloves"].includes(key)
          ? maxC
          : null,
    wearMaxExclusive: key === "winter-boots",
    shell: category === "outerwear" || ["fleece-jacket", "vest"].includes(key),
    winterBase: category === "top" && coverage === 3 && minC <= 23,
    ventilationC:
      category === "outerwear"
        ? winterLevel
          ? 6
          : 3
        : category === "midlayer"
          ? 2
          : 0,
    removable: ["midlayer", "outerwear", "accessory"].includes(category),
  };
}

// Two-degree steps make the default decision ladder explicit and inspectable.
export const WEATHER_BANDS = [
  [30, "Airy top, shorts and open shoes"],
  [28, "Short sleeves and short bottoms"],
  [26, "Short sleeves with longer bottoms"],
  [24, "Long sleeves and light long bottoms"],
  [22, "Long sleeves and full-length bottoms"],
  [20, "Light knit and full-length bottoms"],
  [18, "Warmer top or cardigan"],
  [16, "Add a light outer layer"],
  [14, "Jacket over a warmer base"],
  [12, "Warmer jacket and covered shoes"],
  [10, "Warm coat and long bottoms"],
  [8, "Warm coat, scarf and covered shoes"],
  [5, "Winter coat over a warm base"],
  [2, "Winter coat, lined pants and boots"],
  [0, "Winter layers, warm hat and gloves"],
  [-Infinity, "Insulated winter coat, lined pants and winter boots"],
];
export const weatherBand = (temp) => WEATHER_BANDS.find(([min]) => temp >= min);
