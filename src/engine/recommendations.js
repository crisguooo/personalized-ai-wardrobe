import { BY_ID } from "../data/catalog.js";
import { features } from "./features.js";
import { learn } from "./profile.js";
import { scoreBreakdown } from "./scoring.js";
import { validity, makeOutfit } from "./compatibility.js";

const hash = (s) =>
  [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
const sample = (list, count) =>
  list.length <= count
    ? list
    : Array.from(
        { length: count },
        (_, i) => list[Math.floor((i * list.length) / count)],
      );
// Sample a Cartesian product by index without ever allocating the full product.
function productSample(groups, count) {
  const size = groups.reduce((n, g) => n * g.length, 1);
  if (!size) return [];
  const gcd = (a, b) => (b ? gcd(b, a % b) : a);
  let stride = Math.max(1, Math.floor(size / Math.min(count, size)));
  while (gcd(stride, size) !== 1) stride++;
  return Array.from({ length: Math.min(count, size) }, (_, i) => {
    let index = (i * stride) % size;
    return [...groups]
      .reverse()
      .map((g) => {
        const item = g[index % g.length];
        index = Math.floor(index / g.length);
        return item;
      })
      .reverse();
  });
}
export function generate(ownedIds, { requiredId, limit = 900 } = {}) {
  const owned = [...new Set(ownedIds)]
    .sort()
    .map((id) => BY_ID[id])
    .filter(Boolean);
  const required = BY_ID[requiredId];
  if (requiredId && (!required || !ownedIds.includes(requiredId))) return [];
  if (!Number.isFinite(limit) || limit <= 0) return [];
  limit = Math.min(900, Math.floor(limit));
  const group = (category) =>
    required?.category === category
      ? [required]
      : owned.filter((i) => i.category === category);
  const core = [group("top"), group("bottom"), group("shoes")];
  if (core.some((g) => !g.length)) return [];
  const mids = sample(group("midlayer"), 12),
    outers = sample(group("outerwear"), 18),
    accessories = group("accessory");
  const bases = productSample(core, Math.min(240, limit));
  const buckets = [];
  for (const [index, trio] of bases.entries()) {
    const arrangements = [
      [],
      ...mids.map((i) => [i]),
      ...outers.map((i) => [i]),
      ...productSample([mids, outers], 54),
    ];
    const bucket = new Map();
    for (const [j, layers] of arrangements.entries()) {
      const pieces = [...trio, ...layers];
      if (
        required &&
        ["midlayer", "outerwear"].includes(required.category) &&
        !pieces.some((i) => i.id === requiredId)
      )
        continue;
      const variants =
        required?.category === "accessory" ? [[...pieces, required]] : [pieces];
      if (accessories.length && required?.category !== "accessory") {
        // Keep both the simple and accessorized option; taste scores decide later.
        variants.push([
          ...pieces,
          accessories[(index + j) % accessories.length],
        ]);
      }
      for (const variant of variants) {
        const o = makeOutfit(variant);
        if (!validity(o).length) bucket.set(o.id, o);
      }
    }
    buckets.push([...bucket.values()].sort((a, b) => hash(a.id) - hash(b.id)));
  }
  // Round-robin across base combinations rather than filling the cap with one top.
  const result = [],
    seen = new Set();
  for (
    let index = 0;
    result.length < limit && buckets.some((b) => b[index]);
    index++
  ) {
    for (const bucket of buckets) {
      const o = bucket[index];
      if (o && !seen.has(o.id)) {
        result.push(o);
        seen.add(o.id);
      }
      if (result.length >= limit) break;
    }
  }
  return result;
}
export function outfitDistance(a, b) {
  const items = (o) => o.itemIds.map((id) => BY_ID[id]).filter(Boolean);
  const aa = items(a),
    bb = items(b);
  let distance = 0;
  for (const [category, weight] of [
    ["top", 0.28],
    ["bottom", 0.25],
    ["shoes", 0.1],
    ["midlayer", 0.12],
    ["outerwear", 0.15],
  ]) {
    const x = aa.find((i) => i.category === category),
      y = bb.find((i) => i.category === category);
    distance +=
      weight *
      (x?.archetype !== y?.archetype ? 1 : x?.color !== y?.color ? 0.15 : 0);
  }
  const af = features(a),
    bf = features(b);
  distance +=
    0.1 *
    Math.min(
      1,
      Math.abs(af.volume - bf.volume) +
        Math.abs(af.fittedPair - bf.fittedPair) +
        Math.abs(af.contrast - bf.contrast),
    );
  return Math.min(1, distance);
}
export function diversify(
  scored,
  { count = scored.length, strength = 0.12, recent = [] } = {},
) {
  if (!scored.length) return [];
  // Quality floor prevents exploration from promoting a bad look for novelty alone.
  const pool = scored
    .slice(0, 180)
    .filter((o) => o.evaluation.total >= scored[0].evaluation.total - 0.18);
  const picked = [];
  while (pool.length && picked.length < Math.min(count, 24)) {
    let best = 0,
      bestValue = -Infinity;
    for (let i = 0; i < pool.length; i++) {
      const comparisons = [...recent.slice(-4), ...picked];
      const similarity = comparisons.length
        ? Math.max(...comparisons.map((o) => 1 - outfitDistance(pool[i], o)))
        : 0;
      const value = pool[i].evaluation.total - strength * similarity;
      if (value > bestValue) {
        bestValue = value;
        best = i;
      }
    }
    picked.push(pool.splice(best, 1)[0]);
  }
  const ids = new Set(picked.map((o) => o.id));
  return [...picked, ...scored.filter((o) => !ids.has(o.id))].slice(0, count);
}
export function rank(
  candidates,
  profile = learn([]),
  occasion = "Everyday",
  options = {},
) {
  const unique = new Map(
    candidates.map((o) => {
      const id = [...(o.itemIds ?? [])].sort().join("|");
      return [id, { ...o, id }];
    }),
  );
  const scored = [...unique.values()]
    .map((o) => ({
      ...o,
      evaluation: scoreBreakdown(o, profile, occasion, options),
    }))
    .filter((o) => o.evaluation.valid)
    .sort(
      (a, b) =>
        b.evaluation.total - a.evaluation.total || a.id.localeCompare(b.id),
    );
  return options.diversity === false
    ? scored.slice(0, options.limit ?? scored.length)
    : diversify(scored, {
        count: options.limit ?? scored.length,
        strength: options.exploration ? 0.2 : 0.12,
        recent: options.recent ?? [],
      });
}
export const explore = (candidates, count = 12, profile = learn([])) =>
  rank(candidates, profile, "Everyday", { limit: count, exploration: true });
export function swapCandidates(outfit, id, ownedIds) {
  const original = BY_ID[id];
  if (!original || !outfit.itemIds.includes(id)) return [];
  return ownedIds
    .map((key) => BY_ID[key])
    .filter(
      (i) =>
        i &&
        i.category === original.category &&
        (i.category !== "accessory" ||
          i.accessorySlot === original.accessorySlot) &&
        i.id !== id &&
        !outfit.itemIds.includes(i.id),
    )
    .map((i) => {
      const itemIds = outfit.itemIds.map((old) => (old === id ? i.id : old));
      return { id: [...itemIds].sort().join("|"), itemIds };
    })
    .filter((o) => !validity(o, ownedIds).length);
}
export const swap = (outfit, id, ownedIds, profile, occasion) =>
  rank(swapCandidates(outfit, id, ownedIds), profile, occasion, {
    diversity: false,
  })[0] ?? null;
