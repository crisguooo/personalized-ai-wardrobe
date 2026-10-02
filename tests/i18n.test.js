import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import {
  ARCHETYPES,
  COLORS,
  CATEGORIES,
  STARTER_IDS,
} from "../src/data/catalog.js";
import { BRANDS, BRAND_STYLES } from "../src/data/brands.js";
import { SETUP_GROUPS } from "../src/engine/onboarding.js";
import { LABELS, REASONS, learn } from "../src/engine/wardrobe.js";
import { COLOR_STRATEGIES } from "../src/engine/color-engine.js";
import { WEATHER_BANDS } from "../src/data/thermal.js";
import {
  weatherRequirements,
  weatherCandidates,
  weatherReason,
  freshWeather,
  today,
} from "../src/engine/weather.js";
import {
  createStorage,
  freshState,
  STORAGE_KEY,
} from "../src/services/storage.js";
import {
  translate,
  readLocale,
  saveLocale,
  LOCALE_KEY,
} from "../src/i18n/translate.js";

const zh = (message, values) => translate(message, "zh", values);
const translated = (message) =>
  assert.notEqual(zh(message), message, `Missing Chinese: ${message}`);

test("catalog, style, brand, setup, palette and weather labels all have Chinese copy", () => {
  const labels = [
    ...ARCHETYPES.map((a) => a.name),
    ...Object.keys(COLORS),
    ...CATEGORIES.map(([, name]) => name),
    ...BRANDS.map((b) => b.description),
    ...BRAND_STYLES,
    ...SETUP_GROUPS.map((g) => g.title),
    ...Object.values(LABELS),
    ...REASONS,
    ...Object.values(COLOR_STRATEGIES),
    ...WEATHER_BANDS.map(([, name]) => name),
  ];
  for (const temp of [-20, -4, 3, 9, 15, 17, 21, 27, 32]) {
    labels.push(
      ...weatherRequirements(temp, freshWeather()).map((r) => r.label),
    );
  }
  labels.forEach(translated);
});

test("static translated UI messages have no untranslated English fallback", () => {
  const files = [
    "App.jsx",
    ...["pages", "components"].flatMap((dir) =>
      readdirSync(new URL(`../src/${dir}/`, import.meta.url))
        .filter((file) => file.endsWith(".jsx"))
        .map((file) => `${dir}/${file}`),
    ),
  ];
  for (const file of files) {
    const source = readFileSync(
      new URL(`../src/${file}`, import.meta.url),
      "utf8",
    );
    for (const match of source.matchAll(
      /\bt\(\s*("(?:[^"\\]|\\.)*")\s*(?=[,)])/g,
    )) {
      const message = JSON.parse(match[1]);
      if (/[a-z]{2}/i.test(message)) translated(message);
    }
  }
});

test("dynamic counts, color variants, accessible labels and gap reasons translate", () => {
  assert.equal(
    zh("Built from 12 outfit ratings and the 18 pieces in your closet."),
    "根据你的 12 次搭配评价与衣橱里的 18 件单品推荐。",
  );
  assert.equal(
    zh("Select burgundy Long knit cardigan"),
    "选择酒红色长款针织开衫",
  );
  assert.equal(
    zh("Powder-blue classic crew tee added to your closet."),
    "已将粉蓝色经典圆领 T 恤加入衣橱。",
  );
  assert.equal(
    zh(
      "Brings earth tones and wide-leg bottoms to more of the pieces you own.",
    ),
    "为你已有的衣服增添大地色系与阔腿下装的搭配可能。",
  );
  assert.equal(zh("Minimal / Tailored"), "极简 / 利落剪裁");
  assert.equal(zh("Monochromatic / tonal"), "单色 / 同色系");
});

test("locale defaults to browser language, persists independently, and tolerates blocked storage", () => {
  const data = new Map();
  const storage = {
    getItem: (key) => data.get(key),
    setItem: (key, value) => data.set(key, value),
  };
  assert.equal(readLocale(storage, "zh-CN"), "zh");
  assert.equal(readLocale(storage, "en-US"), "en");
  assert.equal(readLocale(storage, "fr"), "en");
  saveLocale(storage, "en");
  assert.equal(readLocale(storage, "zh-CN"), "en");
  const blocked = {
    getItem() {
      throw Error("blocked");
    },
    setItem() {
      throw Error("blocked");
    },
  };
  assert.equal(readLocale(blocked, "zh-TW"), "zh");
  assert.doesNotThrow(() => saveLocale(blocked, "zh"));
  data.set(LOCALE_KEY, "invalid");
  assert.equal(readLocale(storage, "zh-CN"), "zh");
});

test("switching language cannot rewrite wardrobe, saved looks or feedback IDs", () => {
  const data = new Map();
  const storage = {
    getItem: (key) => data.get(key),
    setItem: (key, value) => data.set(key, value),
  };
  const adapter = createStorage(storage);
  const outfit = {
    id: "example",
    itemIds: ["crew-tee:white", "wide-jeans:blue", "sneakers:white"],
  };
  adapter.save({
    ...freshState(),
    closet: STARTER_IDS,
    onboarded: true,
    saved: [outfit],
    feedback: [
      {
        ...outfit,
        outfitId: outfit.id,
        rating: "like",
        timestamp: new Date().toISOString(),
      },
    ],
  });
  const before = storage.getItem(STORAGE_KEY);
  const loaded = adapter.load();
  saveLocale(storage, "zh");
  saveLocale(storage, "en");
  assert.equal(storage.getItem(STORAGE_KEY), before);
  assert.deepEqual(adapter.load(), loaded);
});

test("weather explanations translate without changing candidates or temperatures", () => {
  const profile = learn([]);
  const ids = [
    ...STARTER_IDS,
    "knit:cream",
    "wool-coat:black",
    "scarf:beige",
    "fleece-pants:black",
    "winter-boots:black",
    "beanie:black",
    "gloves:black",
    "long-puffer:black",
    "thermal-top:black",
  ];
  for (const [lowC, highC] of [
    [9, 17],
    [-4, 3],
    [27, 30],
  ]) {
    const weather = {
      ...freshWeather(),
      date: today(),
      lowC,
      highC,
      confirmed: true,
    };
    const candidates = weatherCandidates(ids, profile, weather);
    assert.ok(candidates.length);
    const snapshot = JSON.stringify(candidates[0]);
    for (const comfort of ["default", "cold", "warm", "custom"]) {
      const personal = { ...weather, comfort, coatBelowC: 17 };
      const english = weatherReason(candidates[0], personal);
      const chinese = weatherReason(candidates[0], personal, {}, zh);
      assert.notEqual(chinese, english);
      assert.match(chinese, /[\u4e00-\u9fff]/);
      assert.doesNotMatch(chinese, /[a-z]{3,}|\{\d+\}/i);
      assert.equal(JSON.stringify(candidates[0]), snapshot);
    }
  }
});

test("English strings, proper names, numbers and React values pass through unchanged", () => {
  assert.equal(translate("My style.", "en"), "My style.");
  assert.equal(zh("Acne Studios"), "Acne Studios");
  assert.equal(zh("COS"), "COS");
  assert.equal(zh(18), 18);
  assert.equal(zh(null), null);
  const element = { type: "span", props: {} };
  assert.equal(zh(element), element);
  assert.equal(translate("{0} / {1}", "en", [0, 5]), "0 / 5");
});
