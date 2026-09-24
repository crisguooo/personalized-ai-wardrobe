import test from "node:test";
import assert from "node:assert/strict";
import { BY_ID } from "../src/data/catalog.js";
import { palette } from "../src/engine/palette.js";
import { learn, rank, validity } from "../src/engine/wardrobe.js";
import {
  freshWeather,
  wearableForWeather,
  weatherPool,
  weatherCandidates,
  rankForWeather,
  weatherNeeds,
  weatherFit,
} from "../src/engine/weather.js";
const w = (lowC, highC = lowC) => ({ ...freshWeather(), lowC, highC });
const look = (...itemIds) => ({ id: [...itemIds].sort().join("|"), itemIds });
const owned = [
  "crew-tee:white",
  "tank:black",
  "linen-shirt:beige",
  "long-sleeve:white",
  "knit:beige",
  "thermal-top:black",
  "hoodie:black",
  "denim-shorts:black",
  "linen-trousers:beige",
  "straight-jeans:blue",
  "fleece-pants:black",
  "sandals:black",
  "sneakers:white",
  "winter-boots:black",
  "puffer:black",
  "parka:black",
  "wool-coat:grey",
  "trench:beige",
  "fleece-jacket:black",
  "light-cardigan:beige",
  "scarf:red",
  "beanie:black",
  "gloves:black",
];

test("afternoon removal respects each warm accessory's own upper temperature", () => {
  const outfit = look(
    "thermal-top:black",
    "fleece-pants:black",
    "sneakers:white",
    "short-wool-jacket:camel",
    "scarf:black",
    "beanie:black",
    "gloves:black",
  );
  const fit = weatherFit(outfit, w(5, 10));
  assert(fit.remove.includes("gloves:black"));
  assert(fit.remove.includes("beanie:black"));
});

test("brown, camel and beige share one family without hiding literal swatches", () => {
  const p = palette(
    look("knit:beige", "trousers:brown", "loafers:brown", "wool-coat:camel"),
  );
  assert.equal(p.colors.length, 3);
  assert.equal(p.familyCount, 1);
  assert(p.cohesive);
  assert(p.restrained);
  const layered = palette(
    look(
      "knit:beige",
      "trousers:brown",
      "loafers:black",
      "wool-coat:camel",
      "scarf:red",
    ),
  );
  assert.equal(layered.colors.length, 5);
  assert.equal(layered.familyCount, 3);
  assert(layered.neutralAccent);
  assert(layered.restrained);
});

test("a unified accent palette can outrank alternatives without rejecting warm-cool contrast", () => {
  const unified = look(
    "knit:beige",
    "trousers:brown",
    "loafers:black",
    "shoulder-bag:red",
  );
  const mixed = look(
    "knit:beige",
    "trousers:blue",
    "loafers:black",
    "shoulder-bag:red",
  );
  const competing = look(
    "knit:beige",
    "trousers:olive",
    "loafers:black",
    "shoulder-bag:red",
  );
  assert(palette(unified).restrained);
  assert(palette(unified).score > palette(mixed).score);
  assert(rank([mixed, competing], learn([])).length === 2);
  for (const options of [
    {},
    { exploration: true },
    { diversity: false },
    { limit: 1 },
  ]) {
    assert.equal(
      rank([mixed, unified, competing], learn([]), "Everyday", options)[0].id,
      unified.id,
    );
  }
  assert.equal(rank([mixed], learn([]))[0].id, mixed.id); // no invented wardrobe
});

test("winter boots are strictly below 5°C; regular puffer spans -5 to 10°C", () => {
  const boots = BY_ID["winter-boots:black"],
    puffer = BY_ID["puffer:black"];
  assert(wearableForWeather(boots, w(4.9)));
  for (const t of [5, 10, 20, 30]) assert(!wearableForWeather(boots, w(t)));
  for (const t of [-5, 0, 10]) assert(wearableForWeather(puffer, w(t)));
  for (const t of [-5.1, 10.1, 25]) assert(!wearableForWeather(puffer, w(t)));
  assert(wearableForWeather(BY_ID["parka:black"], w(-12)));
  assert(
    wearableForWeather(puffer, { ...w(17), comfort: "custom", coatBelowC: 17 }),
  );
  assert(
    wearableForWeather(boots, w(7), {
      "winter-boots:black": { minC: -25, maxC: 8 },
    }),
  );
});

test("seasonal validation constrains the adapted complete looks rather than filling a pool with winter/summer mismatches", () => {
  const cold = w(-3, 3),
    hot = w(28, 31);
  const coldPool = weatherPool(owned, cold);
  assert(!coldPool.includes("crew-tee:white"));
  assert(!coldPool.includes("linen-shirt:beige"));
  const hotPool = weatherPool(owned, hot);
  for (const id of [
    "winter-boots:black",
    "puffer:black",
    "parka:black",
    "scarf:red",
    "beanie:black",
    "gloves:black",
    "knit:beige",
    "thermal-top:black",
    "fleece-pants:black",
  ])
    assert(!hotPool.includes(id), id);
  for (const forecast of [cold, w(5, 10), w(11, 17), w(23, 26), hot]) {
    const pool = weatherPool(owned, forecast);
    const candidates = weatherCandidates(owned, learn([]), forecast);
    assert(candidates.length);
    assert(candidates.every((o) => o.itemIds.every((id) => pool.includes(id))));
    const ranked = rankForWeather(candidates, learn([]), forecast);
    assert(ranked.length);
    assert(
      ranked.every((o) =>
        o.itemIds.every((id) => wearableForWeather(BY_ID[id], forecast)),
      ),
    );
    assert.deepEqual(validity(ranked[0], owned), []);
  }
});

test("saved/swap candidates cannot bypass seasonal exclusions or winter base requirements", () => {
  const summerScarf = look(
    "crew-tee:white",
    "denim-shorts:black",
    "sandals:black",
    "scarf:red",
  );
  const summerBoots = look(
    "crew-tee:white",
    "denim-shorts:black",
    "winter-boots:black",
  );
  const winterTee = look(
    "crew-tee:white",
    "fleece-pants:black",
    "winter-boots:black",
    "puffer:black",
  );
  assert.equal(
    rankForWeather([summerScarf, summerBoots], learn([]), w(28, 30)).length,
    0,
  );
  assert.equal(rankForWeather([winterTee], learn([]), w(-3, 5)).length, 0);
});

test("a winter-only closet explains summer shortages and never forces winter boots", () => {
  const winterOnly = [
    "knit:beige",
    "fleece-pants:black",
    "winter-boots:black",
    "scarf:red",
  ];
  assert.equal(weatherCandidates(winterOnly, learn([]), w(28, 30)).length, 0);
  const missing = weatherNeeds(winterOnly, w(28, 30)).missing;
  for (const key of ["seasonal-base", "seasonal-bottoms", "seasonal-shoes"])
    assert(missing.some((r) => r.key === key));
  assert(
    !weatherNeeds(winterOnly, w(0, 3)).missing.some(
      (r) => r.key === "seasonal-shoes",
    ),
  );
});
