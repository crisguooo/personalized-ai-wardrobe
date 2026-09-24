import test from "node:test";
import assert from "node:assert/strict";
import {
  SETUP_GROUPS,
  freshOnboarding,
  normalizeOnboarding,
  hasEssentials,
  canStartEarly,
  nextGroup,
} from "../src/engine/onboarding.js";
import { createStorage, freshState } from "../src/services/storage.js";
import { BY_ID } from "../src/data/catalog.js";

const eight = [
  "crew-tee:white",
  "crew-tee:black",
  "fitted-tee:black",
  "wide-jeans:blue",
  "trousers:black",
  "trousers:beige",
  "sneakers:white",
  "loafers:black",
];
test("eight owned variants unlock early start only when all essentials exist", () => {
  assert(canStartEarly(eight));
  assert(!canStartEarly(eight.slice(0, 7)));
  assert(
    !canStartEarly([...eight.slice(0, 6), "crew-tee:navy", "crew-tee:grey"]),
  );
  assert(!canStartEarly([...eight.slice(0, 7), eight[0]]));
  assert(!canStartEarly([...eight.slice(0, 7), "unknown"]));
});
test("essentials precede optional groups and do not require layers or accessories", () => {
  assert.deepEqual(
    SETUP_GROUPS.slice(0, 3).map((g) => g.key),
    ["tops", "bottoms", "shoes"],
  );
  assert(SETUP_GROUPS.slice(3).every((g) => g.optional));
  assert(hasEssentials(["crew-tee:white", "trousers:black", "sneakers:white"]));
  assert(
    SETUP_GROUPS.every((g) => g.items.every((key) => BY_ID[`${key}:white`])),
  );
  assert.equal(
    nextGroup({ ...freshOnboarding(), group: 5, step: "fits" }).step,
    "ready",
  );
});
test("onboarding draft and exact fit/color variants survive refresh without completing onboarding", () => {
  const draft = {
    step: "colors",
    group: 0,
    selections: { tops: ["crew-tee", "fitted-tee"] },
    colorIndex: 1,
    resumeStep: "fits",
  };
  const state = {
    ...freshState(),
    closet: eight.slice(0, 3),
    onboarding: draft,
  };
  let raw;
  const adapter = createStorage({
    getItem: () => raw,
    setItem: (_, value) => (raw = value),
  });
  adapter.save(state);
  const restored = adapter.load().state;
  assert.equal(restored.onboarded, false);
  assert.deepEqual(restored.closet, state.closet);
  assert.equal(restored.onboarding.step, "colors");
  assert.equal(restored.onboarding.colorIndex, 1);
  assert.deepEqual(restored.onboarding.selections.tops, [
    "crew-tee",
    "fitted-tee",
  ]);
});
test("legacy returning users keep completion; malformed drafts recover safely", () => {
  let raw = JSON.stringify({
    ...freshState(),
    onboarded: true,
    onboarding: undefined,
    closet: eight,
  });
  const restored = createStorage({ getItem: () => raw }).load().state;
  assert(restored.onboarded);
  assert.deepEqual(restored.closet, eight);
  const clean = normalizeOnboarding({
    step: "colors",
    group: 500,
    colorIndex: -2,
    selections: { accessories: ["invalid"] },
  });
  assert.equal(clean.group, 5);
  assert.equal(clean.step, "fits");
  assert.equal(clean.colorIndex, 0);
  assert.deepEqual(normalizeOnboarding(null), freshOnboarding());
});
