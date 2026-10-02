import { useLanguage } from "../i18n/Language.jsx";
import { palette } from "../engine/palette.js";
import { COLORS } from "../data/catalog.js";
export default function PaletteNote({ outfit }) {
  const { t } = useLanguage();
  if (!outfit) return null;
  const info = palette(outfit);
  return (
    <div className="palette-note">
      <span className="palette-swatches" aria-label={t(info.colors.join(", "))}>
        {info.colors.map((color) => (
          <i
            key={color}
            title={t(color)}
            style={{ background: COLORS[color].hex }}
          />
        ))}
      </span>
      <span>{t(info.label)} </span>
    </div>
  );
}
