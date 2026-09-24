import { additionValue, annotateLook } from "./directions.js";
import { BY_ID } from "../data/catalog.js";
import { palette } from "./palette.js";
import { validity } from "./wardrobe.js";
import { weatherFit, validRange } from "./weather.js";

// Styling suggestions are optional and separate from thermal requirements.
// Never frame a missing winter accessory as merely decorative.
export function finishingTouch(outfit, closet, weather, overrides = {}) {
  if (!outfit || !validRange(weather?.lowC, weather?.highC)) return "";
  const fit = weatherFit(outfit, weather, overrides);
  if (fit.missing.length || fit.coldGap > 2 || fit.hotGap > 3) return "";
  const slots = new Set(outfit.itemIds.map((id) => BY_ID[id]?.accessorySlot));
  const baseline = palette(outfit).penalty;
  const options = closet.filter((id) => {
    const item = BY_ID[id];
    if (
      !item ||
      !["bag", "jewelry"].includes(item.accessorySlot) ||
      slots.has(item.accessorySlot)
    )
      return false;
    const next = { ...outfit, itemIds: [...outfit.itemIds, id] };
    return (
      additionValue(annotateLook(outfit), item) >= 0.018 &&
      !validity(next, closet).length &&
      palette(next).penalty <= baseline + 0.1
    );
  });
  options.sort(
    (a, b) =>
      palette({ itemIds: [...outfit.itemIds, a] }).penalty -
        palette({ itemIds: [...outfit.itemIds, b] }).penalty ||
      a.localeCompare(b),
  );
  const item = BY_ID[options[0]];
  return item
    ? `For a little extra polish, try your ${item.color} ${item.name.toLowerCase()} — a nice finishing touch, if you feel like it.`
    : "";
}
