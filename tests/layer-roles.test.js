import test from "node:test";
import assert from "node:assert/strict";
import { BY_ID, CATALOG } from "../src/data/catalog.js";
import {
  layerMetadata,
  assignLayers,
  canFillLayer,
  LAYER_STRUCTURES,
} from "../src/data/layers.js";
import { validity, physicalRules } from "../src/engine/compatibility.js";
import {
  generate,
  rank,
  swapCandidates,
} from "../src/engine/recommendations.js";
import {
  weatherCandidates,
  rankForWeather,
  freshWeather,
  weatherNeeds,
} from "../src/engine/weather.js";
import { visibleColors } from "../src/engine/color-engine.js";
import { scoreBreakdown } from "../src/engine/scoring.js";
import { learn } from "../src/engine/profile.js";
const outfit = (...itemIds) => ({ itemIds, id: [...itemIds].sort().join("|") });
const items = (o) => o.itemIds.map((id) => BY_ID[id]);
const base = ["fitted-tee:black", "wide-jeans:black", "sneakers:white"];

test("cardigan construction determines role while closet categories and IDs stay stable", () => {
  assert.equal(BY_ID["long-cardigan:black"].category, "midlayer");
  assert.equal(BY_ID["long-cardigan:black"].layerRole, "outerLayer");
  assert.equal(BY_ID["long-cardigan:black"].outerwearRole, "dominant");
  assert.deepEqual(BY_ID["light-cardigan:black"].layerRoles, ["midLayer"]);
  assert.deepEqual(BY_ID["cardigan:black"].layerRoles, [
    "midLayer",
    "lightOuterLayer",
  ]);
  for (const key of [
    "bomber",
    "leather-jacket",
    "denim-jacket",
    "blazer",
    "puffer",
    "wool-coat",
    "parka",
  ])
    assert.equal(BY_ID[`${key}:black`].layerRole, "outerLayer");
  for (const i of CATALOG)
    assert.deepEqual(i.layerRoles, layerMetadata(i).layerRoles);
});

test("anonymous construction variants change role without any name or color lookup", () => {
  const soft = {
    category: "midlayer",
    intendedUse: "layering",
    structure: "soft",
    fit: "regular",
    volume: 2,
    length: "hip",
    bulk: 3,
  };
  assert.equal(layerMetadata({ ...soft, bulk: 2 }).layerRole, "midLayer");
  assert.equal(layerMetadata({ ...soft, fit: "fitted" }).layerRole, "midLayer");
  for (const changed of [
    { length: "long" },
    { bulk: 4 },
    { fit: "oversized" },
    { volume: 4 },
    { structure: "structured" },
  ])
    assert.equal(
      layerMetadata({ ...soft, ...changed }).layerRole,
      "outerLayer",
    );
  assert.equal(
    layerMetadata({
      ...soft,
      category: "outerwear",
      intendedUse: "layering",
      bulk: 1,
    }).layerRole,
    "midLayer",
  );
});

test("two dominant outer pieces are rejected in either order, irrespective of generous capacity", () => {
  for (const pair of [
    ["long-cardigan:black", "bomber:red"],
    ["long-cardigan:cream", "leather-jacket:black"],
    ["blazer:navy", "bomber:beige"],
    ["denim-jacket:blue", "leather-jacket:brown"],
    ["puffer:black", "long-cardigan:grey"],
  ]) {
    for (const order of [pair, [...pair].reverse()]) {
      const o = outfit(...base, ...order);
      assert(validity(o).some((e) => e.includes("one dominant outer")));
      assert.equal(
        rank([o]).length,
        0,
        "historical looks cannot bypass validation",
      );
      const anonymous = items(o).map((i) => ({
        ...i,
        id: `renamed-${i.id}`,
        name: "Anonymous garment",
        key: undefined,
        archetype: undefined,
        layerCapacity: 5,
      }));
      assert(physicalRules(anonymous).length);
    }
  }
});

test("explicit slim mid + roomy coat relationship checks both capacity and length", () => {
  const valid = items(
    outfit(...base, "light-cardigan:cream", "wool-coat:camel"),
  );
  assert.deepEqual(physicalRules(valid), []);
  assert.equal(assignLayers(valid).structure, "base + mid + outer");
  assert(
    physicalRules(
      valid.map((i) =>
        i.id === "wool-coat:camel" ? { ...i, layerCapacity: 1 } : i,
      ),
    ).length,
  );
  assert.deepEqual(
    validity(outfit(...base, "cardigan:cream", "wool-coat:camel")),
    [],
  );
  // Both remain in the same closet category, but occupy distinct effective slots.
  assert.deepEqual(
    validity(outfit(...base, "light-cardigan:cream", "long-cardigan:black")),
    [],
  );
});

test("all four structures have explicit role assignments, including a regular cardigan as a light outer", () => {
  const looks = [
    outfit(...base),
    outfit(...base, "light-cardigan:cream"),
    outfit(...base, "long-cardigan:black"),
    outfit(...base, "light-cardigan:cream", "wool-coat:camel"),
  ];
  assert.deepEqual(
    looks.map((o) => assignLayers(items(o)).structure),
    LAYER_STRUCTURES.map((p) => p.id),
  );
  const lightOuter = assignLayers(
    items(outfit(...base, "cardigan:cream")),
    "base + outer",
  );
  assert.equal(lightOuter.outer.id, "cardigan:cream");
  assert.deepEqual(lightOuter.errors, []);
});

test("generation fills the selected structure, and required long cardigans compete with jackets", () => {
  const owned = [
    ...base,
    "light-cardigan:cream",
    "cardigan:beige",
    "long-cardigan:black",
    "bomber:red",
    "leather-jacket:black",
    "wool-coat:camel",
  ];
  for (const requiredId of [
    undefined,
    "long-cardigan:black",
    "bomber:red",
    "light-cardigan:cream",
  ]) {
    const generated = generate(owned, { requiredId });
    assert(generated.length);
    for (const o of generated) {
      const assigned = assignLayers(items(o), o.generationLayerStructure);
      assert.deepEqual(validity(o, owned), []);
      assert.equal(assigned.structure, o.generationLayerStructure);
      assert.equal(o.layerStructure, o.generationLayerStructure);
      if (requiredId) assert(o.itemIds.includes(requiredId));
      if (assigned.mid) assert(canFillLayer(assigned.mid, "midLayer"));
      if (assigned.outer) assert(canFillLayer(assigned.outer, "outerLayer"));
      if (o.itemIds.includes("long-cardigan:black"))
        assert.equal(assigned.outer.id, "long-cardigan:black");
    }
  }
});

test("swaps use effective layer slots and cannot place a long cardigan beneath an existing bomber", () => {
  const o = outfit(...base, "light-cardigan:cream", "bomber:red");
  assert.deepEqual(validity(o), []);
  const owned = [
    ...o.itemIds,
    "long-cardigan:black",
    "cardigan:beige",
    "wool-coat:camel",
  ];
  assert(
    swapCandidates(o, "light-cardigan:cream", owned).every(
      (x) => !x.itemIds.includes("long-cardigan:black"),
    ),
  );
  const shellSwaps = swapCandidates(o, "bomber:red", owned);
  assert(shellSwaps.some((x) => x.itemIds.includes("long-cardigan:black")));
  assert(
    shellSwaps.every(
      (x) => !validity(x).length && x.itemIds.includes("light-cardigan:cream"),
    ),
  );
});

test("weather replaces competing outer layers and keeps necessary protection", () => {
  const owned = [
    "thermal-top:black",
    "fleece-pants:black",
    "winter-boots:black",
    "long-cardigan:black",
    "bomber:red",
    "parka:black",
    "scarf:grey",
    "beanie:grey",
    "gloves:black",
  ];
  const weather = { ...freshWeather(), lowC: -3, highC: 1 };
  const candidates = weatherCandidates(owned, learn([]), weather);
  const ranked = rankForWeather(candidates, learn([]), weather);
  assert(ranked.length);
  assert.equal(ranked[0].weatherFit.missing.length, 0);
  assert(ranked[0].itemIds.includes("parka:black"));
  for (const o of candidates) {
    assert.deepEqual(validity(o), []);
    assert(items(o).filter((i) => i.outerwearRole === "dominant").length <= 1);
  }
  const mild = { ...freshWeather(), lowC: 14, highC: 18 };
  assert(
    !weatherNeeds([...base, "long-cardigan:black"], mild).missing.some(
      (r) => r.key === "coat",
    ),
  );
});

test("color visibility and score diagnostics recognize long cardigans as outer layers", () => {
  const bare = outfit(...base);
  const dressed = outfit(
    ...base,
    "light-cardigan:cream",
    "long-cardigan:black",
  );
  const before = visibleColors(items(bare)),
    after = visibleColors(items(dressed));
  const area = (colors, id) => colors.find((c) => c.itemId === id).area;
  assert(area(after, "wide-jeans:black") < area(before, "wide-jeans:black"));
  assert(
    area(after, "light-cardigan:cream") <
      BY_ID["light-cardigan:cream"].colorSpec.area,
  );
  assert.equal(
    area(after, "long-cardigan:black"),
    BY_ID["long-cardigan:black"].colorSpec.area,
  );
  const debug = scoreBreakdown(dressed);
  assert(debug.valid);
  assert.equal(debug.layerAssignments.outer, "long-cardigan:black");
  assert.equal(debug.layerAssignments.mid, "light-cardigan:cream");
});
