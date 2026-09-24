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
// A single registry can later resolve per-item transparent PNGs instead of atlas cells.
export const illustrationMap = {
  "wardrobe-atlas": "/assets/wardrobe-atlas.png",
  "tall-boots": "/assets/tall-boots.svg",
  scarf: "/assets/scarf.svg",
};
export default function Garment({ item, className = "" }) {
  return (
    <span
      role="img"
      aria-label={`${item.color} ${item.name}`}
      className={`garment ${className}`}
      style={{
        backgroundImage: `url(${illustrationMap[item.assetKey]})`,
        ...(item.assetKey !== "wardrobe-atlas"
          ? { backgroundSize: "contain", backgroundRepeat: "no-repeat" }
          : {}),
        backgroundPosition:
          item.assetKey !== "wardrobe-atlas"
            ? "center"
            : `${(item.sprite % 6) * 20}% ${Math.floor(item.sprite / 6) * 20}%`,
        filter: `url(#tint-${item.color})`,
      }}
    />
  );
}
