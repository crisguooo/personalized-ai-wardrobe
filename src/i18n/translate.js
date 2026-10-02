import { messages, templates } from "./zh.js";

export const LOCALE_KEY = "wearwell:language";
export const normalizeLocale = (value) =>
  /^zh(?:-|$)/i.test(value ?? "") ? "zh" : "en";
export function readLocale(storage, browserLanguage = "en") {
  try {
    const saved = storage?.getItem(LOCALE_KEY);
    if (saved === "zh" || saved === "en") return saved;
  } catch {
    /* Private browsing still supports an in-memory language choice. */
  }
  return normalizeLocale(browserLanguage);
}
export function saveLocale(storage, locale) {
  try {
    storage?.setItem(LOCALE_KEY, normalizeLocale(locale));
  } catch {
    /* Non-blocking. */
  }
}
const normalize = (text) => text.trim().replace(/\s+/g, " ").toLowerCase();
const dictionary = new Map(
  Object.entries(messages).map(([key, value]) => [normalize(key), value]),
);
const escape = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const patterns = Object.entries(templates).map(([source, target]) => ({
  pattern: new RegExp(
    "^" +
      source
        .split(/\{\d+\}/)
        .map(escape)
        .join("(.+?)") +
      "$",
    "i",
  ),
  target,
}));
export const formatMessage = (message, values = []) =>
  message.replace(/\{(\d+)\}/g, (match, index) => values[index] ?? match);

// Translate at React's text boundary, never by rewriting the DOM or mutating
// the catalog. Unknown copy falls back to English, while React escapes output.
export function translate(value, locale = "en", values) {
  if (typeof value !== "string") return value;
  if (locale !== "zh") return values ? formatMessage(value, values) : value;
  const key = normalize(value);
  const exact = dictionary.get(key);
  if (values) {
    const target = exact ?? templates[value] ?? value;
    return formatMessage(
      target,
      values.map((v) => translate(v, locale)),
    );
  }
  if (exact) return value.replace(value.trim(), exact);
  for (const { pattern, target } of patterns) {
    const match = value.trim().match(pattern);
    if (match)
      return formatMessage(
        target,
        match.slice(1).map((v) => translate(v, locale)),
      );
  }
  // Accessible garment names and grouped labels are composed from known
  // catalog tokens. Keep unknown proper names (e.g. fashion brands) intact.
  const color = key.match(
    /^(powder-blue|charcoal|cream|camel|olive|burgundy|white|black|grey|navy|brown|beige|red|blue) (.+)$/,
  );
  if (color && dictionary.has(color[2]))
    return dictionary.get(color[1]) + dictionary.get(color[2]);
  const joins = {
    ", ": "、",
    " + ": " + ",
    " / ": " / ",
    " or ": "或",
    " and ": "与",
  };
  // Split outer lists first so labels containing "or" remain a single phrase.
  for (const [separator, localized] of Object.entries(joins)) {
    const parts = value.split(separator);
    if (parts.length < 2) continue;
    const translated = parts.map((part) => translate(part, locale));
    if (translated.every((part, i) => part !== parts[i]))
      return translated.join(localized);
  }
  return value;
}
