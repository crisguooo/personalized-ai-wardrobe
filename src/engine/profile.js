import { BY_ID } from "../data/catalog.js";
import { features, LABELS } from "./features.js";
const clamp = (n, lo = -1, hi = 1) => Math.max(lo, Math.min(hi, n));
const pairKey = (outfit) =>
  outfit.itemIds
    .map((id) => BY_ID[id])
    .filter((i) => i && ["top", "bottom"].includes(i.category))
    .map((i) => i.archetype)
    .sort()
    .join("+");
export function learn(feedback) {
  const evidence = {},
    combinations = {};
  const add = (key, delta, amount = 1) => {
    const old = evidence[key] ?? { sum: 0, count: 0, observations: 0 };
    evidence[key] = {
      sum: old.sum + delta,
      count: old.count + amount,
      observations: old.observations + 1,
    };
  };
  for (const event of feedback) {
    const f = features(event);
    if (!Object.keys(f).length) continue;
    if (event.rating === "like") {
      for (const [k, v] of Object.entries(f)) if (v > 0) add(k, 0.95 * v, v);
      combinations[pairKey(event)] = (combinations[pairKey(event)] ?? 0) + 0.35;
      continue;
    }
    const targets = {
      "Too fitted": ["fittedPair", "fitted", "skinny"],
      "Too baggy": ["volume", "relaxed", "wide"],
      "Color combination": [
        "monochrome",
        "tonal",
        "contrast",
        "neutralAccent",
        "multiColor",
        "earth",
      ],
      "Too feminine": ["feminine"],
      "Too masculine": ["masculine"],
      "Too dressy": ["dressy"],
      "Too casual": ["casual"],
      "Too basic": ["simple", "lowComplexity"],
      "Too much going on": ["interest", "multiColor", "volume"],
    }[event.reason];
    if (targets) {
      for (const key of targets)
        if (f[key] > 0) add(key, -1.25 * f[key], f[key]);
      if (event.reason === "Too basic") add("interest", 1.1);
      if (event.reason === "Too much going on") add("lowComplexity", 1.1);
      if (event.reason === "Too casual") add("dressy", 1.1);
      if (event.reason === "Too dressy") add("casual", 1.1);
    } else {
      // An ambiguous dislike is weak and local to this pairing.
      combinations[pairKey(event)] = (combinations[pairKey(event)] ?? 0) - 0.12;
    }
  }
  for (const e of Object.values(evidence))
    e.confidence = e.count / (e.count + 4);
  return {
    version: 2,
    ratings: feedback.length,
    weights: Object.fromEntries(
      Object.entries(evidence).map(([key, e]) => [
        key,
        clamp(e.sum / (e.count + 4)),
      ]),
    ),
    evidence,
    combinations,
  };
}
export function preferenceScore(outfit, profile = learn([])) {
  const f = features(outfit);
  let sum = 0,
    norm = 0;
  for (const [k, w] of Object.entries(profile.weights ?? {})) {
    sum += (f[k] ?? 0) * w;
    norm += Math.abs(w);
  }
  const specific = clamp(
    (profile.combinations?.[pairKey(outfit)] ?? 0) * 0.1,
    -0.12,
    0.12,
  );
  return clamp(0.5 + (sum / Math.max(3, norm)) * 0.78 + specific, 0, 1);
}
export function hasEvidence(profile, key) {
  const e = profile.evidence?.[key];
  return (
    !!e &&
    (e.observations ?? e.count) >= 2 &&
    e.count >= 1 &&
    e.confidence >= 0.2
  );
}
export function insights(profile) {
  const entries = Object.entries(profile.weights ?? {}).filter(
    ([key]) => LABELS[key] && hasEvidence(profile, key),
  );
  const groups = [
    [
      "relaxed",
      "fitted",
      "straight",
      "wide",
      "skinny",
      "balanced",
      "volume",
      "fittedPair",
      "relaxedStructured",
    ],
    [
      "neutral",
      "earth",
      "colorful",
      "monochrome",
      "contrast",
      "neutralAccent",
      "tonal",
      "multiColor",
    ],
    ["interest", "lowComplexity", "simple"],
    ["dressy", "casual"],
  ];
  const specific = new Set([
    "volume",
    "fittedPair",
    "relaxedStructured",
    "neutralAccent",
  ]);
  const pick = (list) => {
    const seen = new Set();
    return list
      .sort(
        (a, b) =>
          Math.abs(b[1]) +
          (specific.has(b[0]) ? 0.03 : 0) -
          (Math.abs(a[1]) + (specific.has(a[0]) ? 0.03 : 0)),
      )
      .filter(([key]) => {
        const group = groups.findIndex((g) => g.includes(key));
        const identity = group < 0 ? key : group;
        if (seen.has(identity)) return false;
        seen.add(identity);
        return true;
      })
      .slice(0, 3);
  };
  return {
    prefer: pick(entries.filter(([, v]) => v > 0.12)),
    avoid: pick(entries.filter(([, v]) => v < -0.12)),
  };
}
