// Scores and targets use [0, 1]. Weights sum to one for every objective.
export const OCCASIONS = {
  Everyday: {
    targetInterest: 0.36,
    targetFormality: 0.35,
    weights: {
      personal: 0.3,
      silhouette: 0.2,
      comfort: 0.2,
      color: 0.15,
      layering: 0.1,
      interest: 0.05,
    },
  },
  Work: {
    targetInterest: 0.38,
    targetFormality: 0.72,
    weights: {
      occasion: 0.3,
      personal: 0.2,
      silhouette: 0.2,
      color: 0.15,
      layering: 0.1,
      interest: 0.05,
    },
  },
  Date: {
    targetInterest: 0.62,
    targetFormality: 0.55,
    weights: {
      personal: 0.3,
      silhouette: 0.2,
      interest: 0.2,
      occasion: 0.15,
      color: 0.1,
      layering: 0.05,
    },
  },
  "Going out": {
    targetInterest: 0.78,
    targetFormality: 0.5,
    weights: {
      personal: 0.25,
      interest: 0.25,
      silhouette: 0.2,
      occasion: 0.15,
      color: 0.1,
      layering: 0.05,
    },
  },
  Comfy: {
    targetInterest: 0.3,
    targetFormality: 0.18,
    weights: {
      comfort: 0.3,
      personal: 0.3,
      silhouette: 0.15,
      color: 0.1,
      layering: 0.1,
      interest: 0.05,
    },
  },
};
export const REFINEMENTS = {
  "Less basic": { interest: 0.28, weights: { interest: 0.18 } },
  "More casual": {
    formality: -0.28,
    weights: { occasion: 0.2, comfort: 0.08 },
  },
  "More dressy": { formality: 0.28, weights: { occasion: 0.25 } },
  "More layered": { layers: 0.25, weights: { layering: 0.22 } },
};
export function objective(occasion = "Everyday", refinement) {
  const base = OCCASIONS[occasion] ?? OCCASIONS.Everyday;
  const change = REFINEMENTS[refinement] ?? {};
  const weights = { ...base.weights };
  for (const [key, value] of Object.entries(change.weights ?? {}))
    weights[key] = (weights[key] ?? 0) + value;
  const total = Object.values(weights).reduce((s, n) => s + n, 0);
  return {
    ...base,
    targetInterest: Math.max(
      0,
      Math.min(1, base.targetInterest + (change.interest ?? 0)),
    ),
    targetFormality: Math.max(
      0,
      Math.min(1, base.targetFormality + (change.formality ?? 0)),
    ),
    layerBonus: change.layers ?? 0,
    weights: Object.fromEntries(
      Object.entries(weights).map(([k, v]) => [k, v / total]),
    ),
  };
}
