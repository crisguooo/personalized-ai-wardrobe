import test from "node:test";
import assert from "node:assert/strict";
import { BY_ID } from "../src/data/catalog.js";
import {
  generate,
  rank,
  learn,
  validity,
  scoreBreakdown,
} from "../src/engine/wardrobe.js";
import {
  DIRECTIONS,
  directionOrder,
  annotateLook,
  intentionalityScores,
  composition,
  additionValue,
  shoeCompatibility,
} from "../src/engine/directions.js";
import {
  weatherCandidates,
  rankForWeather,
  weatherEssentialIds,
} from "../src/engine/weather.js";
import { finishingTouch } from "../src/engine/finishing-touch.js";
import { sanitize, freshState } from "../src/services/storage.js";

const look = (...itemIds) => ({ itemIds, id: [...itemIds].sort().join("|") });
// User-reported real failures, evaluated aesthetically even when individually valid.
const overAssembled = look(
  "fitted-tee:beige",
  "cargo:black",
  "sneakers:black",
  "cardigan:beige",
  "blazer:black",
  "scarf:blue",
);
const competing = look(
  "knit:red",
  "sweatpants:blue",
  "puffer:black",
  "sneakers:black",
  "scarf:blue",
);
const street = look("fitted-tee:beige", "cargo:black", "sneakers:black");
const sporty = look(
  "sweatshirt:grey",
  "sweatpants:grey",
  "puffer:black",
  "sneakers:black",
);
const wardrobe = [
  "fitted-tee:beige",
  "crew-tee:white",
  "hoodie:black",
  "knit:beige",
  "button-shirt:white",
  "cargo:black",
  "trousers:black",
  "sweatpants:grey",
  "wide-jeans:black",
  "sneakers:black",
  "loafers:black",
  "cardigan:beige",
  "blazer:black",
  "scarf:blue",
  "puffer:black",
  "shoulder-bag:red",
];

test("reported outfits have low complete-look cohesion, not just invalid garment penalties", () => {
  for (const [bad, good] of [
    [overAssembled, street],
    [competing, sporty],
  ]) {
    assert.deepEqual(validity(bad), []);
    const b = intentionalityScores(bad),
      g = intentionalityScores(good);
    assert(b.cohesion < 0.5, JSON.stringify(b));
    assert(b.intentionality < 0.4);
    assert(g.cohesion > b.cohesion + 0.15);
    assert(scoreBreakdown(good).total > scoreBreakdown(bad).total + 0.05);
    assert.equal(
      rank([bad, good], learn([]), "Everyday", { diversity: false })[0].id,
      good.id,
    );
  }
});

test("the same structural problems are penalized after changing garments and colors", () => {
  const changed = look(
    "ribbed-top:cream",
    "wide-jeans:navy",
    "sneakers:grey",
    "light-cardigan:cream",
    "blazer:navy",
    "scarf:olive",
  );
  const simpler = look("ribbed-top:cream", "wide-jeans:navy", "sneakers:grey");
  assert(
    intentionalityScores(changed).cohesion <
      intentionalityScores(simpler).cohesion - 0.15,
  );
  const colors = look(
    "knit:olive",
    "sweatpants:burgundy",
    "puffer:grey",
    "sneakers:grey",
    "scarf:burgundy",
  );
  assert(intentionalityScores(colors).cohesion < 0.5);
});

test("direction follows occasion and learned taste before generating recipe-led looks", () => {
  assert.equal(directionOrder({}, "Work")[0].id, "polished casual");
  assert.equal(directionOrder({}, "Comfy")[0].id, "sporty casual");
  assert.equal(
    directionOrder({ weights: { direction_edgy: 1, edgy: 1 } }, "Everyday")[0]
      .id,
    "edgy",
  );
  for (const occasion of ["Work", "Comfy", "Date"]) {
    const candidates = generate(wardrobe, { occasion });
    assert(candidates.length);
    for (const o of candidates) {
      assert(DIRECTIONS.some((d) => d.id === o.aestheticDirection));
      assert(o.itemIds.includes(o.heroItemId));
      assert(o.generationFormula && o.outfitArchetype);
      assert.equal(o.occasion, occasion);
    }
  }
  const best = (occasion) =>
    rank(generate(wardrobe, { occasion }), learn([]), occasion, {
      diversity: false,
    })[0];
  assert.notEqual(best("Work").id, best("Comfy").id);
});

test("aesthetic generation defaults to three pieces and every optional piece earns its place", () => {
  const candidates = generate(wardrobe);
  assert(candidates.some((o) => o.itemIds.length === 3));
  for (const o of candidates) {
    for (const id of o.itemIds.filter((id) =>
      ["outerwear", "midlayer", "accessory"].includes(BY_ID[id].category),
    )) {
      const without = { ...o, itemIds: o.itemIds.filter((x) => x !== id) };
      assert(
        composition(o).quality - composition(without).quality >= 0.018 - 1e-9,
        `${id} did not earn its place in ${o.id}`,
      );
    }
  }
  const simple = annotateLook(
    look("crew-tee:white", "trousers:black", "sneakers:white"),
  );
  simple.colorStrategy = "neutral-accent";
  assert(additionValue(simple, BY_ID["shoulder-bag:black"]) < 0.018);
  assert(additionValue(simple, BY_ID["shoulder-bag:red"]) >= 0.018);
  // A visually useful accent is still allowed; minimal does not mean always bare.
  const weather = { lowC: 27, highC: 30, comfort: "default" };
  const summer = look(
    "crew-tee:white",
    "cropped-trousers:black",
    "sneakers:white",
  );
  summer.colorStrategy = "neutral-accent";
  assert(
    additionValue(annotateLook(summer), BY_ID["shoulder-bag:red"]) >= 0.018,
  );
  assert.match(
    finishingTouch(summer, [...summer.itemIds, "shoulder-bag:red"], weather),
    /your red/,
  );
});

test("shoes complete a style and ground volume rather than merely filling a slot", () => {
  const polished = [BY_ID["button-shirt:white"], BY_ID["trousers:black"]];
  const score = (base, shoe, direction) =>
    shoeCompatibility([...base, BY_ID[shoe]], direction);
  assert(
    score(polished, "loafers:black", "polished casual") >
      score(polished, "winter-boots:black", "polished casual"),
  );
  const heavy = [
    BY_ID["hoodie:black"],
    BY_ID["cargo:black"],
    BY_ID["puffer:black"],
  ];
  assert(
    score(heavy, "sneakers:black", "relaxed street") >
      score(heavy, "sandals:black", "relaxed street"),
  );
});

test("weather adapts an existing style seed, strips summer extras and retains winter necessities", () => {
  const owned = [
    ...wardrobe,
    "thermal-top:black",
    "fleece-pants:black",
    "parka:black",
    "winter-boots:black",
    "scarf:black",
    "beanie:black",
    "gloves:black",
    "cotton-shorts:black",
  ];
  const drafts = generate(owned, { occasion: "Comfy" });
  const byId = new Map(drafts.map((o) => [o.id, o]));
  for (const weather of [
    { lowC: -3, highC: 1 },
    { lowC: 28, highC: 30 },
  ]) {
    const adapted = weatherCandidates(owned, learn([]), weather, {}, "Comfy");
    assert(adapted.length);
    for (const o of adapted) {
      assert(byId.has(o.styleSeedId));
      assert.equal(
        o.aestheticDirection,
        byId.get(o.styleSeedId).aestheticDirection,
      );
      assert.deepEqual(validity(o, owned), []);
    }
    const best = rankForWeather(adapted, learn([]), weather, {}, "Comfy")[0];
    assert.equal(best.weatherFit.missing.length, 0);
    if (weather.lowC < 0) {
      assert(best.itemIds.includes("winter-boots:black"));
      for (const archetype of ["scarf", "beanie", "gloves"]) {
        const id = best.itemIds.find(
          (key) => BY_ID[key].archetype === archetype,
        );
        assert(id);
        assert(weatherEssentialIds(best, weather).includes(id));
      }
    } else {
      assert(
        !best.itemIds.some((id) =>
          ["scarf", "puffer", "cardigan"].includes(BY_ID[id].archetype),
        ),
      );
      assert(best.itemIds.length <= 4);
    }
  }
});

test("necessary winter pieces get functional credit but do not erase competing aesthetics", () => {
  const weather = { lowC: 3, highC: 8 };
  const essential = weatherEssentialIds(competing, weather);
  assert(essential.includes("puffer:black"));
  const score = intentionalityScores(competing, "Everyday", essential);
  assert(score.cohesion < 0.5);
  assert(
    score.cohesion <
      intentionalityScores(
        sporty,
        "Everyday",
        weatherEssentialIds(sporty, weather),
      ).cohesion,
  );
});

test("new scores remain bounded; persisted directions and historical feedback still learn", () => {
  const o = annotateLook(street);
  const state = sanitize({
    ...freshState(),
    closet: wardrobe,
    saved: [o],
    generated: [o],
    feedback: [{ ...o, rating: "like", timestamp: "2026-09-24" }],
  });
  assert.equal(state.saved[0].aestheticDirection, o.aestheticDirection);
  assert(state.profile.weights[`direction_${o.aestheticDirection}`] > 0);
  const result = scoreBreakdown(o);
  for (const key of [
    "intentionality",
    "cohesion",
    "shoeCompatibility",
    "directionCoherence",
  ]) {
    assert(result.scores[key] >= 0 && result.scores[key] <= 1);
    assert(result.weights[key] > 0);
  }
});
