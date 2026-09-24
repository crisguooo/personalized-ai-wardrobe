import { assignLayers } from "../data/layers.js";
import { BY_ID } from "../data/catalog.js";
export const makeOutfit = (items) => {
  const itemIds = items.filter(Boolean).map((i) => i.id);
  return { id: [...itemIds].sort().join("|"), itemIds };
};
export function physicalRules(items) {
  return assignLayers(items).errors;
}
export function validity(outfit, ownedIds, { physical = true } = {}) {
  if (!Array.isArray(outfit?.itemIds)) return ["Missing clothing items"];
  const items = outfit.itemIds.map((id) => BY_ID[id]);
  if (items.some((i) => !i)) return ["Unknown clothing item"];
  const errors = [];
  if (new Set(outfit.itemIds).size !== items.length)
    errors.push("Duplicate clothing item");
  if (ownedIds && outfit.itemIds.some((id) => !ownedIds.includes(id)))
    errors.push("Unowned clothing item");
  for (const c of ["top", "bottom", "shoes"])
    if (items.filter((i) => i.category === c).length !== 1)
      errors.push(`Needs exactly one ${c}`);
  const slots = items
    .filter((i) => i.category === "accessory")
    .map((i) => i.accessorySlot);
  if (new Set(slots).size !== slots.length)
    errors.push("Too many accessories in the same slot");
  if (physical) errors.push(...physicalRules(items));
  return errors;
}
