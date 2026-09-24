import { ARCHETYPES, BY_ID, DEFAULT_COLORS } from "../data/catalog.js";
import { generate, rank, outfitDistance } from "./recommendations.js";
import { learn, insights } from "./profile.js";
import { features, LABELS } from "./features.js";

export function gapEvidence(candidates, profile, threshold = 0.7) {
  const ranked = rank(candidates, profile, "Everyday", { diversity: false });
  const personalThreshold = profile.ratings >= 3 ? 0.55 : 0.5;
  const good = ranked.filter(
    (o) =>
      o.evaluation.total >= threshold &&
      o.evaluation.scores.personal >= personalThreshold,
  );
  // Recoloring the same outfit does not create another wardrobe opportunity.
  const unique = new Map();
  for (const o of good) {
    const key = o.itemIds
      .map((id) => BY_ID[id].archetype)
      .sort()
      .join("|");
    if (!unique.has(key)) unique.set(key, o);
  }
  const looks = [...unique.values()];
  const representatives = [];
  for (const o of looks)
    if (representatives.every((r) => outfitDistance(o, r) >= 0.24))
      representatives.push(o);
  const diversity = looks.length ? representatives.length / looks.length : 0;
  const weighted =
    looks.reduce(
      (sum, o) => sum + o.evaluation.total * o.evaluation.scores.personal,
      0,
    ) * diversity;
  return {
    good: looks,
    likely: looks.length,
    weighted,
    diversity,
    personalThreshold,
  };
}
export function gaps(ownedIds, profile = learn([])) {
  const ownedArchetypes = new Set(ownedIds.map((id) => BY_ID[id]?.archetype));
  const baseline = rank(generate(ownedIds, { profile }), profile, "Everyday", {
    diversity: false,
  });
  if (!baseline.length) return [];
  const threshold = Math.max(
    0.7,
    baseline[Math.floor((baseline.length - 1) * 0.35)].evaluation.total - 0.02,
  );
  const results = ARCHETYPES.filter((a) => !ownedArchetypes.has(a.key)).map(
    (a) => {
      const colorCounts = {};
      for (const id of ownedIds) {
        const color = BY_ID[id]?.color;
        if (color) colorCounts[color] = (colorCounts[color] ?? 0) + 1;
      }
      const dominant = Object.keys(colorCounts).sort(
        (x, y) => colorCounts[y] - colorCounts[x] || x.localeCompare(y),
      )[0];
      const item =
        BY_ID[`${a.key}:${dominant ?? DEFAULT_COLORS[a.key] ?? "grey"}`];
      const candidates = generate([...ownedIds, item.id], {
        requiredId: item.id,
        limit: 300,
        profile,
      });
      const facts = gapEvidence(candidates, profile, threshold);
      const compatible = new Set(
        facts.good.flatMap((o) => o.itemIds).filter((id) => id !== item.id),
      );
      const counts = Object.fromEntries(
        ["top", "bottom", "shoes"].map((c) => [
          c,
          [...compatible].filter((id) => BY_ID[id].category === c).length,
        ]),
      );
      const relevant = insights(profile)
        .prefer.filter(([key]) =>
          facts.good.slice(0, 3).some((o) => features(o)[key] > 0.3),
        )
        .slice(0, 2)
        .map(([key]) => LABELS[key].toLowerCase());
      const examples = rank(facts.good, profile, "Everyday", { limit: 3 });
      return {
        item,
        possible: candidates.length,
        likely: facts.likely,
        weighted: facts.weighted,
        diversity: facts.diversity,
        threshold,
        personalThreshold: facts.personalThreshold,
        counts,
        compatible: compatible.size,
        examples,
        shortReason: relevant.length
          ? `Brings ${relevant.join(" and ")} to more of the pieces you own.`
          : `Works with ${compatible.size} pieces already in your closet.`,
        why: `${relevant.length ? `Repeated ratings favor ${relevant.join(" and ")}. ` : "This is an early estimate from your closet. "}Adding ${item.name.toLowerCase()} opens ${facts.likely} distinct high-scoring combinations with ${compatible.size} pieces you own; the previews show actual examples.`,
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
