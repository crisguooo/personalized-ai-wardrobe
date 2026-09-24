import test from "node:test";
import assert from "node:assert/strict";
import { BY_ID } from "../src/data/catalog.js";
import { learn, validity } from "../src/engine/wardrobe.js";
import {
  freshWeather,
  toC,
  fromC,
  validRange,
  rankForWeather,
  weatherCandidates,
  weatherFit,
  weatherReason,
  guideFor,
} from "../src/engine/weather.js";
import { freshState, sanitize } from "../src/services/storage.js";
import {
  SETUP_GROUPS,
  freshOnboarding,
  nextGroup,
} from "../src/engine/onboarding.js";
const ids = [
  "crew-tee:white",
  "knit:beige",
  "trousers:black",
  "sneakers:white",
  "tall-boots:black",
  "wool-coat:grey",
  "trench:beige",
  "puffer:black",
  "scarf:grey",
];
const weather = { ...freshWeather(), lowC: 9, highC: 17 };
const candidates = weatherCandidates(ids);
const ranked = (w = weather, overrides = {}) =>
  rankForWeather(candidates, learn([]), w, overrides);

test("seasonal pieces are offered first without blocking essential setup", () => {
  const draft = freshOnboarding();
  const group = SETUP_GROUPS[draft.group];
  assert(group.optional);
  for (const key of ["knit", "trench", "tall-boots", "puffer", "scarf"])
    assert(group.items.includes(key));
  assert.equal(nextGroup(draft).group, 0);
});
test("Celsius and Fahrenheit encode the same weather, including negative and zero values", () => {
  assert.equal(toC(32, "F"), 0);
  assert.equal(toC(-40, "F"), -40);
  assert(Math.abs(toC(fromC(9, "F"), "F") - 9) < 1e-9);
  assert(validRange(0, 0));
  for (const pair of [
    [null, 17],
    [18, 9],
    [-41, 0],
    [1, 51],
    [NaN, 3],
  ])
    assert(!validRange(...pair));
  assert.equal(
    ranked()[0].id,
    ranked({
      ...weather,
      unit: "F",
      lowC: toC(48.2, "F"),
      highC: toC(62.6, "F"),
    })[0].id,
  );
});
test("9–17 degree recommendation covers the low and removes layers at the high", () => {
  const best = ranked()[0];
  assert(best.itemIds.some((id) => BY_ID[id].category === "outerwear"));
  assert(best.weatherFit.remove.length > 0);
  assert(
    best.weatherFit.remove.every(
      (id) => best.itemIds.includes(id) && BY_ID[id].thermal.removable,
    ),
  );
  assert.match(weatherReason(best, weather), /9°C.*remove.*17°C/);
  assert(
    best.weatherFit.penalty <
      weatherFit(
        { itemIds: ["crew-tee:white", "trousers:black", "sneakers:white"] },
        weather,
      ).penalty,
  );
  for (const outfit of candidates) assert.deepEqual(validity(outfit, ids), []);
});
test("hot days avoid heavy layers and cold personal experience changes the recommendation", () => {
  const summer = ranked({ ...weather, lowC: 23, highC: 27 })[0];
  assert(!summer.itemIds.some((id) => BY_ID[id].category === "outerwear"));
  const personal = { ...weather, comfort: "custom", coatBelowC: 17 };
  const cold = ranked(personal)[0];
  assert.notEqual(cold.id, ranked()[0].id);
  assert(cold.itemIds.includes("knit:beige"));
  assert(
    cold.itemIds.some((id) =>
      ["puffer", "wool-coat"].includes(BY_ID[id].archetype),
    ),
  );
  assert.match(weatherReason(cold, personal), /big coat at or below 17°C/);
  assert(
    !cold.weatherFit.remove.some(
      (id) => BY_ID[id].category === "outerwear" && BY_ID[id].warmth >= 3,
    ),
  );
});
test("each item has a guide and changing one owned variant alters weather suitability", () => {
  const outfit = {
    itemIds: ["crew-tee:white", "trousers:black", "sneakers:white"],
  };
  const overrides = { "crew-tee:white": { minC: 5, maxC: 30 } };
  assert(
    weatherFit(outfit, weather, overrides).penalty <
      weatherFit(outfit, weather).penalty,
  );
  assert.equal(guideFor(BY_ID["crew-tee:black"], overrides).minC, 17);
});
test("a limited closet gets an honest warmth mismatch instead of invented items", () => {
  const only = weatherCandidates([
    "crew-tee:white",
    "mini-skirt:black",
    "mary-janes:black",
  ]);
  const cold = { ...weather, lowC: -5, highC: 3 };
  const best = rankForWeather(only, learn([]), cold)[0];
  assert.match(weatherReason(best, cold), /may still feel too cold/);
  assert.equal(best.itemIds.length, 3);
});
test("weather, personal experience and per-piece guides survive persistence; invalid data is discarded", () => {
  const state = sanitize({
    ...freshState(),
    closet: ids,
    setupPhase: "weather",
    weather: {
      ...weather,
      unit: "F",
      comfort: "custom",
      coatBelowC: 17,
      confirmed: true,
    },
    thermalOverrides: {
      "crew-tee:white": { minC: 14, maxC: 28 },
      unknown: { minC: 0, maxC: 1 },
      "knit:beige": { minC: 30, maxC: 2 },
    },
  });
  assert.equal(state.weather.coatBelowC, 17);
  assert.equal(state.weather.unit, "F");
  assert.equal(state.setupPhase, "weather");
  assert(state.weather.confirmed);
  assert.deepEqual(Object.keys(state.thermalOverrides), ["crew-tee:white"]);
  assert.equal(
    sanitize({ ...state, weather: { lowC: 20, highC: 0 } }).weather.lowC,
    null,
  );
});
