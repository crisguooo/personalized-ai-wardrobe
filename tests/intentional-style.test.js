import test from "node:test";
import assert from "node:assert/strict";
import { BY_ID, CATALOG } from "../src/data/catalog.js";
import {
  generate,
  rank,
  learn,
  scoreBreakdown,
  validity,
} from "../src/engine/wardrobe.js";
import { matchedFormulas, FORMULAS } from "../src/engine/formulas.js";
import {
  visualWeightScore,
  thermalCoherenceScore,
  styleCoherenceScore,
  focalHierarchyScore,
  proportionScore,
} from "../src/engine/aesthetics.js";
import { BRANDS, BRAND_STYLES, brandReferences } from "../src/data/brands.js";
const outfit = (...itemIds) => ({ id: [...itemIds].sort().join("|"), itemIds });
const items = (o) => o.itemIds.map((id) => BY_ID[id]);
const liked = (o) =>
  learn(Array.from({ length: 16 }, () => ({ ...o, rating: "like" })));

// Captured from the actual 5173/#outfits UI before this change (Date / Your Edit).
const observedAwkward = outfit(
  "baby-tee:blue",
  "cropped-trousers:blue",
  "sneakers:black",
  "puffer:white",
);
const observedImproved = outfit(
  "knit:beige",
  "wide-jeans:beige",
  "sneakers:black",
  "puffer:white",
);
// User-described failure: oversized winter shell, summer inner, light narrow leg.
const winterAwkward = outfit(
  "baby-tee:black",
  "leggings:black",
  "sandals:black",
  "long-puffer:black",
);
const winterImproved = outfit(
  "thermal-top:black",
  "wide-jeans:black",
  "winter-boots:black",
  "long-puffer:black",
);

test("observed crop + cropped trousers + puffer ranks below a coherent winter silhouette", () => {
  for (const o of [
    observedAwkward,
    observedImproved,
    winterAwkward,
    winterImproved,
  ])
    assert.deepEqual(validity(o), []);
  for (const [bad, good] of [
    [observedAwkward, observedImproved],
    [winterAwkward, winterImproved],
  ]) {
    assert(
      thermalCoherenceScore(items(good)) > thermalCoherenceScore(items(bad)),
    );
    assert(visualWeightScore(items(good)) > visualWeightScore(items(bad)));
    for (const occasion of ["Everyday", "Date", "Work"])
      assert.equal(
        rank([bad, good], learn([]), occasion, { diversity: false })[0].id,
        good.id,
      );
  }
});

test("recipes constrain candidate slot pools before generation and retain an exploration lane", () => {
  const owned = [
    "fitted-tee:black",
    "oversized-tee:black",
    "button-shirt:white",
    "hoodie:black",
    "wide-jeans:black",
    "straight-jeans:black",
    "skinny-jeans:black",
    "sneakers:black",
    "loafers:black",
    "puffer:black",
  ];
  const candidates = generate(owned, { limit: 600 });
  assert(candidates.some((o) => o.generationFormula === "exploration"));
  for (const id of [
    "fitted-wide",
    "oversized-straight",
    "structured-relaxed",
  ]) {
    const built = candidates.filter((o) => o.generationFormula === id);
    assert(built.length, `Missing recipe ${id}`);
    assert(
      built.every((o) => matchedFormulas(items(o)).some((f) => f.id === id)),
    );
  }
  assert(
    candidates.some(
      (o) =>
        o.itemIds.includes("fitted-tee:black") &&
        o.itemIds.includes("skinny-jeans:black"),
    ),
  );
  assert(
    candidates.some(
      (o) =>
        o.itemIds.includes("oversized-tee:black") &&
        o.itemIds.includes("wide-jeans:black"),
    ),
  );
  // A bulky shell is no longer added just to fill a formula quota.
  // The same recipe is still available when a shell is explicitly requested.
  const shells = generate(owned, { requiredId: "puffer:black" });
  assert(
    shells.some((o) =>
      matchedFormulas(items(o)).some((f) => f.id === "roomy-shell"),
    ),
  );
  const sparse = generate([
    "fitted-tee:black",
    "skinny-jeans:black",
    "sneakers:black",
  ]);
  assert.equal(sparse.length, 1);
  assert.deepEqual(
    generate(owned.toReversed(), { limit: 600 }).map((o) => o.id),
    candidates.map((o) => o.id),
  );
});

test("generation honors required items and candidate bounds with every recipe", () => {
  const owned = CATALOG.map((i) => i.id);
  for (const requiredId of [
    "turtleneck:cream",
    "cargo:olive",
    "puffer:black",
    "loafers:black",
    "scarf:red",
  ]) {
    const list = generate(owned, { requiredId, limit: 70 });
    assert(list.length > 0 && list.length <= 70);
    assert(
      list.every(
        (o) => o.itemIds.includes(requiredId) && !validity(o, owned).length,
      ),
    );
  }
});

test("repeated preferences can override formulas and relax whole-look priors", () => {
  const roomy = outfit(
    "oversized-tee:black",
    "wide-jeans:black",
    "sneakers:white",
  );
  const balanced = outfit(
    "fitted-tee:black",
    "wide-jeans:black",
    "sneakers:white",
  );
  assert.equal(
    rank([roomy, balanced], learn([]), "Everyday", { diversity: false })[0].id,
    balanced.id,
  );
  assert.equal(
    rank([roomy, balanced], liked(roomy), "Everyday", { diversity: false })[0]
      .id,
    roomy.id,
  );
  assert(
    scoreBreakdown(winterAwkward, liked(winterAwkward)).scores
      .thermalCoherence > scoreBreakdown(winterAwkward).scores.thermalCoherence,
  );
});

test("whole-look weight recognizes footwear grounding and does not require skinny bottoms", () => {
  assert(
    visualWeightScore(items(winterImproved)) >
      visualWeightScore(items(winterAwkward)) + 0.15,
  );
  const upper = [BY_ID["puffer:black"], BY_ID["fitted-tee:black"]];
  assert(
    visualWeightScore([
      ...upper,
      BY_ID["wide-jeans:black"],
      BY_ID["winter-boots:black"],
    ]) >
      visualWeightScore([
        ...upper,
        BY_ID["skinny-jeans:black"],
        BY_ID["sandals:black"],
      ]),
  );
});

test("style coherence rewards shared or related tags over three unrelated languages", () => {
  const base = items(
    outfit("button-shirt:white", "trousers:black", "loafers:black"),
  );
  const unrelated = base.map((i, n) => ({
    ...i,
    styleTags: [["feminine"], ["sporty"], ["edgy"]][n],
  }));
  const related = base.map((i, n) => ({
    ...i,
    styleTags: [["minimal"], ["smart-casual"], ["preppy"]][n],
  }));
  assert(styleCoherenceScore(base) > styleCoherenceScore(unrelated));
  assert(styleCoherenceScore(related) > styleCoherenceScore(unrelated));
});

test("thermal contrast is a softer prior for going out and remains physically valid", () => {
  assert(
    thermalCoherenceScore(items(observedAwkward), "Going out") >
      thermalCoherenceScore(items(observedAwkward), "Work"),
  );
  assert(scoreBreakdown(observedAwkward).valid);
  assert(rank([observedAwkward]).length === 1);
});

test("one hero outranks competing heroes, and quiet intentional outfits stay viable", () => {
  const clear = items(
    outfit("fitted-tee:black", "trousers:black", "loafers:black", "blazer:red"),
  );
  const competing = items(
    outfit(
      "oversized-tee:red",
      "cargo:olive",
      "sneakers:red",
      "puffer:burgundy",
    ),
  );
  const quiet = items(
    outfit("fitted-tee:black", "wide-jeans:black", "loafers:black"),
  );
  assert(focalHierarchyScore(clear) > focalHierarchyScore(competing));
  assert(focalHierarchyScore(quiet) >= 0.7);
});

test("hem and rise influence proportion independently of fit", () => {
  const base = items(
    outfit("baby-tee:black", "wide-jeans:black", "sneakers:black"),
  );
  const low = base.map((i) =>
    i.category === "bottom" ? { ...i, rise: "low" } : i,
  );
  assert(proportionScore(base) > proportionScore(low));
  for (const i of CATALOG.filter((i) => i.category === "bottom"))
    assert(["low", "mid", "high"].includes(i.rise));
});

test("every occasion exposes finite intentional-styling components with normalized weights", () => {
  for (const occasion of ["Everyday", "Work", "Date", "Going out", "Comfy"]) {
    const result = scoreBreakdown(observedImproved, learn([]), occasion);
    for (const key of [
      "silhouette",
      "formula",
      "visualWeight",
      "styleCoherence",
      "thermalCoherence",
      "focalHierarchy",
      "proportion",
      "color",
      "layering",
      "occasion",
      "personal",
    ]) {
      assert(
        Number.isFinite(result.scores[key]) &&
          result.scores[key] >= 0 &&
          result.scores[key] <= 1,
        key,
      );
      assert(result.weights[key] > 0, key);
    }
    assert(
      Math.abs(Object.values(result.weights).reduce((a, b) => a + b, 0) - 1) <
        1e-9,
    );
  }
});

test("brand references span distinct styles, filter reliably, and respond to evidence", () => {
  assert(BRANDS.length >= 16);
  assert.equal(new Set(BRANDS.map((b) => b.id)).size, BRANDS.length);
  for (const filter of BRAND_STYLES) {
    const result = brandReferences({}, filter);
    assert(result.length);
    assert(
      result.every((b) => filter === "All styles" || b.styles.includes(filter)),
    );
    assert(result.every((b) => b.url.startsWith("https://") && b.description));
  }
  const profile = {
    weights: { preppy: 1, dressy: 1, "smart-casual": 1, layered: 1 },
    evidence: Object.fromEntries(
      ["preppy", "dressy", "smart-casual", "layered"].map((k) => [
        k,
        { observations: 6 },
      ]),
    ),
  };
  assert.equal(brandReferences(profile)[0].id, "polo");
  assert.equal(
    brandReferences({ weights: profile.weights, evidence: {} })[0].id,
    "cos",
  );
});
