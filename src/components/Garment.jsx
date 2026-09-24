import { COLORS } from "../data/catalog.js";

export function ColorFilters() {
  return (
    <svg
      width="0"
      height="0"
      aria-hidden="true"
      style={{ position: "absolute" }}
    >
      <defs>
        {Object.entries(COLORS).map(([key, { hex }]) => {
          const c = [1, 3, 5].map(
            (i) => parseInt(hex.slice(i, i + 2), 16) / 255,
          );
          const row = (x) =>
            [
              0.2126 * 2 * (1 - x),
              0.7152 * 2 * (1 - x),
              0.0722 * 2 * (1 - x),
              0,
              2 * x - 1,
            ].join(" ");
          return (
            <filter
              key={key}
              id={`tint-${key}`}
              colorInterpolationFilters="sRGB"
            >
              <feColorMatrix
                type="matrix"
                values={`${row(c[0])} ${row(c[1])} ${row(c[2])} 0 0 0 1 0`}
              />
            </filter>
          );
        })}
      </defs>
    </svg>
  );
}
// Both atlases use the same 6 x 6 photographic layout and grayscale tinting.
export const illustrationMap = {
  "wardrobe-atlas": "/assets/wardrobe-atlas.png",
  "wardrobe-seasonal-atlas": "/assets/wardrobe-seasonal-atlas.png",
};
export default function Garment({ item, className = "" }) {
  const cell = item.sprite % 36;
  return (
    <span
      role="img"
      aria-label={`${item.color} ${item.name}`}
      className={`garment ${className}`}
      style={{
        backgroundImage: `url(${illustrationMap[item.assetKey]})`,
        backgroundSize: "600% 600%",
        backgroundPosition: `${(cell % 6) * 20}% ${Math.floor(cell / 6) * 20}%`,
        clipPath:
          item.assetKey === "wardrobe-seasonal-atlas"
            ? "inset(5% 2% 3% 2%)"
            : undefined,
        filter: `url(#tint-${item.color})`,
      }}
    />
  );
}
