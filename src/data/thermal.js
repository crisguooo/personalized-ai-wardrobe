// Editable product heuristics, not measured insulation or universal comfort limits.
export function thermalGuide(key, category, warmth) {
  const ranges = {
    "long-sleeve": [15, 25],
    knit: [10, 21],
    sweatshirt: [12, 23],
    hoodie: [8, 20],
    cardigan: [10, 22],
    "zip-hoodie": [9, 21],
    trench: [9, 20],
    "wool-coat": [0, 15],
    puffer: [-8, 10],
    "denim-jacket": [12, 22],
    "leather-jacket": [10, 20],
    blazer: [13, 23],
    bomber: [10, 21],
    "mini-skirt": [18, 32],
    "midi-skirt": [16, 30],
    "denim-shorts": [20, 35],
    sneakers: [8, 32],
    loafers: [12, 30],
    "mary-janes": [15, 30],
    "ankle-boots": [2, 23],
    "tall-boots": [-2, 18],
    scarf: [-5, 14],
  };
  const [minC, maxC] =
    ranges[key] ??
    (category === "top"
      ? [17, 32]
      : category === "bottom"
        ? [5, 27]
        : [-30, 45]);
  return {
    minC,
    maxC,
    insulationC:
      category === "outerwear"
        ? warmth * 2.5
        : category === "midlayer"
          ? 5
          : key === "scarf"
            ? 2
            : 0,
    active: category !== "accessory" || key === "scarf",
    removable: ["outerwear", "midlayer"].includes(category) || key === "scarf",
  };
}
