import { palette } from "../engine/palette.js";
import { COLORS } from "../data/catalog.js";
export default function PaletteNote({ outfit }) {
  if (!outfit) return null;
  const info = palette(outfit);
  return (
    <div className="palette-note">
      <span className="palette-swatches" aria-label={info.colors.join(", ")}>
        {info.colors.map((color) => (
          <i
            key={color}
            title={color}
            style={{ background: COLORS[color].hex }}
          />
        ))}
      </span>
      <span>
        {info.colors.length} {info.colors.length === 1 ? "color" : "colors"} ·{" "}
        {info.label}
      </span>
    </div>
  );
}
