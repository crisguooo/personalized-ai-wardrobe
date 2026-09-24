import {
  LAYER_STRUCTURES,
  canFillLayer,
  isLayer,
  assignLayers,
} from "../data/layers.js";
import { BY_ID } from "../data/catalog.js";
import { features } from "./features.js";
import { learn } from "./profile.js";
import { scoreBreakdown } from "./scoring.js";
import { validity, makeOutfit } from "./compatibility.js";
import { FORMULAS } from "./formulas.js";
import { palette, colorStrategiesFor } from "./palette.js";
import {
  directionOrder,
  directionAffinity,
  composition,
  additionValue,
  annotateLook,
  intentionalityScores,
} from "./directions.js";

// Direction and recipe establish the search space before any supporting pieces.
export function generate(
  ownedIds,
  { requiredId, limit = 900, profile = {}, occasion = "Everyday" } = {},
) {
  const owned = [...new Set(ownedIds)]
    .sort()
    .map((id) => BY_ID[id])
    .filter(Boolean);
  const required = BY_ID[requiredId];
  if (requiredId && (!required || !ownedIds.includes(requiredId))) return [];
  if (!Number.isFinite(limit) || limit <= 0) return [];
  limit = Math.min(900, Math.floor(limit));
  const group = (category) =>
    required?.category === category && !isLayer(required)
      ? [required]
      : owned.filter((i) => i.category === category);
  if (["top", "bottom", "shoes"].some((c) => !group(c).length)) return [];
  const result = new Map();
  const accept = (o) => {
    if (requiredId && !o.itemIds.includes(requiredId)) return;
    if (validity(o).length) return;
    const old = result.get(o.id);
    if (!old || composition(o).quality > composition(old).quality + 0.025)
      result.set(o.id, annotateLook(o, occasion));
  };
  const bounded = (list, size) =>
    list.length <= size
      ? list
      : [
          ...new Set([
            ...list.slice(0, Math.ceil(size / 3)),
            ...Array.from(
              { length: size - Math.ceil(size / 3) },
              (_, n) =>
                list[
                  Math.floor((n * list.length) / (size - Math.ceil(size / 3)))
                ],
            ),
          ]),
        ];
  const directions = directionOrder(profile, occasion);
  for (const [directionIndex, direction] of directions.entries()) {
    const affinity = (i) => directionAffinity(i, direction.id);
    const pool = (category, predicate = () => true) => {
      const all = group(category).filter(predicate);
      const aligned = all.filter((i) => affinity(i) >= 0.48);
      return bounded(
        (aligned.length ? aligned : all).sort(
          (a, b) => affinity(b) - affinity(a) || a.id.localeCompare(b.id),
        ),
        category === "shoes" ? 12 : 24,
      );
    };
    const recipes = [
      ...FORMULAS,
      { id: "exploration", top: () => true, bottom: () => true },
    ];
    for (const recipe of recipes) {
      // Choose the structure before filling any garment slots. A garment's
      // retail category does not decide which slot it can occupy.
      const plans = LAYER_STRUCTURES.filter((plan) => {
        if (recipe.outerwear && !plan.outer) return false;
        if (plan.mid && !owned.some((i) => canFillLayer(i, "midLayer")))
          return false;
        if (plan.outer && !owned.some((i) => canFillLayer(i, "outerLayer")))
          return false;
        return (
          !required ||
          !isLayer(required) ||
          (plan.mid && canFillLayer(required, "midLayer")) ||
          (plan.outer && canFillLayer(required, "outerLayer"))
        );
      });
      for (const plan of plans) {
        const requiredRole =
          required && isLayer(required)
            ? plan.mid && canFillLayer(required, "midLayer")
              ? "midLayer"
              : "outerLayer"
            : null;
        const rolePool = (role, predicate = () => true) => {
          const all = (requiredRole === role ? [required] : owned).filter(
            (i) => canFillLayer(i, role) && predicate(i),
          );
          const aligned = all.filter((i) => affinity(i) >= 0.48);
          return bounded(
            (aligned.length ? aligned : all).sort(
              (a, b) => affinity(b) - affinity(a) || a.id.localeCompare(b.id),
            ),
            12,
          );
        };
        const tops = pool("top", recipe.top),
          bottoms = pool("bottom", recipe.bottom);
        const shells = plan.outer
          ? rolePool("outerLayer", recipe.outerwear)
          : [null];
        const mids = plan.mid ? rolePool("midLayer") : [null];
        if (!tops.length || !bottoms.length || !shells.length || !mids.length)
          continue;
        const learned = Math.max(
          -0.5,
          profile.weights?.[`formula_${recipe.id}`] ?? 0,
        );
        const count = Math.max(
          2,
          Math.min(
            10,
            Math.ceil(
              (limit / (90 * Math.max(1, plans.length))) *
                (1 + learned) *
                (directionIndex < 3 ? 1 : 0.55),
            ),
          ),
        );
        // Establish an anchor first; choose supports relative to it, including color.
        const bottomAnchor =
          !plan.outer &&
          !plan.mid &&
          ["fitted-wide", "fluid-volume"].includes(recipe.id);
        const anchors = plan.outer
          ? shells
          : plan.mid
            ? mids
            : bottomAnchor
              ? bottoms
              : tops;
        for (
          let n = 0;
          n <
          Math.min(
            count,
            anchors.length * (bottomAnchor ? tops.length : bottoms.length),
          );
          n++
        ) {
          const anchor = anchors[n % anchors.length];
          const strategies = colorStrategiesFor(anchor, profile);
          // Select a color plan before supporting colors, with one exploration lane.
          for (const colorStrategy of [
            ...strategies.slice(0, 2),
            strategies[2 + ((n + directionIndex) % 6)],
          ]) {
            let top =
              plan.outer || plan.mid || bottomAnchor
                ? tops[Math.floor(n / anchors.length) % tops.length]
                : anchor;
            const shell = plan.outer ? anchor : null;
            const mid = plan.mid
              ? plan.outer
                ? mids[n % mids.length]
                : anchor
              : null;
            if (mid && shell === mid) continue;
            const supported = [...bottoms].sort((a, b) => {
              const value = (i) =>
                affinity(i) -
                palette(
                  {
                    itemIds: [
                      top.id,
                      i.id,
                      ...[mid, shell].filter(Boolean).map((i) => i.id),
                    ],
                    colorStrategy,
                  },
                  profile,
                ).penalty *
                  0.4;
              return value(b) - value(a) || a.id.localeCompare(b.id);
            });
            const bottom = bottomAnchor
              ? anchor
              : supported[
                  (recipe.id === "exploration"
                    ? n + directionIndex
                    : Math.floor(n / anchors.length)) %
                    Math.min(6, supported.length)
                ];
            if (bottomAnchor)
              top = [...tops].sort((a, b) => {
                const value = (i) =>
                  affinity(i) -
                  palette(
                    { itemIds: [i.id, bottom.id], colorStrategy },
                    profile,
                  ).penalty *
                    0.4;
                return value(b) - value(a) || a.id.localeCompare(b.id);
              })[Math.floor(n / anchors.length) % Math.min(6, tops.length)];
            const body = [top, bottom, ...[mid, shell].filter(Boolean)];
            if (assignLayers(body, plan.id).errors.length) continue;
            const heroItemId = anchor.id;
            const shoes = pool("shoes")
              .map((shoe) => {
                const look = {
                  itemIds: [...body, shoe].map((i) => i.id),
                  aestheticDirection: direction.id,
                  colorStrategy,
                };
                return { shoe, value: composition(look).quality };
              })
              .sort(
                (a, b) =>
                  b.value - a.value || a.shoe.id.localeCompare(b.shoe.id),
              )
              .slice(0, 2);
            for (const { shoe } of shoes) {
              const pieces = [
                top,
                bottom,
                shoe,
                ...[mid, shell].filter(Boolean),
              ];
              if (
                required?.category === "accessory" &&
                !pieces.includes(required)
              )
                pieces.push(required);
              const base = {
                ...makeOutfit(pieces),
                aestheticDirection: direction.id,
                colorStrategy,
                heroItemId,
                generationFormula: recipe.id,
                generationLayerStructure: plan.id,
                occasion,
              };
              // Every optional layer must earn its place in this planned look.
              if (
                [mid, shell]
                  .filter(Boolean)
                  .some(
                    (layer) =>
                      layer !== required &&
                      additionValue(
                        {
                          ...base,
                          itemIds: base.itemIds.filter((id) => id !== layer.id),
                        },
                        layer,
                      ) < 0.018,
                  )
              )
                continue;
              accept(base);
              // Accessories may finish a look; never append an unplanned layer.
              const extras = bounded(pool("accessory"), 8).filter(
                (i) =>
                  !pieces.some(
                    (p) =>
                      p.category === "accessory" &&
                      p.accessorySlot === i.accessorySlot,
                  ) && affinity(i) >= 0.6,
              );
              const additions = extras
                .map((i) => ({ i, gain: additionValue(base, i) }))
                .filter(({ gain }) => gain >= 0.018)
                .sort((a, b) => b.gain - a.gain || a.i.id.localeCompare(b.i.id))
                .slice(0, 2);
              for (const { i, gain } of additions) {
                const next = {
                  ...base,
                  ...makeOutfit([...pieces, i]),
                  additionGains: { [i.id]: gain },
                };
                if (
                  intentionalityScores(next).redundantItemIds.every(
                    (id) => id === requiredId,
                  )
                )
                  accept(next);
              }
            }
          }
        }
      }
    }
  }
  const lanes = directions.map((d) =>
    [...result.values()].filter((o) => o.aestheticDirection === d.id),
  );
  const ordered = [];
  for (let n = 0; ordered.length < limit && lanes.some((lane) => lane[n]); n++)
    for (const lane of lanes)
      if (lane[n] && ordered.length < limit) ordered.push(lane[n]);
  return ordered;
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
    const slot =
      category === "midlayer"
        ? "mid"
        : category === "outerwear"
          ? "outer"
          : null;
    const x = slot
        ? assignLayers(aa, a.layerStructure)[slot]
        : aa.find((i) => i.category === category),
      y = slot
        ? assignLayers(bb, b.layerStructure)[slot]
        : bb.find((i) => i.category === category);
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
  {
    count = scored.length,
    strength = 0.12,
    recent = [],
    exploration = false,
  } = {},
) {
  if (!scored.length) return [];
  // Quality floor prevents exploration from promoting a bad look for novelty alone.
  const pool = scored
    .slice(0, 180)
    .filter((o) => o.evaluation.total >= scored[0].evaluation.total - 0.18);
  const picked = [];
  const shape = new Map(pool.map((o) => [o.id, features(o)]));
  while (pool.length && picked.length < Math.min(count, 24)) {
    let best = 0,
      bestValue = -Infinity;
    for (let i = 0; i < pool.length; i++) {
      const comparisons = [...recent.slice(-4), ...picked];
      const similarity = comparisons.length
        ? Math.max(...comparisons.map((o) => 1 - outfitDistance(pool[i], o)))
        : 0;
      const coverage =
        exploration && picked.length
          ? ["relaxed", "fitted"].filter(
              (key) =>
                !picked.some(
                  (o) => shape.get(o.id)[key] === shape.get(pool[i].id)[key],
                ),
            ).length * 0.035
          : 0;
      const value = pool[i].evaluation.total - strength * similarity + coverage;
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
      return [id, annotateLook({ ...o, id }, occasion)];
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
  // Color intentionality participates in the score, never a family-count tier.
  const pool = scored;
  const ordered =
    options.diversity === false
      ? pool
      : diversify(pool, {
          count: options.limit ?? pool.length,
          strength: options.exploration ? 0.2 : 0.12,
          recent: options.recent ?? [],
          exploration: options.exploration,
        });
  return ordered.slice(0, options.limit ?? scored.length);
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
        (isLayer(original)
          ? isLayer(i) &&
            canFillLayer(
              i,
              assignLayers(outfit.itemIds.map((key) => BY_ID[key])).outer
                ?.id === id
                ? "outerLayer"
                : "midLayer",
            )
          : i.category === original.category) &&
        (i.category !== "accessory" ||
          i.accessorySlot === original.accessorySlot) &&
        i.id !== id &&
        !outfit.itemIds.includes(i.id),
    )
    .map((i) => {
      const itemIds = outfit.itemIds.map((old) => (old === id ? i.id : old));
      return annotateLook({
        ...outfit,
        id: [...itemIds].sort().join("|"),
        itemIds,
        heroItemId: outfit.heroItemId === id ? i.id : outfit.heroItemId,
      });
    })
    .filter((o) => !validity(o, ownedIds).length);
}
export const swap = (outfit, id, ownedIds, profile, occasion) =>
  rank(swapCandidates(outfit, id, ownedIds), profile, occasion, {
    diversity: false,
  })[0] ?? null;
