import { scoreBreakdown } from "../engine/wardrobe.js";
export default function ScoreDebug({ outfit, profile, occasion, refinement }) {
  if (
    !import.meta.env.DEV ||
    new URLSearchParams(window.location.search).get("debug") !== "1"
  )
    return null;
  const result = scoreBreakdown(outfit, profile, occasion, { refinement });
  return (
    <details className="debug">
      <summary>Development · outfit score {result.total.toFixed(2)}</summary>
      {result.colorDebug && (
        <pre>
          {[
            `Color Strategy: ${result.colorDebug.strategy}`,
            ...[
              ["Hue", "hue"],
              ["Temperature", "temperature"],
              ["Value", "value"],
              ["Saturation", "saturation"],
              ["Proportion", "proportion"],
              ["Placement", "placement"],
              ["Tonal depth", "tonalDepth"],
              ["Personal color", "personal"],
              ["Final color", "final"],
            ].map(
              ([label, key]) =>
                `${label} score: ${result.colorDebug[key].toFixed(2)}`,
            ),
          ].join("\n")}
        </pre>
      )}
      <pre>{JSON.stringify(result, null, 2)}</pre>
    </details>
  );
}
