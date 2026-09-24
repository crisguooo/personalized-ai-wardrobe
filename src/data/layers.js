// Layer roles describe construction, independently of the closet's categories.
// No garment names or color combinations participate in these decisions.
export function layerMetadata(item) {
  const intendedUse =
    item.intendedUse ??
    (item.layer === "base" || item.category === "top"
      ? "base"
      : item.layer === "outer" || item.thermal?.shell
        ? "outer"
        : item.layer === "mid" ||
            item.subcategory === "cardigan" ||
            item.category === "midlayer"
          ? "layering"
          : item.category === "outerwear"
            ? "outer"
            : "other");
  let layerRoles = [];
  if (intendedUse === "base") layerRoles = ["base"];
  else if (intendedUse === "outer") layerRoles = ["outerLayer"];
  else if (intendedUse === "layering") {
    const dominant =
      item.length === "long" ||
      item.bulk >= 4 ||
      item.volume >= 4 ||
      item.fit === "oversized" ||
      item.structure === "structured";
    layerRoles = dominant
      ? ["outerLayer"]
      : item.bulk <= 2 || item.fit === "fitted"
        ? ["midLayer"]
        : ["midLayer", "lightOuterLayer"];
  }
  return {
    intendedUse,
    layerRole: layerRoles[0] ?? null,
    layerRoles,
    outerwearRole: layerRoles.includes("outerLayer")
      ? "dominant"
      : layerRoles.includes("lightOuterLayer")
        ? "light"
        : null,
  };
}
export const rolesFor = (item) =>
  item.layerRoles ?? layerMetadata(item).layerRoles;
export const canFillLayer = (item, role) =>
  rolesFor(item).includes(role) ||
  (role === "outerLayer" && rolesFor(item).includes("lightOuterLayer"));
export const isLayer = (item) => rolesFor(item).some((r) => r !== "base");
export const LAYER_STRUCTURES = [
  { id: "base", mid: false, outer: false },
  { id: "base + mid", mid: true, outer: false },
  { id: "base + outer", mid: false, outer: true },
  { id: "base + mid + outer", mid: true, outer: true },
];
const lengthOrder = { cropped: 0, waist: 1, regular: 2, hip: 2, long: 3 };
function stackErrors(base, mid, outer) {
  const errors = [];
  if (
    mid &&
    outer &&
    (mid.structure === "structured" ||
      mid.bulk >= 4 ||
      mid.volume >= 4 ||
      lengthOrder[mid.length] > lengthOrder[outer.length])
  )
    errors.push(
      "The inner layer needs a softer, slimmer cut and a hem that fits beneath the outer layer",
    );
  let occupied = base?.bulk ?? 0;
  for (const layer of [mid, outer].filter(Boolean)) {
    if (occupied > layer.layerCapacity)
      errors.push(
        `${layer.name} cannot accommodate the inner layers (${occupied} bulk / ${layer.layerCapacity} capacity)`,
      );
    occupied =
      Math.max(occupied, layer.bulk) + Math.max(0, occupied - 2) * 0.25;
  }
  return errors;
}
// Resolve actual slots for validation, weather, scoring and legacy saved looks.
export function assignLayers(items, preferredStructure) {
  const base = items.find((i) => canFillLayer(i, "base"));
  const layers = items.filter(isLayer);
  const options = [];
  for (const plan of LAYER_STRUCTURES) {
    if (Number(plan.mid) + Number(plan.outer) !== layers.length) continue;
    for (const mid of plan.mid
      ? layers.filter((i) => canFillLayer(i, "midLayer"))
      : [null])
      for (const outer of plan.outer
        ? layers.filter((i) => canFillLayer(i, "outerLayer"))
        : [null]) {
        if (mid && mid === outer) continue;
        options.push({
          base,
          mid,
          outer,
          structure: plan.id,
          errors: stackErrors(base, mid, outer),
        });
      }
  }
  return (
    options.find(
      (p) => !p.errors.length && p.structure === preferredStructure,
    ) ??
    options.find((p) => !p.errors.length) ??
    options[0] ?? {
      base,
      mid: null,
      outer: null,
      structure: "invalid",
      errors: [
        "Choose one dominant outer layer; additional layers must fit an explicit mid + outer relationship",
      ],
    }
  );
}
