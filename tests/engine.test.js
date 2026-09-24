import test from "node:test";
import assert from "node:assert/strict";
import {
  CATALOG,
  ARCHETYPES,
  BY_ID,
  STARTER_IDS,
} from "../src/data/catalog.js";
import {
  generate,
  validity,
  learn,
  features,
  rank,
  preferenceScore,
  explore,
  gaps,
  swap,
  insights,
} from "../src/engine/wardrobe.js";
import {
  createStorage,
  freshState,
  sanitize,
  STORAGE_KEY,
} from "../src/services/storage.js";
import { summarize } from "../server/provider.js";
const outfit = (...itemIds) => ({ id: [...itemIds].sort().join("|"), itemIds });
const feedback = (o, rating, reason) => ({
  ...o,
  outfitId: o.id,
  rating,
  reason: reason ?? null,
  timestamp: new Date().toISOString(),
});
const relaxed = outfit(
  "oversized-tee:grey",
  "wide-jeans:blue",
  "sneakers:white",
);
const fitted = outfit(
  "fitted-tee:black",
  "skinny-jeans:black",
  "loafers:black",
);
test("canonical metadata is complete, unique and consistent with art registry", () => {
  assert.equal(ARCHETYPES.length, 38);
  assert.equal(CATALOG.length, 304);
  assert.equal(new Set(CATALOG.map((i) => i.id)).size, CATALOG.length);
  for (const i of CATALOG) {
    for (const k of [
      "category",
      "subcategory",
      "color",
      "fit",
      "length",
      "layer",
      "styleTags",
      "warmth",
      "formality",
      "assetKey",
    ])
      assert.notEqual(i[k], undefined, `${i.id}: ${k}`);
    assert(
      i.assetKey === "wardrobe-atlas"
        ? i.sprite >= 0 && i.sprite < 36
        : ["tall-boots", "scarf"].includes(i.assetKey),
    );
    assert(i.thermal.minC <= i.thermal.maxC);
    assert(i.styleTags.length);
  }
  assert(STARTER_IDS.every((id) => BY_ID[id]));
});
test("hard rules catch missing, duplicate, unknown, unowned and over-bulky items", () => {
  assert.deepEqual(validity(relaxed, STARTER_IDS), []);
  assert(validity(outfit("oversized-tee:grey", "sneakers:white")).length);
  assert(validity(outfit(...relaxed.itemIds, "oversized-tee:grey")).length);
  assert(validity(outfit("unknown")).length);
  assert(
    validity(outfit(...relaxed.itemIds, "blazer:black"), STARTER_IDS).includes(
      "Unowned clothing item",
    ),
  );
  assert(
    validity(
      outfit(
        "hoodie:black",
        "wide-jeans:blue",
        "sneakers:white",
        "cardigan:beige",
      ),
    ).length,
  );
});
test("normal generation only uses owned items, is deterministic, bounded and valid", () => {
  const candidates = generate(STARTER_IDS);
  assert(candidates.length > 30);
  assert(candidates.length <= 900);
  assert.deepEqual(candidates, generate(STARTER_IDS));
  for (const c of candidates) {
    assert.deepEqual(validity(c, STARTER_IDS), []);
    assert(c.itemIds.every((id) => STARTER_IDS.includes(id)));
  }
  assert.deepEqual(generate(["crew-tee:white"]), []);
  assert.deepEqual(generate(STARTER_IDS, { requiredId: "blazer:black" }), []);
});
test("exploration surfaces different silhouettes and avoids duplicate cards", () => {
  const initial = explore(generate(STARTER_IDS), 5);
  assert.equal(new Set(initial.map((o) => o.id)).size, 5);
  assert(new Set(initial.map((o) => features(o).relaxed)).size > 1);
  assert(new Set(initial.map((o) => features(o).fitted)).size > 1);
});
test("explicit fit rejection targets relevant dimensions, not all items or colors", () => {
  const p = learn([feedback(fitted, "dislike", "Too fitted")]);
  assert(p.weights.fitted < 0);
  assert(p.weights.skinny < 0);
  assert.equal(p.weights.neutral, undefined);
  assert.equal(p.weights.preppy, undefined);
  const unexplained = learn([feedback(relaxed, "dislike")]);
  assert.equal(unexplained.weights.relaxed, undefined);
  assert.equal(unexplained.weights.colorful, undefined);
});
test("learning changes ranking and real insights follow contrasting feedback", () => {
  const events = [
    feedback(relaxed, "like"),
    feedback(relaxed, "like"),
    feedback(fitted, "dislike", "Too fitted"),
    feedback(fitted, "dislike", "Too fitted"),
    feedback(relaxed, "like"),
  ];
  const p = learn(events);
  assert.equal(p.ratings, 5);
  assert(p.weights.relaxed > 0);
  assert(p.weights.fitted < 0);
  assert(preferenceScore(relaxed, p) > preferenceScore(fitted, p));
  assert.equal(rank([fitted, relaxed], p)[0].id, relaxed.id);
  const summary = insights(p);
  assert(summary.prefer.some(([k]) => k === "relaxed"));
  assert(summary.avoid.some(([k]) => k === "fitted"));
  const opposite = learn([
    feedback(fitted, "like"),
    feedback(relaxed, "dislike", "Too baggy"),
  ]);
  assert(
    preferenceScore(fitted, opposite) > preferenceScore(relaxed, opposite),
  );
});
test("personalized recommendations outperform exploration on learned score", () => {
  const p = learn([
    feedback(relaxed, "like"),
    feedback(relaxed, "like"),
    feedback(fitted, "dislike", "Too fitted"),
  ]);
  const candidates = generate(STARTER_IDS);
  const mean = (list) =>
    list.reduce((s, o) => s + preferenceScore(o, p), 0) / list.length;
  assert(
    mean(rank(candidates, p).slice(0, 5)) > mean(explore(candidates, 5)) + 0.04,
  );
});
test("swap changes exactly one owned piece and preserves the rest", () => {
  const next = swap(
    relaxed,
    "oversized-tee:grey",
    STARTER_IDS,
    learn([]),
    "Work",
  );
  assert(next);
  assert(!next.itemIds.includes("oversized-tee:grey"));
  assert.equal(
    next.itemIds.filter((id) => !relaxed.itemIds.includes(id)).length,
    1,
  );
  assert(next.itemIds.includes("wide-jeans:blue"));
  assert(next.itemIds.includes("sneakers:white"));
  assert.deepEqual(validity(next, STARTER_IDS), []);
  assert.equal(
    swap(relaxed, "sneakers:white", relaxed.itemIds, learn([])),
    null,
  );
});
test("gap ranking excludes owned archetypes and weights preference rather than raw count", () => {
  const p = learn([
    feedback(relaxed, "like"),
    feedback(relaxed, "like"),
    feedback(fitted, "dislike", "Too dressy"),
  ]);
  const results = gaps(STARTER_IDS, p);
  assert.equal(results.length, 3);
  assert(
    results.every(
      (g) =>
        !STARTER_IDS.some((id) => BY_ID[id].archetype === g.item.archetype),
    ),
  );
  assert(
    results.every((g, i) => i === 0 || results[i - 1].weighted >= g.weighted),
  );
  for (const g of results) {
    assert(g.likely <= g.possible);
    assert(g.weighted <= g.likely);
    assert(g.examples.length > 0 && g.examples.length <= 3);
    for (const o of g.examples) {
      assert(o.itemIds.includes(g.item.id));
      assert(
        o.itemIds.every((id) => id === g.item.id || STARTER_IDS.includes(id)),
      );
      assert.deepEqual(validity(o, [...STARTER_IDS, g.item.id]), []);
      assert(preferenceScore(o, p) >= 0.55);
    }
  }
  const dressy = learn(
    Array.from({ length: 6 }, () => feedback(fitted, "like")),
  );
  assert.notDeepEqual(
    results.map((g) => g.weighted),
    gaps(STARTER_IDS, dressy).map((g) => g.weighted),
  );
});
test("persistence round trip preserves closet, feedback, saved/generated outfits and onboarding", () => {
  const memory = new Map();
  const storage = createStorage({
    getItem: (k) => memory.get(k),
    setItem: (k, v) => memory.set(k, v),
  });
  const state = {
    ...freshState(),
    closet: STARTER_IDS,
    feedback: [feedback(relaxed, "like")],
    saved: [relaxed],
    generated: [relaxed],
    onboarded: true,
    learned: true,
  };
  assert.equal(storage.save(state), null);
  const loaded = storage.load().state;
  assert.deepEqual(loaded.closet, state.closet);
  assert.deepEqual(loaded.feedback, state.feedback);
  assert.deepEqual(loaded.saved, [relaxed]);
  assert.equal(loaded.onboarded, true);
  assert.equal(loaded.learned, true);
  assert.equal(loaded.profile.ratings, 1);
  memory.set(STORAGE_KEY, "not json");
  assert(storage.load().error);
  assert.equal(storage.load().state.closet.length, 0);
});
test("storage sanitizes invalid ownership and stale profiles; handles unavailable storage", () => {
  const clean = sanitize({
    ...freshState(),
    closet: [...STARTER_IDS, "bad"],
    saved: [outfit(...relaxed.itemIds, "blazer:black")],
    profile: { weights: { relaxed: 999 } },
  });
  assert(!clean.closet.includes("bad"));
  assert.equal(clean.saved.length, 0);
  assert.deepEqual(clean.profile.weights, {});
  const broken = createStorage({
    getItem() {
      throw Error("blocked");
    },
    setItem() {
      throw Error("quota");
    },
  });
  assert(broken.load().error);
  assert(broken.save(freshState()));
});
test("server provider has a functional evidence-grounded no-key fallback", async () => {
  const result = await summarize(["Relaxed silhouettes"], {});
  assert.equal(result.source, "deterministic");
  assert(result.text.includes("Relaxed silhouettes"));
});
