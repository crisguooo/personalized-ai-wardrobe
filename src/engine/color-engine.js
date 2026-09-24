import { assignLayers } from "../data/layers.js";
import { BY_ID } from "../data/catalog.js";
import { COLOR_METADATA, garmentColor } from "../data/styling.js";
const clamp = (n) => Math.max(0, Math.min(1, n));
const mean = (xs) => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);
export const hueDistance = (a, b) =>
  a == null || b == null ? 0 : Math.min(Math.abs(a - b), 360 - Math.abs(a - b));
export const colorFamily = (color) => COLOR_METADATA[color]?.family ?? color;
export const COLOR_STRATEGIES = {
  tonal: "Monochromatic / tonal",
  "warm-tonal": "Warm tonal",
  "cool-tonal": "Cool tonal",
  "neutral-accent": "Neutral + accent",
  analogous: "Analogous",
  complementary: "Complementary",
  "split-complementary": "Split complementary",
  "high-contrast-neutral": "High-contrast neutral",
};
const tonalStrategy = (s) => ["tonal", "warm-tonal", "cool-tonal"].includes(s);
const contrastStrategy = (s) =>
  ["complementary", "split-complementary"].includes(s);
export function visibleColors(items) {
  const { outer, mid } = assignLayers(items);
  const areas = items.map((item) => {
    const c = item.colorSpec ?? garmentColor(item, item.color);
    let area = c.area;
    if (item.category === "top") area *= outer || mid ? 0.48 : 1;
    if (item === mid) area *= outer ? 0.52 : 1;
    if (item.category === "bottom" && outer?.length === "long") area *= 0.65;
    const zone = ["top", "midlayer", "outerwear"].includes(item.category)
      ? "upper"
      : item.category === "bottom"
        ? "lower"
        : item.category === "shoes"
          ? "feet"
          : "detail";
    return {
      ...c,
      area,
      color: item.color,
      itemId: item.id,
      texture: item.texture,
      zone,
    };
  });
  const total = areas.reduce((s, c) => s + c.area, 0) || 1;
  return areas.map((c) => ({ ...c, share: c.area / total }));
}
function pairFit(a, b, strategy) {
  if (a.hue == null || b.hue == null) return 1;
  const d = hueDistance(a.hue, b.hue);
  if (strategy === "complementary")
    return clamp(1 - Math.min(d, Math.abs(180 - d)) / 55);
  if (strategy === "split-complementary")
    return clamp(1 - Math.min(d, Math.abs(150 - d), Math.abs(60 - d)) / 45);
  if (strategy === "analogous") return clamp(1 - Math.max(0, d - 45) / 90);
  return clamp(
    1 -
      Math.max(0, d - (strategy === "tonal" ? 15 : 30)) /
        (tonalStrategy(strategy) ? 90 : 70),
  );
}
function relationships(colors, strategy) {
  const pairs = [];
  for (let a = 0; a < colors.length; a++)
    for (let b = a + 1; b < colors.length; b++) {
      const weight =
        colors[a].share *
        colors[b].share *
        Math.max(0.12, colors[a].saturation + colors[b].saturation);
      pairs.push({ score: pairFit(colors[a], colors[b], strategy), weight });
    }
  return pairs.length
    ? pairs.reduce((s, p) => s + p.score * p.weight, 0) /
        pairs.reduce((s, p) => s + p.weight, 0)
    : 1;
}
function describe(colors) {
  const chromatic = colors.filter((c) => c.hue != null && c.saturation >= 0.12);
  const vivid = colors.filter((c) => c.saturation >= 0.55);
  const shares = { warm: 0, cool: 0, neutral: 0 };
  for (const c of colors) shares[c.temperature] += c.share;
  const valueRange = colors.length
    ? Math.max(...colors.map((c) => c.value)) -
      Math.min(...colors.map((c) => c.value))
    : 0;
  const saturationMean = colors.reduce((s, c) => s + c.share * c.saturation, 0);
  const saturationSpread = Math.sqrt(
    colors.reduce(
      (s, c) => s + c.share * (c.saturation - saturationMean) ** 2,
      0,
    ),
  );
  const hueGroups = [];
  for (const c of [...chromatic].sort((a, b) => b.share - a.share)) {
    const existing = hueGroups.find((g) => hueDistance(g.hue, c.hue) < 30);
    if (existing) existing.share += c.share;
    else hueGroups.push({ hue: c.hue, share: c.share });
  }
  // Separate light/dark blocks even within a family; navy and powder blue do not
  // become one indistinguishable area in the dominant/support/accent breakdown.
  const blocks = new Map();
  for (const c of colors) {
    const band = c.value < 0.32 ? "dark" : c.value > 0.68 ? "light" : "mid";
    const key = `${c.family}:${band}`;
    const old = blocks.get(key);
    if (old) old.share += c.share;
    else
      blocks.set(key, {
        family: c.family,
        valueBand: band,
        name: c.name,
        share: c.share,
      });
  }
  const roles = [...blocks.values()]
    .sort((a, b) => b.share - a.share)
    .map((block, index) => ({
      ...block,
      role: index === 0 ? "dominant" : index === 1 ? "support" : "accent",
    }));
  const accentShare = colors
    .filter((c) => !c.neutral)
    .reduce((s, c) => s + c.share, 0);
  return {
    chromatic,
    vivid,
    shares,
    valueRange,
    saturationMean,
    saturationSpread,
    hueGroups,
    roles,
    accentShare,
  };
}
function evaluateStrategy(colors, strategy, d = describe(colors)) {
  const {
    chromatic,
    vivid,
    shares,
    valueRange,
    saturationMean,
    saturationSpread,
    hueGroups,
    roles,
    accentShare,
  } = d;
  const neutralShare = colors
    .filter((c) => c.neutral)
    .reduce((s, c) => s + c.share, 0);
  const accent = chromatic.filter((c) => !c.neutral);
  const span = Math.max(
    0,
    ...chromatic.flatMap((a) =>
      chromatic.map((b) => hueDistance(a.hue, b.hue)),
    ),
  );
  let hue = relationships(chromatic, strategy);
  const isolatedAccent =
    accent.length > 0 && accentShare < 0.3 && neutralShare > 0.65;
  if (tonalStrategy(strategy) && isolatedAccent) hue *= 0.86;
  if (tonalStrategy(strategy) && !chromatic.length && valueRange > 0.6)
    hue *= 0.95;
  if (strategy === "neutral-accent")
    hue =
      relationships(accent, "tonal") *
      (0.55 + 0.45 * Math.min(1, neutralShare / 0.55)) *
      (accent.length ? 1 : 0.8);
  if (strategy === "high-contrast-neutral")
    hue =
      0.35 +
      0.65 *
        colors
          .filter((c) => c.neutral && c.saturation < 0.4)
          .reduce((s, c) => s + c.share, 0);
  if (strategy === "warm-tonal")
    hue *= 0.65 + 0.35 * (shares.warm + shares.neutral);
  if (strategy === "cool-tonal")
    hue *= 0.65 + 0.35 * (shares.cool + shares.neutral);
  if (strategy === "complementary") hue *= 0.6 + 0.4 * clamp((span - 90) / 65);
  if (strategy === "analogous") hue *= hueGroups.length > 1 ? 1 : 0.86;
  if (strategy === "split-complementary") {
    // Anchored three-hue structure, not arbitrary triangles.
    const template = Math.max(
      0,
      ...hueGroups.map((anchor) =>
        mean(
          hueGroups.map((g) => {
            const delta = (g.hue - anchor.hue + 360) % 360;
            return clamp(
              1 -
                Math.min(
                  delta,
                  360 - delta,
                  Math.abs(delta - 150),
                  Math.abs(delta - 210),
                ) /
                  45,
            );
          }),
        ),
      ),
    );
    hue *= template * (hueGroups.length >= 3 ? 1 : 0.65);
  }
  const dominantTemp = Math.max(shares.warm, shares.cool);
  const contrastIntent =
    contrastStrategy(strategy) || strategy === "neutral-accent";
  const temperature = clamp(
    0.78 +
      0.18 * (dominantTemp + shares.neutral) +
      (contrastIntent ? 0.18 * Math.min(shares.warm, shares.cool) * hue : 0) -
      (1 - hue) * Math.min(shares.warm, shares.cool) * 0.65,
  );
  const textureDepth = clamp(
    (new Set(colors.map((c) => c.texture)).size - 1) / 2,
  );
  const tonalDepth = clamp(
    0.64 + 0.24 * Math.min(1, valueRange / 0.35) + 0.12 * textureDepth,
  );
  // No global target of medium contrast. Tonal depth and deliberate extremes are viable.
  const value =
    strategy === "high-contrast-neutral"
      ? clamp(0.45 + 0.55 * Math.min(1, valueRange / 0.7))
      : tonalStrategy(strategy)
        ? 0.76 + 0.22 * tonalDepth
        : 0.86 + 0.08 * hue;
  const largeVivid = vivid
    .filter((c) => c.share > 0.22)
    .reduce((s, c) => s + c.share, 0);
  const saturation = clamp(
    0.95 -
      saturationSpread * 0.24 -
      largeVivid * (1 - hue) * (saturationSpread + 0.3) * 1.4 +
      (contrastStrategy(strategy) ? 0.08 * saturationMean * hue : 0),
  );
  const dominance =
    tonalStrategy(strategy) && roles.length
      ? roles
          .filter((r) => r.family === roles[0].family)
          .reduce((sum, r) => sum + r.share, 0)
      : (roles[0]?.share ?? 1);
  const competing = chromatic.filter(
    (c) => c.share > 0.2 && c.saturation > 0.4,
  );
  let proportion = clamp(
    0.8 +
      0.15 * dominance -
      Math.max(0, competing.length - 1) * (1 - hue) * 0.24,
  );
  if (strategy === "neutral-accent")
    proportion = clamp(
      proportion +
        (accentShare > 0 && accentShare <= 0.24 ? 0.09 : 0) -
        Math.max(0, accentShare - 0.3) * 0.55,
    );
  const anchors = ["upper", "lower", "feet"]
    .map(
      (zone) =>
        colors
          .filter((c) => c.zone === zone)
          .sort((a, b) => b.share - a.share)[0],
    )
    .filter(Boolean);
  const blockConflict = mean(
    anchors
      .slice(1)
      .map(
        (c, i) =>
          (1 - pairFit(anchors[i], c, strategy)) *
          Math.min(1, (c.saturation + anchors[i].saturation) / 0.8),
      ),
  );
  const repeats = colors.some((a) =>
    colors.some(
      (b) =>
        a.zone !== b.zone &&
        a.itemId !== b.itemId &&
        Math.abs(a.value - b.value) < 0.15 &&
        hueDistance(a.hue, b.hue) < 25,
    ),
  );
  const upper = anchors.find((c) => c.zone === "upper"),
    feet = anchors.find((c) => c.zone === "feet");
  const bookends =
    upper &&
    feet &&
    Math.abs(upper.value - feet.value) < 0.15 &&
    hueDistance(upper.hue, feet.hue) < 25;
  const placement = clamp(
    0.86 +
      0.04 * repeats +
      0.06 * !!bookends -
      0.5 * blockConflict * (1 - hue * 0.45),
  );
  const scores = {
    hue: clamp(hue),
    temperature,
    value,
    saturation,
    proportion,
    placement,
    tonalDepth,
  };
  const aestheticScore = clamp(
    (0.26 * scores.hue +
      0.1 * temperature +
      0.12 * value +
      0.15 * saturation +
      0.15 * proportion +
      0.12 * placement +
      0.1 * (tonalStrategy(strategy) ? tonalDepth : 0.86)) *
      (0.7 + 0.3 * scores.hue),
  );
  return {
    strategy,
    strategyLabel: COLOR_STRATEGIES[strategy],
    scores,
    aestheticScore,
    metrics: { ...d, neutralShare, dominance, textureDepth },
    visibleColors: colors,
  };
}
export function colorFeatures(result) {
  const m = result.metrics,
    range = m.valueRange;
  return {
    colorWarm: m.shares.warm,
    colorCool: m.shares.cool,
    colorNeutral: m.shares.neutral,
    colorMuted: clamp(1 - m.saturationMean / 0.65),
    colorVivid: clamp(m.saturationMean / 0.65),
    colorLowContrast: clamp(1 - range / 0.45),
    colorMediumContrast: clamp(1 - Math.abs(range - 0.45) / 0.3),
    colorHighContrast: clamp((range - 0.4) / 0.4),
    colorSimplePalette: 1 / Math.max(1, m.hueGroups.length),
    colorComplexPalette: clamp((m.hueGroups.length - 1) / 3),
    colorAccent:
      result.strategy === "neutral-accent" ? clamp(m.accentShare * 4) : 0,
    colorTonal: +tonalStrategy(result.strategy),
    colorContrast: +(
      contrastStrategy(result.strategy) ||
      result.strategy === "high-contrast-neutral"
    ),
    [`colorStrategy_${result.strategy}`]: 1,
  };
}
function personalize(result, profile) {
  const f = colorFeatures(result);
  let sum = 0,
    norm = 0;
  for (const [key, weight] of Object.entries(profile.weights ?? {}))
    if (
      key.startsWith("color") &&
      key !== "colorful" &&
      typeof weight === "number"
    ) {
      sum += (f[key] ?? 0) * weight;
      norm += Math.abs(weight);
    }
  const personal = clamp(0.5 + (sum / Math.max(3, norm)) * 0.5);
  const strength = Math.min(0.4, (norm / (norm + 4)) * 0.5);
  // Evidence-weighted blending leaves room for preferences instead of saturating at 1.
  return {
    ...result,
    scores: { ...result.scores, personal },
    score: clamp(result.aestheticScore * (1 - strength) + personal * strength),
  };
}
export function evaluateColors(items, profile = {}, strategy) {
  const colors = visibleColors(items);
  return (
    COLOR_STRATEGIES[strategy] ? [strategy] : Object.keys(COLOR_STRATEGIES)
  )
    .map((s) => personalize(evaluateStrategy(colors, s), profile))
    .sort((a, b) => b.score - a.score)[0];
}
// Cache only immutable catalog evaluations; apply profile effects afresh.
const cache = new Map();
export function palette(outfit, profile = {}) {
  const ids = (outfit.itemIds ?? []).filter((id) => BY_ID[id]);
  const strategy = COLOR_STRATEGIES[outfit.colorStrategy]
    ? outfit.colorStrategy
    : null;
  const key = [...ids].sort().join("|") + ":" + (strategy ?? "auto");
  let bases = cache.get(key);
  if (!bases) {
    const colors = visibleColors(ids.map((id) => BY_ID[id]));
    const description = describe(colors);
    bases = (strategy ? [strategy] : Object.keys(COLOR_STRATEGIES)).map((s) =>
      evaluateStrategy(colors, s, description),
    );
    if (cache.size >= 12000) cache.delete(cache.keys().next().value);
    cache.set(key, bases);
  }
  const best = bases
    .map((r) => personalize(r, profile))
    .sort((a, b) => b.score - a.score)[0];
  const colors = [...new Set(ids.map((id) => BY_ID[id].color))];
  const families = [...new Set(colors.map(colorFamily))];
  const { metrics: m } = best;
  return {
    ...best,
    colors,
    families,
    familyCount: families.length,
    dominantCount: m.roles.filter((r) => r.share > 0.2).length,
    // Descriptive compatibility fields, never gates or color-count rules.
    unrelated: 1 - best.scores.hue,
    neutralAccent: best.strategy === "neutral-accent" && m.accentShare <= 0.3,
    accentShare: m.accentShare,
    accentColors: colors.filter((c) => !COLOR_METADATA[c].neutral),
    unifiedBase: best.scores.temperature > 0.75,
    highContrast: m.valueRange >= 0.6,
    tonal: tonalStrategy(best.strategy),
    cohesive: best.aestheticScore >= 0.72,
    restrained: best.aestheticScore >= 0.72,
    penalty: 1 - best.score,
    label: best.strategyLabel,
  };
}
export function colorStrategiesFor(anchor, profile = {}) {
  const c = anchor.colorSpec ?? garmentColor(anchor, anchor.color);
  const preferred =
    c.hue == null
      ? ["high-contrast-neutral", "neutral-accent", "tonal"]
      : c.neutral
        ? [
            c.temperature === "warm" ? "warm-tonal" : "cool-tonal",
            "neutral-accent",
            "tonal",
          ]
        : [
            "tonal",
            "neutral-accent",
            "analogous",
            "complementary",
            "split-complementary",
          ];
  return Object.keys(COLOR_STRATEGIES).sort((a, b) => {
    const priority = (s) =>
      (preferred.includes(s) ? 1 - preferred.indexOf(s) * 0.1 : 0.3) +
      (profile.weights?.[`colorStrategy_${s}`] ?? 0) * 0.8;
    return priority(b) - priority(a);
  });
}
export const coordinated = (candidates, profile) =>
  [...candidates].sort(
    (a, b) =>
      palette(b, profile).score - palette(a, profile).score ||
      a.id.localeCompare(b.id),
  );
