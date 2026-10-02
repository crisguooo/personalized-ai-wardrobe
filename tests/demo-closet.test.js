import test from "node:test";
import assert from "node:assert/strict";
import { CATALOG, BY_ID, ARCHETYPES, COLORS } from "../src/data/catalog.js";
import { sampleDemoCloset } from "../src/engine/demo-closet.js";
import { learn, validity } from "../src/engine/wardrobe.js";
import {
  freshWeather,
  weatherCandidates,
  weatherFit,
} from "../src/engine/weather.js";

function seededRandom(seed) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

test("100 random demo pieces cover seasonal types, accessories and every color", () => {
  for (let seed = 1; seed <= 20; seed++) {
    const ids = sampleDemoCloset([], seededRandom(seed));
    assert.equal(ids.length, 100);
    assert.equal(new Set(ids).size, 100);
    const items = ids.map((id) => BY_ID[id]);
    assert.equal(
      new Set(items.map((i) => i.archetype)).size,
      ARCHETYPES.length,
    );
    assert.equal(
      new Set(items.map((i) => i.color)).size,
      Object.keys(COLORS).length,
    );
    assert.equal(new Set(items.map((i) => i.category)).size, 6);
  }
});

test("demo sampling varies between runs and never duplicates or mutates owned items", () => {
  const owned = sampleDemoCloset([], seededRandom(42));
  const before = [...owned];
  const next = sampleDemoCloset(owned, seededRandom(84));
  assert.equal(next.length, 100);
  assert.ok(next.every((id) => !owned.includes(id)));
  assert.deepEqual(owned, before);
  assert.notDeepEqual(owned, sampleDemoCloset([], seededRandom(43)));
});

test("demo sampling adds only remaining pieces when fewer than 100 are available", () => {
  const ids = CATALOG.map((item) => item.id);
  for (const remaining of [99, 1, 0]) {
    const owned = ids.slice(remaining);
    const added = sampleDemoCloset(owned, seededRandom(7));
    assert.deepEqual(added.sort(), ids.slice(0, remaining).sort());
  }
});

// Regression: adding all 1,008 variants previously exhausted the browser while
// adapting hundreds of seeds across every thermally identical color variant.
test(
  "full-color demo closets produce bounded weather-safe looks without mutating ownership",
  { timeout: 30000 },
  () => {
    const ids = CATALOG.map((item) => item.id);
    const before = [...ids];
    for (const [lowC, highC] of [
      [9, 17],
      [-4, 2],
      [28, 32],
    ]) {
      const weather = { ...freshWeather(), lowC, highC };
      const looks = weatherCandidates(ids, learn([]), weather);
      assert.ok(looks.length > 0 && looks.length <= 320);
      assert.ok(
        looks.some((look) => weatherFit(look, weather).missing.length === 0),
      );
      for (const look of looks) assert.deepEqual(validity(look, ids), []);
    }
    assert.deepEqual(ids, before);
  },
);
