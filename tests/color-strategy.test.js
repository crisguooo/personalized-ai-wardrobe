import test from "node:test";
import assert from "node:assert/strict";
import { BY_ID, CATALOG } from "../src/data/catalog.js";
import {
  palette,
  evaluateColors,
  visibleColors,
  COLOR_STRATEGIES,
  coordinated,
  colorStrategiesFor,
} from "../src/engine/palette.js";
import {
  generate,
  learn,
  rank,
  scoreBreakdown,
} from "../src/engine/wardrobe.js";
const look = (...itemIds) => ({ itemIds, id: [...itemIds].sort().join("|") });
const synthetic = (key, hue, temperature, value, saturation) => {
  const i = BY_ID[key];
  return {
    ...i,
    colorSpec: {
      ...i.colorSpec,
      hue,
      temperature,
      value,
      saturation,
      neutral: hue === null,
      family: hue === null ? "achromatic" : `hue-${hue}`,
      name: `test ${hue}`,
    },
  };
};
const feedback = (o, rating, reason) => ({
  ...o,
  rating,
  reason,
  timestamp: "2026-09-24",
});

test("every garment carries semantic, perceptual and area metadata without collapsing blue shades", () => {
  for (const i of CATALOG) {
    const c = i.colorSpec;
    assert(c.name && c.family && c.area > 0);
    assert(c.hue === null || (c.hue >= 0 && c.hue < 360));
    assert(["warm", "cool", "neutral"].includes(c.temperature));
    for (const key of ["value", "saturation"])
      assert(c[key] >= 0 && c[key] <= 1);
  }
  const navy = BY_ID["knit:navy"].colorSpec,
    denim = BY_ID["wide-jeans:blue"].colorSpec,
    powder = BY_ID["knit:powder-blue"].colorSpec;
  assert(navy.value < denim.value && denim.value < powder.value);
  assert.notEqual(denim.saturation, powder.saturation);
  assert.equal(denim.name, "medium denim blue");
});

test("light and dark tonal palettes and black-white contrast are intentional, without a medium-contrast target", () => {
  for (const o of [
    look("knit:cream", "trousers:beige", "loafers:camel"),
    look("knit:charcoal", "trousers:black", "loafers:navy"),
    look("knit:white", "trousers:black", "loafers:black"),
  ]) {
    assert(palette(o).score > 0.85);
    assert(palette(o).scores.value > 0.85);
  }
  assert.equal(
    palette(look("knit:white", "trousers:black", "loafers:black")).strategy,
    "high-contrast-neutral",
  );
});

test("tonal depth rewards blue value and texture variation over identical blue blocks", () => {
  const depth = palette(
    look("knit:powder-blue", "wide-jeans:blue", "loafers:navy"),
  );
  const flat = palette(look("knit:blue", "trousers:blue", "loafers:blue"));
  assert(depth.scores.tonalDepth > flat.scores.tonalDepth);
  assert(depth.score > flat.score);
});

test("intentional warm-cool complementary and vivid palettes score highly", () => {
  const items = [
    synthetic("knit:red", 25, "warm", 0.65, 0.75),
    synthetic("trousers:blue", 205, "cool", 0.35, 0.72),
    synthetic("loafers:black", null, "neutral", 0.1, 0.02),
  ];
  const complementary = evaluateColors(items, {}, "complementary");
  const tonal = evaluateColors(items, {}, "tonal");
  assert(complementary.scores.hue > 0.95);
  assert(complementary.scores.temperature > 0.85);
  assert(complementary.scores.saturation > 0.85);
  assert(complementary.score > tonal.score + 0.2);
});

test("split complementary uses an anchored hue structure, not arbitrary three-color permission", () => {
  const split = [
    synthetic("knit:red", 0, "warm", 0.5, 0.7),
    synthetic("trousers:blue", 150, "cool", 0.4, 0.55),
    synthetic("loafers:blue", 210, "cool", 0.25, 0.45),
  ];
  const random = [
    split[0],
    synthetic("trousers:blue", 85, "warm", 0.4, 0.55),
    synthetic("loafers:blue", 250, "cool", 0.25, 0.45),
  ];
  assert(evaluateColors(split, {}, "split-complementary").scores.hue > 0.95);
  assert(
    evaluateColors(split, {}, "split-complementary").score >
      evaluateColors(random, {}, "split-complementary").score + 0.15,
  );
});

test("visible area distinguishes a scarf from a long coat and accounts for hidden layers", () => {
  const core = ["knit:cream", "trousers:black", "loafers:black"];
  const scarf = palette(look(...core, "scarf:red"));
  const coat = palette(look(...core, "wool-coat:red"));
  assert(coat.accentShare > scarf.accentShare * 3);
  assert.equal(scarf.strategy, "neutral-accent");
  const covered = visibleColors(
    [...core, "wool-coat:red"].map((id) => BY_ID[id]),
  );
  assert(
    covered.find((c) => c.itemId === "knit:cream").area <
      BY_ID["knit:cream"].colorSpec.area,
  );
  assert(
    covered.find((c) => c.itemId === "wool-coat:red").area >
      covered.find((c) => c.itemId === "trousers:black").area,
  );
});

test("saturation clash and vertical fragmentation lower unsupported color blocking", () => {
  const bad = [
    synthetic("knit:red", 5, "warm", 0.5, 0.95),
    synthetic("trousers:blue", 100, "cool", 0.85, 0.22),
    synthetic("loafers:blue", 265, "cool", 0.5, 0.85),
  ];
  const good = [
    synthetic("knit:red", 5, "warm", 0.5, 0.65),
    synthetic("trousers:blue", 185, "cool", 0.35, 0.65),
    synthetic("loafers:black", null, "neutral", 0.1, 0.02),
  ];
  const b = evaluateColors(bad, {}, "complementary"),
    g = evaluateColors(good, {}, "complementary");
  assert(g.scores.saturation > b.scores.saturation);
  assert(g.scores.placement > b.scores.placement);
  assert(g.score > b.score + 0.2);
  const linked = [
    synthetic("knit:grey", null, "neutral", 0.5, 0.02),
    synthetic("trousers:grey", null, "neutral", 0.45, 0.02),
    synthetic("loafers:black", null, "neutral", 0.1, 0.02),
    synthetic("blazer:black", null, "neutral", 0.1, 0.02),
  ];
  const broken = linked.map((i) =>
    i.category === "shoes"
      ? { ...i, colorSpec: { ...i.colorSpec, value: 0.95 } }
      : i,
  );
  assert(
    evaluateColors(linked, {}, "high-contrast-neutral").scores.placement >
      evaluateColors(broken, {}, "high-contrast-neutral").scores.placement,
  );
});

test("four intentional colors can outrank two incoherent colors without a count gate", () => {
  const four = look(
    "knit:cream",
    "trousers:camel",
    "loafers:brown",
    "scarf:burgundy",
  );
  const two = look(
    "knit:red",
    "trousers:powder-blue",
    "loafers:powder-blue",
    "scarf:red",
  );
  assert.equal(palette(four).colors.length, 4);
  assert.equal(palette(two).colors.length, 2);
  assert(palette(four).score > palette(two).score);
  assert.equal(coordinated([two, four])[0].id, four.id);
  assert(rank([four]).length === 1);
});

test("generation chooses color strategies before supports and strategy choice responds to preference", () => {
  const ids = [
    "knit:cream",
    "knit:red",
    "knit:blue",
    "fitted-tee:black",
    "trousers:camel",
    "trousers:black",
    "wide-jeans:blue",
    "trousers:burgundy",
    "loafers:black",
    "loafers:brown",
    "sneakers:white",
    "scarf:red",
  ];
  const generated = generate(ids, { limit: 150 });
  assert(generated.length && generated.length <= 150);
  assert(new Set(generated.map((o) => o.colorStrategy)).size >= 3);
  assert(
    generated.every(
      (o) =>
        COLOR_STRATEGIES[o.colorStrategy] &&
        palette(o).strategy === o.colorStrategy,
    ),
  );
  assert.equal(
    colorStrategiesFor(BY_ID["knit:cream"], {
      weights: { colorStrategy_complementary: 1 },
    })[0],
    "complementary",
  );
});

test("color feedback learns temperature, saturation and contrast relationships, not a dislike of blue", () => {
  const low = look("knit:charcoal", "trousers:black", "loafers:navy");
  const high = look("knit:white", "trousers:black", "loafers:black");
  const likingLow = learn(
    Array.from({ length: 18 }, () => feedback(low, "like")),
  );
  const likingHigh = learn(
    Array.from({ length: 18 }, () => feedback(high, "like")),
  );
  assert(
    likingLow.weights.colorLowContrast > 0 &&
      likingHigh.weights.colorHighContrast > 0,
  );
  assert(
    palette(low, likingLow).scores.personal >
      palette(high, likingLow).scores.personal,
  );
  assert(
    palette(high, likingHigh).scores.personal >
      palette(low, likingHigh).scores.personal,
  );
  assert.equal(coordinated([low, high], likingLow)[0].id, low.id);
  assert.equal(coordinated([low, high], likingHigh)[0].id, high.id);
  assert.equal(
    rank([low, high], likingLow, "Everyday", { diversity: false })[0].id,
    low.id,
  );
  assert.equal(
    rank([low, high], likingHigh, "Everyday", { diversity: false })[0].id,
    high.id,
  );
  const blue = look("knit:blue", "trousers:navy", "loafers:black");
  const rejected = learn([feedback(blue, "dislike", "Color combination")]);
  assert(rejected.weights.colorCool < 0);
  assert.equal(rejected.weights.blue, undefined);
  assert.equal(rejected.weights.fitted, undefined);
  const ambiguous = learn([feedback(blue, "dislike")]);
  assert.equal(ambiguous.weights.colorCool, undefined);
  assert(Math.abs(palette(blue, ambiguous).score - palette(blue).score) < 0.02);
});

test("development breakdown exposes each component, chosen strategy, proportions and final score", () => {
  const o = look("knit:cream", "trousers:black", "loafers:black", "scarf:red");
  const debug = scoreBreakdown(o).colorDebug;
  assert.equal(debug.strategy, "Neutral + accent");
  for (const k of [
    "hue",
    "temperature",
    "value",
    "saturation",
    "proportion",
    "placement",
    "tonalDepth",
    "personal",
    "final",
  ])
    assert(Number.isFinite(debug[k]) && debug[k] >= 0 && debug[k] <= 1);
  assert(debug.roles[0].role === "dominant");
  assert.equal(debug.final, scoreBreakdown(o).scores.color);
});
