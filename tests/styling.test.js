import test from "node:test";
import assert from "node:assert/strict";
import { BY_ID, ARCHETYPES } from "../src/data/catalog.js";
import { generate, validity, rank, learn } from "../src/engine/wardrobe.js";
import { palette, coordinated } from "../src/engine/palette.js";
import {
  weatherCandidates,
  rankForWeather,
  freshWeather,
  weatherNeeds,
} from "../src/engine/weather.js";
const outfit = (...itemIds) => ({ id: [...itemIds].sort().join("|"), itemIds });
const weather = (lowC, highC = lowC) => ({ ...freshWeather(), lowC, highC });
const winter = [
  "crew-tee:black",
  "thermal-top:black",
  "fleece-pants:black",
  "winter-boots:black",
  "parka:black",
  "scarf:red",
  "scarf:black",
  "beanie:black",
  "gloves:black",
];

test("winter never recommends a short sleeve base even with a puffer, warm preference or edited tee guide", () => {
  for (const comfort of ["default", "warm", "cold"]) {
    const w = { ...weather(-3, 8), comfort };
    const options = rankForWeather(weatherCandidates(winter), learn([]), w, {
      "crew-tee:black": { minC: -30, maxC: 40 },
    });
    assert(options.length);
    assert(options.every((o) => !o.itemIds.includes("crew-tee:black")));
    const onlyTees = winter.filter((id) => id !== "thermal-top:black");
    assert.equal(
      rankForWeather(weatherCandidates(onlyTees), learn([]), w).length,
      0,
    );
    assert(
      weatherNeeds(onlyTees, w).missing.some((r) => r.key === "winter-base"),
    );
  }
});
test("a knit midlayer can warm a long sleeve base but cannot rescue short sleeves in winter", () => {
  const base = [
    "long-sleeve:black",
    "cardigan:black",
    ...winter.filter(
      (id) => !["crew-tee:black", "thermal-top:black"].includes(id),
    ),
  ];
  const options = rankForWeather(
    weatherCandidates(base),
    learn([]),
    weather(3, 10),
  );
  assert(options.length);
  assert(options.every((o) => o.itemIds.includes("cardigan:black")));
});
test("one outer shell only, while cardigan plus a long coat remains valid", () => {
  const basic = [
    "thermal-top:black",
    "fleece-pants:black",
    "winter-boots:black",
  ];
  for (const jacket of [
    "fleece-jacket:black",
    "vest:black",
    "cropped-jacket:black",
    "short-wool-jacket:black",
  ]) {
    assert(validity(outfit(...basic, jacket, "wool-coat:black")).length);
    const owned = [...basic, jacket, "wool-coat:black"];
    assert(
      generate(owned).every(
        (o) =>
          !(
            o.itemIds.includes(jacket) && o.itemIds.includes("wool-coat:black")
          ),
      ),
    );
  }
  assert.deepEqual(
    validity(outfit(...basic, "cardigan:black", "wool-coat:black")),
    [],
  );
});
test("recommendations prefer up to three colors and a single tonal family including accessories", () => {
  const tonal = outfit(
    "knit:cream",
    "trousers:brown",
    "loafers:brown",
    "scarf:camel",
  );
  const mixed = outfit(
    "knit:red",
    "trousers:blue",
    "loafers:black",
    "scarf:olive",
  );
  assert(palette(tonal).cohesive);
  assert.equal(palette(tonal).colors.length, 3);
  assert.deepEqual(coordinated([mixed, tonal]), [tonal, mixed]);
  assert.equal(rank([mixed, tonal], learn([]))[0].id, tonal.id);
  const fallback = coordinated([mixed]);
  assert.equal(fallback.length, 1);
  assert.match(palette(fallback[0]).label, /Expressive palette/);
});
test("winter accessory variants are matched to the outfit without dropping required warmth", () => {
  const options = rankForWeather(
    weatherCandidates(winter),
    learn([]),
    weather(-3, 1),
  );
  assert(options.length);
  const best = options[0];
  assert.equal(best.weatherFit.missing.length, 0);
  assert(palette(best).colors.length <= 3);
  assert(best.itemIds.includes("scarf:black"));
  for (const key of ["beanie", "gloves"])
    assert(best.itemIds.some((id) => BY_ID[id].archetype === key));
});
test("expanded pieces have categories, illustrations and useful thermal guides", () => {
  for (const key of [
    "cashmere-knit",
    "flannel-shirt",
    "ribbed-top",
    "long-cardigan",
    "wool-trousers",
    "thermal-leggings",
    "pleated-skirt",
    "cotton-shorts",
    "cropped-jacket",
    "short-wool-jacket",
    "chelsea-boots",
    "crossbody-bag",
  ]) {
    const item = BY_ID[`${key}:olive`];
    assert(ARCHETYPES.some((a) => a.key === key));
    assert.equal(item.assetKey, "extra-vector");
    if (item.category !== "accessory") assert(item.thermal.active);
  }
});
