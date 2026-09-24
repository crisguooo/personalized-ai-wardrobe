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
  weatherNeeds,
} from "../src/engine/weather.js";
import { weatherBand } from "../src/data/thermal.js";
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
  "long-sleeve:white",
  "light-cardigan:grey",
  "fleece-jacket:beige",
  "fleece-pants:black",
  "long-puffer:black",
  "winter-boots:black",
  "denim-shorts:blue",
  "sandals:black",
  "cropped-trousers:beige",
  "beanie:grey",
  "gloves:black",
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
  assert(
    cold.itemIds.some(
      (id) =>
        BY_ID[id].category === "outerwear" &&
        BY_ID[id].thermal.winterLevel >= 1,
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
  assert.equal(guideFor(BY_ID["crew-tee:black"], overrides).minC, 27);
});
test("a limited closet gets an honest warmth mismatch instead of invented items", () => {
  const only = weatherCandidates([
    "crew-tee:white",
    "mini-skirt:black",
    "mary-janes:black",
  ]);
  const cold = { ...weather, lowC: -5, highC: 3 };
  const best = rankForWeather(only, learn([]), cold)[0];
  assert.match(weatherReason(best, cold), /incomplete.*insulated winter coat/);
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

test("tee baseline and two-degree changes increase required coverage", () => {
  assert.deepEqual(
    [
      BY_ID["crew-tee:white"].thermal.minC,
      BY_ID["crew-tee:white"].thermal.maxC,
    ],
    [27, 30],
  );
  const outfit = {
    itemIds: ["crew-tee:white", "denim-shorts:blue", "sandals:black"],
  };
  const at = (t) => ({ ...weather, lowC: t, highC: t });
  assert.equal(weatherFit(outfit, at(29)).penalty, 0);
  assert(
    weatherNeeds(outfit.itemIds, at(27)).missing.some(
      (r) => r.key === "bottoms",
    ),
  );
  assert(
    weatherNeeds(outfit.itemIds, at(25)).missing.some(
      (r) => r.key === "sleeves",
    ),
  );
  assert(
    weatherNeeds(outfit.itemIds, at(23)).missing.some(
      (r) => r.label === "Full-length bottoms",
    ),
  );
  assert(
    weatherNeeds(outfit.itemIds, at(15)).missing.some((r) => r.key === "coat"),
  );
  for (const t of [2, 5, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30])
    assert.deepEqual(weatherBand(t), weatherBand(toC(fromC(t, "F"), "F")));
});
test("winter thresholds name specific missing equipment and ignore cosmetic accessories", () => {
  const summer = [
    "crew-tee:white",
    "denim-shorts:blue",
    "sandals:black",
    "earrings:grey",
    "belt:black",
    "sunglasses:black",
  ];
  const missing = (t) =>
    weatherNeeds(summer, { ...weather, lowC: t, highC: t }).missing;
  assert.equal(missing(8).find((r) => r.key === "coat").label, "Warm coat");
  assert.equal(missing(7.9).find((r) => r.key === "coat").label, "Winter coat");
  assert(missing(4).some((r) => r.key === "lined-bottoms"));
  assert(missing(1).some((r) => r.key === "hands"));
  assert(missing(-1).some((r) => r.label === "Insulated winter coat"));
  assert(missing(-1).some((r) => r.label === "Insulated winter boots"));
  assert(
    !weatherNeeds(
      summer,
      { ...weather, lowC: 7, highC: 7 },
      { "crew-tee:white": { minC: -20, maxC: 30 } },
    ).missing.every((r) => r.key !== "coat"),
  );
});
test("full winter gear is composed together and passes coverage rules below freezing", () => {
  const cold = { ...weather, lowC: -3, highC: 1 };
  const full = [
    "thermal-top:black",
    "fleece-jacket:beige",
    "fleece-pants:black",
    "parka:black",
    "winter-boots:black",
    "scarf:grey",
    "beanie:grey",
    "gloves:black",
  ];
  assert.equal(weatherNeeds(full, cold).missing.length, 0);
  const options = weatherCandidates(full);
  const best = rankForWeather(options, learn([]), cold)[0];
  assert.equal(best.weatherFit.missing.length, 0);
  assert(
    best.itemIds.includes("scarf:grey") &&
      best.itemIds.includes("beanie:grey") &&
      best.itemIds.includes("gloves:black"),
  );
  assert.deepEqual(validity(best, full), []);
  assert(
    validity({ itemIds: [...best.itemIds, "cap:black"] }).includes(
      "Too many accessories in the same slot",
    ),
  );
});

test("changing a bottom temperature ceiling changes the whole outfit heat estimate", () => {
  const outfit = {
    itemIds: ["long-sleeve:white", "straight-jeans:blue", "sneakers:white"],
  };
  const mild = { ...weather, lowC: 22, highC: 23 };
  const original = weatherFit(outfit, mild);
  const adjusted = weatherFit(outfit, mild, {
    "straight-jeans:blue": { minC: 23, maxC: 24 },
  });
  assert(adjusted.hotGap > original.hotGap);
});
