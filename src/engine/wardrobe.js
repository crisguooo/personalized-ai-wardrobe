// Stable facade: pages, storage and integrations share one deterministic engine.
export { REASONS, LABELS, features } from "./features.js";
export { validity, makeOutfit } from "./compatibility.js";
export { learn, preferenceScore, insights, hasEvidence } from "./profile.js";
export {
  score,
  scoreBreakdown,
  silhouetteScore,
  layeringScore,
} from "./scoring.js";
export {
  generate,
  rank,
  explore,
  swap,
  swapCandidates,
  outfitDistance,
} from "./recommendations.js";
export { gaps } from "./gaps.js";
export { OCCASIONS, REFINEMENTS } from "./occasions.js";
