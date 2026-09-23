import { BY_ID } from "../data/catalog.js";
import { learn, validity } from "../engine/wardrobe.js";
export const STORAGE_KEY = "wearwell:v1";
export const freshState = () => ({
  version: 1,
  closet: [],
  feedback: [],
  profile: learn([]),
  saved: [],
  generated: [],
  onboarded: false,
  learned: false,
  events: [],
});
export function sanitize(raw) {
  if (!raw || raw.version !== 1) return freshState();
  const closet = Array.isArray(raw.closet)
    ? [...new Set(raw.closet.filter((id) => BY_ID[id]))]
    : [];
  const feedback = Array.isArray(raw.feedback)
    ? raw.feedback.filter(
        (e) =>
          e &&
          ["like", "dislike"].includes(e.rating) &&
          Array.isArray(e.itemIds) &&
          !validity(e).length &&
          typeof e.timestamp === "string",
      )
    : [];
  const outfits = (key) =>
    Array.isArray(raw[key])
      ? raw[key].filter(
          (o) => o && Array.isArray(o.itemIds) && !validity(o, closet).length,
        )
      : [];
  return {
    ...freshState(),
    closet,
    feedback,
    profile: learn(feedback),
    saved: outfits("saved"),
    generated: outfits("generated").slice(-60),
    onboarded: raw.onboarded === true,
    learned: raw.learned === true,
    events: Array.isArray(raw.events) ? raw.events.slice(-500) : [],
  };
}
export function createStorage(storage) {
  return {
    load() {
      try {
        const raw = storage.getItem(STORAGE_KEY);
        return {
          state: raw ? sanitize(JSON.parse(raw)) : freshState(),
          error: null,
        };
      } catch {
        return {
          state: freshState(),
          error: "Saved progress could not be read. This session still works.",
        };
      }
    },
    save(state) {
      try {
        storage.setItem(
          STORAGE_KEY,
          JSON.stringify({ ...state, profile: learn(state.feedback) }),
        );
        return null;
      } catch {
        return "Your browser could not save progress. Keep this tab open or free up browser storage.";
      }
    },
  };
}
