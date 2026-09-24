import { ARCHETYPES, BY_ID, DEFAULT_COLORS } from "../data/catalog.js";
export const REASONS = [
  "Too basic",
  "Too fitted",
  "Too baggy",
  "Color combination",
  "Too feminine",
  "Too masculine",
  "Too dressy",
  "Too casual",
  "Too much going on",
  "Just not me",
];
export const LABELS = {
  relaxed: "Relaxed silhouettes",
  fitted: "Fitted silhouettes",
  straight: "Straight-leg bottoms",
  wide: "Wide-leg bottoms",
  skinny: "Skinny bottoms",
  neutral: "Neutral palettes",
  earth: "Earth tones",
  colorful: "A pop of color",
  monochrome: "Tonal dressing",
  contrast: "Light & dark contrast",
  layered: "Layered looks",
  simple: "Simple combinations",
  dressy: "Polished pieces",
  casual: "Casual dressing",
  balanced: "Fitted top, loose bottom",
  volume: "Volume on volume",
  fittedPair: "Fitted on fitted",
  sweats: "Matching sweats",
  feminine: "Feminine details",
  masculine: "Structured, utilitarian pieces",
  streetwear: "Streetwear influences",
  preppy: "Preppy details",
  minimal: "Minimal pieces",
  sporty: "Sporty details",
  edgy: "Edgy details",
  "smart-casual": "Smart casual details",
};
const loose = (i) => ["relaxed", "oversized", "wide-leg"].includes(i.fit);
const slim = (i) => ["fitted", "skinny"].includes(i.fit);
const hash = (s) =>
  [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
export function makeOutfit(items) {
  const itemIds = items.filter(Boolean).map((i) => i.id);
  return { id: [...itemIds].sort().join("|"), itemIds };
}
export function validity(outfit, ownedIds) {
  const items = outfit.itemIds.map((id) => BY_ID[id]);
  const errors = [];
  if (items.some((i) => !i)) return ["Unknown clothing item"];
  if (new Set(outfit.itemIds).size !== items.length)
    errors.push("Duplicate clothing item");
  if (ownedIds && outfit.itemIds.some((id) => !ownedIds.includes(id)))
    errors.push("Unowned clothing item");
  for (const c of ["top", "bottom", "shoes"])
    if (items.filter((i) => i.category === c).length !== 1)
      errors.push(`Needs exactly one ${c}`);
  for (const c of ["midlayer", "outerwear"])
    if (items.filter((i) => i.category === c).length > 1)
      errors.push(`Too many ${c} pieces`);
  const slots = items
    .filter((i) => i.category === "accessory")
    .map((i) => i.accessorySlot);
  if (new Set(slots).size !== slots.length)
    errors.push("Too many accessories in the same slot");
  const top = items.find((i) => i.category === "top"),
    mid = items.find((i) => i.category === "midlayer"),
    outer = items.find((i) => i.category === "outerwear");
  if (top?.warmth >= 3 && mid)
    errors.push("Bulky base cannot fit under a mid-layer");
  if (
    top &&
    mid &&
    outer &&
    top.warmth + mid.warmth + outer.warmth > 7 &&
    !outer.thermal.winterLevel
  )
    errors.push("Too many heavy layers");
  return errors;
}
export function features(outfit) {
  const items = outfit.itemIds.map((id) => BY_ID[id]).filter(Boolean),
    top = items.find((i) => i.category === "top"),
    bottom = items.find((i) => i.category === "bottom");
  if (!top || !bottom) return {};
  const colors = [...new Set(items.map((i) => i.color))],
    dark = colors.some((c) => ["black", "navy", "brown"].includes(c)),
    light = colors.some((c) => ["white", "beige"].includes(c));
  const f = {
    relaxed: +loose(top),
    fitted: +slim(top),
    straight: +(bottom.fit === "straight"),
    wide: +(bottom.fit === "wide-leg"),
    skinny: +(bottom.fit === "skinny"),
    neutral: +colors.every((c) => !["red", "blue"].includes(c)),
    earth: +colors.some((c) => ["brown", "beige"].includes(c)),
    colorful: +colors.includes("red"),
    monochrome: +(colors.length === 1),
    contrast: +(dark && light),
    layered: +items.some((i) => ["midlayer", "outerwear"].includes(i.category)),
    simple: +(items.length === 3),
    dressy: items.reduce((s, i) => s + i.formality, 0) / items.length / 2,
    casual: 1 - items.reduce((s, i) => s + i.formality, 0) / items.length / 2,
    balanced: +(slim(top) && loose(bottom)),
    volume: +(loose(top) && loose(bottom)),
    fittedPair: +(slim(top) && slim(bottom)),
    sweats: +(
      ["hoodie", "sweatshirt"].includes(top.subcategory) &&
      bottom.subcategory === "sweatpants" &&
      top.color === bottom.color
    ),
    masculine: +(bottom.subcategory === "cargo" || top.subcategory === "polo"),
  };
  for (const tag of [
    "feminine",
    "streetwear",
    "preppy",
    "minimal",
    "sporty",
    "edgy",
    "smart-casual",
  ])
    f[tag] =
      items.filter((i) => i.styleTags.includes(tag)).length / items.length;
  return f;
}
export function learn(feedback) {
  const evidence = {};
  const combinations = {};
  const add = (key, delta, exposure = 1) => {
    const e = evidence[key] ?? { sum: 0, count: 0 };
    evidence[key] = { sum: e.sum + delta, count: e.count + exposure };
  };
  for (const event of feedback) {
    const f = features(event);
    const positive = event.rating === "like";
    if (positive) {
      for (const [k, v] of Object.entries(f)) {
        if (v > 0) add(k, 0.9 * v, v);
      }
    }
    if (!positive) {
      const target = {
        "Too basic": ["simple", "minimal"],
        "Too fitted": ["fitted", "fittedPair", "skinny"],
        "Too baggy": ["relaxed", "wide", "volume"],
        "Color combination": [
          "monochrome",
          "contrast",
          "colorful",
          "earth",
          "neutral",
        ],
        "Too feminine": ["feminine"],
        "Too masculine": ["masculine"],
        "Too dressy": ["dressy"],
        "Too casual": ["casual"],
        "Too much going on": ["layered", "colorful", "volume"],
      }[event.reason];
      if (target) {
        for (const k of target) {
          if (f[k] > 0) add(k, -1.6 * f[k], f[k]);
        }
      }
      if (!target || !target.some((k) => f[k] > 0))
        for (const k of ["balanced", "volume", "fittedPair", "sweats"])
          if (f[k]) add(k, -0.35);
    }
    const items = event.itemIds.map((id) => BY_ID[id]).filter(Boolean);
    const pair = items
      .filter((i) => ["top", "bottom"].includes(i.category))
      .map((i) => i.archetype)
      .sort()
      .join("+");
    combinations[pair] = (combinations[pair] ?? 0) + (positive ? 0.35 : -0.45);
  }
  const weights = Object.fromEntries(
    Object.entries(evidence).map(([k, e]) => [
      k,
      Math.max(-1, Math.min(1, e.sum / (e.count + 2))),
    ]),
  );
  return {
    version: 1,
    ratings: feedback.length,
    weights,
    evidence,
    combinations,
  };
}
export function preferenceScore(outfit, profile = learn([])) {
  const f = features(outfit);
  let sum = 0,
    norm = 0;
  for (const [k, w] of Object.entries(profile.weights)) {
    sum += (f[k] ?? 0) * w;
    norm += Math.abs(w);
  }
  const pair = outfit.itemIds
    .map((id) => BY_ID[id])
    .filter((i) => i && ["top", "bottom"].includes(i.category))
    .map((i) => i.archetype)
    .sort()
    .join("+");
  return Math.max(
    0,
    Math.min(
      1,
      0.5 +
        (sum / Math.max(3, norm)) * 0.65 +
        Math.max(
          -0.15,
          Math.min(0.15, (profile.combinations[pair] ?? 0) * 0.08),
        ),
    ),
  );
}
export function score(outfit, profile, occasion = "Everyday") {
  const f = features(outfit);
  let context = 0;
  if (occasion === "Work") context = 0.14 * f.dressy + 0.04 * f.preppy;
  if (occasion === "Going out" || occasion === "Date")
    context = 0.12 * f.dressy + 0.04 * f.edgy;
  if (occasion === "Comfy") context = 0.12 * f.casual + 0.05 * f.relaxed;
  return preferenceScore(outfit, profile) + context;
}
/** A bounded, deterministic sample; it is not an exhaustive outfit count. */
export function generate(ownedIds, { requiredId, limit = 900 } = {}) {
  const owned = [...new Set(ownedIds)].map((id) => BY_ID[id]).filter(Boolean);
  const req = requiredId ? BY_ID[requiredId] : null;
  if (requiredId && (!req || !ownedIds.includes(requiredId))) return [];
  const group = (c) =>
    req?.category === c ? [req] : owned.filter((i) => i.category === c);
  const tops = group("top"),
    bottoms = group("bottom"),
    shoes = group("shoes");
  if (!tops.length || !bottoms.length || !shoes.length) return [];
  const mids = group("midlayer"),
    outers = group("outerwear"),
    accessories = group("accessory");
  const base = [];
  for (const t of tops)
    for (const b of bottoms) for (const s of shoes) base.push([t, b, s]);
  base.sort(
    (a, b) => hash(a.map((i) => i.id).join()) - hash(b.map((i) => i.id).join()),
  );
  const out = new Map();
  for (const [idx, trio] of base.slice(0, 900).entries()) {
    const arrangements = [
      [],
      ...mids.map((m) => [m]),
      ...outers.map((o) => [o]),
    ];
    if (mids.length && outers.length)
      arrangements.push([mids[idx % mids.length], outers[idx % outers.length]]);
    for (const [j, layers] of arrangements.entries()) {
      let pieces = [...trio, ...layers];
      if (
        req &&
        ["midlayer", "outerwear"].includes(req.category) &&
        !pieces.some((i) => i.id === requiredId)
      )
        continue;
      if (req?.category === "accessory") pieces.push(req);
      else if (accessories.length && (idx + j) % 3 === 0)
        pieces.push(accessories[(idx + j) % accessories.length]);
      const o = makeOutfit(pieces);
      if (!validity(o, ownedIds).length) out.set(o.id, o);
    }
  }
  return [...out.values()]
    .sort((a, b) => hash(a.id) - hash(b.id))
    .slice(0, limit);
}
export function explore(candidates, count = 12) {
  const pool = [...candidates];
  if (!pool.length) return [];
  const picked = [pool.shift()];
  while (picked.length < count && pool.length) {
    let best = 0,
      max = -1;
    for (let i = 0; i < pool.length; i++) {
      const f = features(pool[i]);
      const distance = Math.min(
        ...picked.map((p) => {
          const pf = features(p);
          return (
            Object.keys(f).reduce((s, k) => s + Math.abs(f[k] - pf[k]), 0) +
            pool[i].itemIds.filter((id) => !p.itemIds.includes(id)).length * 0.4
          );
        }),
      );
      if (distance > max) {
        max = distance;
        best = i;
      }
    }
    picked.push(pool.splice(best, 1)[0]);
  }
  return picked;
}
export function rank(candidates, profile, occasion = "Everyday") {
  return [...candidates].sort(
    (a, b) =>
      score(b, profile, occasion) - score(a, profile, occasion) ||
      a.id.localeCompare(b.id),
  );
}
export function insights(profile) {
  const entries = Object.entries(profile.weights).filter(([k]) => LABELS[k]);
  return {
    prefer: entries
      .filter(([, v]) => v > 0.1)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3),
    avoid: entries
      .filter(([, v]) => v < -0.08)
      .sort((a, b) => a[1] - b[1])
      .slice(0, 3),
  };
}
export function swap(outfit, id, ownedIds, profile, occasion) {
  const original = BY_ID[id];
  if (!original) return null;
  const options = ownedIds
    .map((i) => BY_ID[i])
    .filter(
      (i) =>
        i &&
        i.category === original.category &&
        (i.category !== "accessory" ||
          i.accessorySlot === original.accessorySlot) &&
        i.id !== id &&
        !outfit.itemIds.includes(i.id),
    )
    .map((i) => ({
      ...outfit,
      id: "",
      itemIds: outfit.itemIds.map((old) => (old === id ? i.id : old)),
    }))
    .map((o) => ({ ...o, id: [...o.itemIds].sort().join("|") }))
    .filter((o) => !validity(o, ownedIds).length);
  return rank(options, profile, occasion)[0] ?? null;
}
export function gaps(ownedIds, profile) {
  const ownedArchetypes = new Set(ownedIds.map((id) => BY_ID[id]?.archetype));
  const baseline = generate(ownedIds);
  if (!baseline.length) return [];
  const baselineScores = baseline
    .map((o) => preferenceScore(o, profile))
    .sort((a, b) => a - b);
  // Keep gap estimates selective relative to this user's current closet.
  const threshold = profile.ratings
    ? Math.max(
        0.55,
        baselineScores[Math.floor((baselineScores.length - 1) * 0.65)] - 0.03,
      )
    : 0.5;
  const results = ARCHETYPES.filter((a) => !ownedArchetypes.has(a.key)).map(
    (a) => {
      const item =
        BY_ID[
          `${a.key}:${DEFAULT_COLORS[a.key] ?? (a.category === "shoes" ? "black" : "grey")}`
        ];
      const candidates = generate([...ownedIds, item.id], {
        requiredId: item.id,
        limit: 300,
      });
      const good = rank(
        candidates.filter((o) => preferenceScore(o, profile) >= threshold),
        profile,
      );
      const weighted = good.reduce(
        (s, o) => s + preferenceScore(o, profile),
        0,
      );
      const compatible = new Set(
        good.flatMap((o) => o.itemIds).filter((id) => id !== item.id),
      );
      const counts = Object.fromEntries(
        ["top", "bottom", "shoes"].map((c) => [
          c,
          [...compatible].filter((id) => BY_ID[id].category === c).length,
        ]),
      );
      const relevant = insights(profile)
        .prefer.filter(([key]) =>
          good.slice(0, 3).some((o) => features(o)[key] > 0.3),
        )
        .slice(0, 2)
        .map(([key]) => LABELS[key].toLowerCase());
      return {
        item,
        possible: candidates.length,
        likely: good.length,
        weighted,
        threshold,
        counts,
        compatible: compatible.size,
        examples: explore(good.slice(0, 40), 3),
        why: profile.ratings
          ? `Your ratings favor ${relevant.length ? relevant.join(" and ") : "the combinations shown below"}. This ${item.name.toLowerCase()} creates new looks around those preferences, working with ${compatible.size} pieces you already own.`
          : `This adds a missing clothing archetype and combines with ${compatible.size} pieces you own. Rate outfits to make this estimate personal.`,
      };
    },
  );
  return results
    .filter((g) => g.likely > 0)
    .sort(
      (a, b) => b.weighted - a.weighted || a.item.key.localeCompare(b.item.key),
    )
    .slice(0, 3);
}
