import test from "node:test";
import assert from "node:assert/strict";
import {
  generate,
  rank,
  learn,
  swapCandidates,
} from "../src/engine/wardrobe.js";
import { palette } from "../src/engine/palette.js";
import {
  weatherCandidates,
  rankForWeather,
  freshWeather,
} from "../src/engine/weather.js";
import { sanitize, freshState } from "../src/services/storage.js";
const outfit = (...itemIds) => ({ id: [...itemIds].sort().join("|"), itemIds });
test("red and burgundy can be a tonal palette in generation, ranking, swaps and saved history", () => {
  const tonal = outfit("knit:red", "trousers:burgundy", "loafers:black");
  assert(palette(tonal).score > 0.8);
  assert.equal(rank([tonal])[0].id, tonal.id);
  assert(generate(tonal.itemIds).some((o) => o.id === tonal.id));
  const original = outfit("knit:red", "trousers:black", "loafers:black");
  assert(
    swapCandidates(original, "trousers:black", [
      ...original.itemIds,
      "trousers:burgundy",
    ]).some((o) => o.id === tonal.id),
  );
  const state = sanitize({
    ...freshState(),
    closet: tonal.itemIds,
    saved: [tonal],
  });
  assert.equal(rank(state.saved)[0].id, tonal.id);
});
test("winter protection is not dropped because the only scarf is another shade of red", () => {
  const weather = { ...freshWeather(), lowC: -3, highC: 1 };
  const closet = [
    "thermal-top:burgundy",
    "fleece-pants:black",
    "winter-boots:black",
    "parka:black",
    "scarf:red",
    "beanie:black",
    "gloves:black",
  ];
  const candidates = weatherCandidates(closet, learn([]), weather);
  const best = rankForWeather(candidates, learn([]), weather)[0];
  assert(best);
  assert(
    best.itemIds.includes("scarf:red") &&
      best.itemIds.includes("thermal-top:burgundy"),
  );
  assert.equal(best.weatherFit.missing.length, 0);
});
