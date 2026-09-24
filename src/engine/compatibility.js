import { BY_ID } from "../data/catalog.js";
export const makeOutfit = (items) => {
  const itemIds = items.filter(Boolean).map((i) => i.id);
  return { id: [...itemIds].sort().join("|"), itemIds };
};
export function physicalRules(items) {
  const errors = [];
  if (items.filter((i) => i.thermal.shell).length > 1)
    errors.push("Choose one jacket or coat, not two outer shells");
  const stack = ["top", "midlayer", "outerwear"]
    .map((c) => items.find((i) => i.category === c))
    .filter(Boolean);
  let occupied = stack[0]?.bulk ?? 0;
  for (const outer of stack.slice(1)) {
    if (occupied > outer.layerCapacity)
      errors.push(
        `${outer.name} cannot accommodate the inner layers (${occupied} bulk / ${outer.layerCapacity} capacity)`,
      );
    // A thin base adds little to an insulating midlayer; bulky stacked inners do.
    occupied =
      Math.max(occupied, outer.bulk) + Math.max(0, occupied - 2) * 0.25;
  }
  return errors;
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
  for (const c of ["midlayer", "outerwear"])
    if (items.filter((i) => i.category === c).length > 1)
      errors.push(`Too many ${c} pieces`);
  const slots = items
    .filter((i) => i.category === "accessory")
    .map((i) => i.accessorySlot);
  if (new Set(slots).size !== slots.length)
    errors.push("Too many accessories in the same slot");
  if (physical) errors.push(...physicalRules(items));
  return errors;
}
