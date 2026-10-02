import { CATALOG } from "../data/catalog.js";

export const DEMO_PIECE_COUNT = 100;

// Sample without replacement. Cover garment types first so a demo has summer
// bases, winter layers, footwear and every accessory type, not just popular tees.
export function sampleDemoCloset(ownedIds = [], random = Math.random) {
  const owned = new Set(ownedIds);
  const available = CATALOG.filter((item) => !owned.has(item.id));
  for (let i = available.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [available[i], available[j]] = [available[j], available[i]];
  }
  const groups = new Map();
  for (const item of available) {
    if (!groups.has(item.archetype)) groups.set(item.archetype, []);
    groups.get(item.archetype).push(item);
  }
  const selected = new Set();
  const colors = new Set();
  for (const items of groups.values()) {
    if (selected.size >= DEMO_PIECE_COUNT) break;
    const item =
      items.find((candidate) => !colors.has(candidate.color)) ?? items[0];
    selected.add(item.id);
    colors.add(item.color);
  }
  // Complete color coverage when existing ownership restricts a type's choices.
  for (const item of available) {
    if (selected.size >= DEMO_PIECE_COUNT) break;
    if (!colors.has(item.color)) {
      selected.add(item.id);
      colors.add(item.color);
    }
  }
  for (const item of available) {
    if (selected.size >= DEMO_PIECE_COUNT) break;
    selected.add(item.id);
  }
  return [...selected];
}
