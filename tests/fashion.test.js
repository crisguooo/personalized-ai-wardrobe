import test from "node:test";
import assert from "node:assert/strict";
import { BY_ID, CATALOG, STARTER_IDS } from "../src/data/catalog.js";
import {
  validity,
  learn,
  rank,
  generate,
  scoreBreakdown,
  silhouetteScore,
  swapCandidates,
  insights,
  preferenceScore,
  features,
  outfitDistance,
} from "../src/engine/wardrobe.js";
import { palette } from "../src/engine/palette.js";
import { physicalRules } from "../src/engine/compatibility.js";
import { OCCASIONS } from "../src/engine/occasions.js";
import { gapEvidence } from "../src/engine/gaps.js";
import { freshState, sanitize } from "../src/services/storage.js";
const outfit = (...itemIds) => ({ id: [...itemIds].sort().join("|"), itemIds });
const event = (o, rating = "like", reason) => ({
  ...o,
  rating,
  reason,
  timestamp: "2026-09-24T12:00:00Z",
});
const repeat = (o, n = 10) => learn(Array.from({ length: n }, () => event(o)));
const items = (o) => o.itemIds.map((id) => BY_ID[id]);
const balanced = outfit(
  "fitted-tee:black",
  "wide-jeans:black",
  "sneakers:white",
);
const defined = outfit(
  "fitted-tee:black",
  "skinny-jeans:black",
  "sneakers:white",
);
const roomy = outfit(
  "oversized-tee:black",
  "wide-jeans:black",
  "sneakers:white",
);
const basic = outfit(
  "crew-tee:black",
  "straight-jeans:black",
  "sneakers:black",
);
const polished = outfit(
  "fitted-tee:black",
  "trousers:black",
  "blazer:black",
  "loafers:black",
);
const cozy = outfit("knit:cream", "sweatpants:grey", "sneakers:white");

test("all existing IDs gain bounded styling metadata without changing their thermal ranges", () => {
  for (const i of CATALOG) {
    for (const key of [
      "volume",
      "formality",
      "exposure",
      "visualWeight",
      "bulk",
      "layerCapacity",
    ])
      assert(i[key] >= 1 && i[key] <= 5, `${i.id}: ${key}`);
    assert(["cropped", "waist", "hip", "long"].includes(i.length));
    assert(["soft", "medium", "structured"].includes(i.structure));
    assert(i.texture && i.colorFamily);
  }
  assert.equal(BY_ID["crew-tee:white"].thermal.minC, 27);
});
test("physical layering rejects bulky inners in narrow jackets, allows fitted tees and roomy puffers", () => {
  const base = ["wide-jeans:black", "sneakers:white"];
  assert(
    validity(outfit("hoodie:black", ...base, "leather-jacket:black")).some(
      (r) => r.includes("capacity"),
    ),
  );
  assert.equal(BY_ID["hoodie:black"].bulk, 5);
  assert.deepEqual(
    validity(outfit("fitted-tee:black", ...base, "blazer:black")),
    [],
  );
  assert.deepEqual(
    validity(outfit("long-sleeve:black", ...base, "leather-jacket:black")),
    [],
    "a thin long-sleeve tee is not a bulky sweatshirt",
  );
  assert.deepEqual(
    validity(outfit("hoodie:black", ...base, "long-puffer:black")),
    [],
  );
  assert.deepEqual(
    validity(
      outfit(
        "fitted-tee:black",
        ...base,
        "zip-hoodie:black",
        "long-puffer:black",
      ),
    ),
    [],
  );
  // Same construction test works for new items, not only named combinations.
  const inner = { ...BY_ID["knit:cream"], bulk: 5 };
  const shell = { ...BY_ID["blazer:black"], layerCapacity: 2 };
  assert(physicalRules([inner, shell]).length);
  assert.deepEqual(physicalRules([inner, { ...shell, layerCapacity: 5 }]), []);
});
test("silhouette defaults favor balance while both defined and volume-on-volume remain valid", () => {
  assert(silhouetteScore(items(balanced)) >= 0.85);
  assert(
    silhouetteScore(
      items(
        outfit("oversized-tee:black", "straight-jeans:black", "sneakers:white"),
      ),
    ) >= 0.85,
  );
  for (const o of [defined, roomy]) {
    assert.deepEqual(validity(o), []);
    assert(silhouetteScore(items(o)) > 0.5);
  }
});
test("repeated defined and roomy likes can overturn default silhouette rankings", () => {
  for (const liked of [defined, roomy]) {
    const profile = repeat(liked);
    assert(preferenceScore(liked, profile) > preferenceScore(liked, learn([])));
    assert.equal(
      rank([balanced, liked], learn([]), "Everyday", { diversity: false })[0]
        .id,
      balanced.id,
    );
    assert.equal(
      rank([balanced, liked], profile, "Everyday", { diversity: false })[0].id,
      liked.id,
    );
    assert(
      silhouetteScore(items(liked), profile) > silhouetteScore(items(liked)),
    );
  }
});
test("personal taste can never rescue physical incompatibility", () => {
  const invalid = outfit(
    "hoodie:black",
    "wide-jeans:black",
    "sneakers:white",
    "leather-jacket:black",
  );
  assert.equal(rank([invalid], repeat(invalid, 40)).length, 0);
  assert.equal(scoreBreakdown(invalid, repeat(invalid)).valid, false);
});
test("one ambiguous dislike is weak; explicit reasons target only their intended relationship", () => {
  const ambiguous = learn([event(defined, "dislike", "Just not me")]);
  const explicit = learn([event(defined, "dislike", "Too fitted")]);
  assert(Math.abs(preferenceScore(defined, ambiguous) - 0.5) < 0.04);
  assert(
    preferenceScore(defined, explicit) < preferenceScore(defined, ambiguous),
  );
  assert.equal(explicit.weights.neutral, undefined);
  assert.equal(explicit.weights.dressy, undefined);
  const color = learn([event(balanced, "dislike", "Color combination")]);
  assert.equal(color.weights.fitted, undefined);
  assert.equal(color.weights.wide, undefined);
  assert.deepEqual(color.combinations, {});
  assert(
    preferenceScore(defined, learn([event(defined)])) - 0.5 >
      0.5 - preferenceScore(defined, ambiguous),
  );
});
test("insights and summary evidence require repeated observations", () => {
  assert.deepEqual(insights(learn([event(roomy)])), { prefer: [], avoid: [] });
  const p = repeat(roomy, 6);
  assert(insights(p).prefer.length);
  assert(p.evidence.volume.observations >= 6);
  assert(p.evidence.volume.confidence > 0 && p.evidence.volume.confidence < 1);
  assert(
    insights(repeat(defined)).prefer.some(([key]) => key === "fittedPair"),
  );
  const paletteKeys = new Set([
    "neutral",
    "earth",
    "colorful",
    "monochrome",
    "contrast",
    "neutralAccent",
    "tonal",
    "multiColor",
  ]);
  assert(
    insights(p).prefer.filter(([key]) => paletteKeys.has(key)).length <= 1,
  );
});
test("occasion objectives are centralized normalized and alter actual ranking", () => {
  for (const plan of Object.values(OCCASIONS))
    assert(
      Math.abs(Object.values(plan.weights).reduce((a, b) => a + b, 0) - 1) <
        1e-9,
    );
  const work = rank([polished, cozy], learn([]), "Work", { diversity: false });
  const comfy = rank([polished, cozy], learn([]), "Comfy", {
    diversity: false,
  });
  assert.equal(work[0].id, polished.id);
  assert.equal(comfy[0].id, cozy.id);
  assert(!cozy.itemIds.some((id) => id.startsWith("hoodie:")));
});

test("Comfy favors easier footwear over heavy boots when no weather requires them", () => {
  const boots = outfit("knit:cream", "trousers:black", "winter-boots:black");
  const sneakers = outfit("knit:cream", "trousers:black", "sneakers:white");
  assert.equal(
    rank([boots, sneakers], learn([]), "Comfy", { diversity: false })[0].id,
    sneakers.id,
  );
});
test("going out seeks more interest than Everyday; Date does not require exposure or feminine garments", () => {
  const expressive = outfit(
    "fitted-tee:black",
    "wide-jeans:blue",
    "leather-jacket:black",
    "ankle-boots:black",
    "shoulder-bag:red",
  );
  const difference = (occasion) =>
    scoreBreakdown(expressive, learn([]), occasion).total -
    scoreBreakdown(basic, learn([]), occasion).total;
  assert(difference("Going out") > difference("Everyday"));
  const covered = outfit("knit:black", "trousers:black", "loafers:black");
  const revealing = outfit(
    "tube:black",
    "mini-skirt:black",
    "mary-janes:black",
  );
  assert.equal(
    rank([covered, revealing], learn([]), "Date", { diversity: false })[0].id,
    covered.id,
  );
  const relaxedProfile = repeat(roomy);
  assert.equal(
    rank([roomy, revealing], relaxedProfile, "Date", { diversity: false })[0]
      .id,
    roomy.id,
  );
});
test("color softly favors neutrals, tonal relationships and a controlled accessory accent", () => {
  const accent = outfit(...basic.itemIds, "shoulder-bag:red");
  const chaotic = outfit(
    "crew-tee:red",
    "trousers:olive",
    "sneakers:blue",
    "cardigan:grey",
    "shoulder-bag:camel",
  );
  assert(palette(accent).neutralAccent);
  assert(palette(accent).score > palette(chaotic).score);
  assert(rank([basic, chaotic], learn([])).some((o) => o.id === chaotic.id));
  assert(palette(chaotic, repeat(chaotic)).score > palette(chaotic).score);
});
test("extra layers are not automatically better and temporary refinements change scoring targets", () => {
  const layered = outfit(...basic.itemIds, "cardigan:black");
  assert(scoreBreakdown(basic).scores.layering >= 0.8);
  for (const [name, metric, direction] of [
    ["Less basic", "targetInterest", 1],
    ["More casual", "targetFormality", -1],
    ["More dressy", "targetFormality", 1],
  ]) {
    const before = scoreBreakdown(basic),
      after = scoreBreakdown(basic, learn([]), "Everyday", {
        refinement: name,
      });
    assert((after.metrics[metric] - before.metrics[metric]) * direction > 0);
  }
  assert(
    scoreBreakdown(layered, learn([]), "Everyday", {
      refinement: "More layered",
    }).scores.layering > scoreBreakdown(layered).scores.layering,
  );
});
test("diversity varies core pieces among comparable scores rather than just recoloring shoes", () => {
  const candidates = generate([
    ...STARTER_IDS,
    "cardigan:black",
    "blazer:black",
    "ankle-boots:black",
  ]);
  const sorted = rank(candidates, learn([]), "Everyday", { diversity: false });
  const picks = rank(candidates, learn([]), "Everyday", { limit: 8 });
  assert.equal(new Set(picks.map((o) => o.id)).size, picks.length);
  assert(
    new Set(
      picks.map(
        (o) =>
          o.itemIds.find((id) => BY_ID[id].category === "top").split(":")[0],
      ),
    ).size >= 3,
  );
  assert(
    picks.every((o) => o.evaluation.total >= sorted[0].evaluation.total - 0.18),
  );
  assert(
    outfitDistance(
      basic,
      outfit("crew-tee:black", "straight-jeans:black", "sneakers:white"),
    ) < outfitDistance(basic, cozy),
  );
});
test("swap locks every unselected piece and excludes physically invalid replacements", () => {
  const current = outfit(
    "fitted-tee:black",
    "wide-jeans:black",
    "sneakers:white",
    "leather-jacket:black",
  );
  const owned = [...current.itemIds, "hoodie:black", "crew-tee:white"];
  const replacements = swapCandidates(current, "fitted-tee:black", owned);
  assert(replacements.length);
  assert(replacements.every((o) => !o.itemIds.includes("hoodie:black")));
  for (const next of replacements)
    assert.deepEqual(
      next.itemIds.filter((id) => id !== "crew-tee:white"),
      current.itemIds.filter((id) => id !== "fitted-tee:black"),
    );
});
test("gap value uses shared quality and personal scores, deduplicates colors, and ignores raw counts", () => {
  const profile = repeat(roomy);
  const irrelevant = Array.from({ length: 30 }, (_, i) =>
    outfit(
      "button-shirt:" + ["white", "blue", "grey"][i % 3],
      "trousers:black",
      "loafers:black",
      "blazer:black",
    ),
  );
  const relevant = [
    roomy,
    outfit("hoodie:black", "wide-jeans:black", "sneakers:white"),
    outfit("oversized-tee:black", "cargo:black", "sneakers:white"),
  ];
  const a = gapEvidence(irrelevant, profile),
    b = gapEvidence(relevant, profile);
  assert(irrelevant.length > relevant.length);
  assert(b.weighted > a.weighted);
  assert(
    b.good.every(
      (o) => o.evaluation.total >= 0.64 && o.evaluation.scores.personal >= 0.55,
    ),
  );
  const recolored = gapEvidence(
    [roomy, outfit("oversized-tee:grey", "wide-jeans:black", "sneakers:white")],
    profile,
  );
  assert.equal(recolored.likely, 1);
});
test("candidate generation is bounded and deterministic even for the entire catalog", () => {
  const ids = CATALOG.map((i) => i.id);
  const start = performance.now(),
    all = generate(ids);
  assert(all.length <= 900 && all.length > 100);
  assert(performance.now() - start < 5000);
  assert.deepEqual(
    generate(ids.toReversed()).map((o) => o.id),
    all.map((o) => o.id),
  );
  const required = "blazer:cream";
  assert(
    generate(ids, { requiredId: required, limit: 100 }).every((o) =>
      o.itemIds.includes(required),
    ),
  );
});
test("scores expose finite components and preserve historic feedback through schema enrichment", () => {
  const result = scoreBreakdown(polished, repeat(polished), "Work");
  assert(result.rules.length);
  for (const v of Object.values(result.scores))
    assert(Number.isFinite(v) && v >= 0 && v <= 1);
  assert(
    Math.abs(
      result.total -
        Object.entries(result.weights).reduce(
          (sum, [k, w]) => sum + w * result.scores[k],
          0,
        ),
    ) < 1e-9,
  );
  const old = outfit(
    "hoodie:black",
    "wide-jeans:black",
    "sneakers:white",
    "leather-jacket:black",
  );
  const state = sanitize({
    ...freshState(),
    closet: STARTER_IDS,
    feedback: [event(old)],
    onboarded: true,
  });
  assert.equal(state.feedback.length, 1);
  assert.equal(state.profile.version, 2);
  assert.deepEqual(state.closet, STARTER_IDS);
  assert(state.onboarded);
  const saved = sanitize({
    ...freshState(),
    closet: old.itemIds,
    saved: [old],
  });
  assert.equal(
    saved.saved.length,
    1,
    "new physical defaults must not erase a user's saved history",
  );
});

test("neutral colors can repeat while red and green are controlled by visible area", () => {
  const neutrals = outfit(
    "knit:beige",
    "trousers:black",
    "loafers:black",
    "scarf:beige",
  );
  const redAccent = outfit(
    "knit:beige",
    "trousers:black",
    "loafers:black",
    "scarf:red",
  );
  const greenAccent = outfit(
    "knit:beige",
    "trousers:black",
    "loafers:black",
    "scarf:olive",
  );
  const boldBody = outfit(
    "knit:red",
    "trousers:olive",
    "loafers:black",
    "scarf:beige",
  );
  assert(palette(neutrals).score >= 0.9);
  assert(palette(redAccent).neutralAccent);
  assert(palette(greenAccent).neutralAccent);
  assert(palette(redAccent).score > palette(boldBody).score);
  assert(palette(greenAccent).score > palette(boldBody).score);
  assert.equal(
    rank([boldBody, redAccent], learn([]), "Everyday", { diversity: false })[0]
      .id,
    redAccent.id,
  );
});

test("the same bold color is an accent on a bag but a statement on a coat", () => {
  const base = ["long-sleeve:beige", "trousers:black", "loafers:black"];
  const bag = palette(outfit(...base, "shoulder-bag:red"));
  const coat = palette(outfit(...base, "wool-coat:red"));
  const repeated = palette(
    outfit("long-sleeve:red", "trousers:red", "loafers:black", "wool-coat:red"),
  );
  assert(bag.neutralAccent);
  assert(!coat.neutralAccent);
  assert(bag.accentShare < coat.accentShare);
  assert(bag.score > coat.score);
  // Repetition can form a deliberate tonal statement rather than a banned color overload.
  assert(repeated.tonal);
  assert(repeated.cohesive);
});

test("an accent needs a unified foundation and tiny accessories cannot erase a bold coat", () => {
  const unified = palette(
    outfit("knit:beige", "trousers:black", "loafers:black", "shoulder-bag:red"),
  );
  const scattered = palette(
    outfit("knit:beige", "trousers:blue", "loafers:navy", "shoulder-bag:red"),
  );
  assert(unified.score > scattered.score);
  assert(!scattered.neutralAccent);
  const loaded = palette(
    outfit(
      "long-sleeve:black",
      "trousers:red",
      "loafers:black",
      "wool-coat:red",
      "earrings:black",
      "belt:black",
      "sunglasses:black",
    ),
  );
  assert(!loaded.neutralAccent);
  assert(loaded.accentShare > 0.5);
});
