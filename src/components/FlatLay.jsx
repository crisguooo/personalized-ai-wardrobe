import { useLanguage } from "../i18n/Language.jsx";
import { assignLayers } from "../data/layers.js";
import Garment from "./Garment.jsx";
import { BY_ID } from "../data/catalog.js";
export default function FlatLay({
  outfit,
  selected,
  onSelect,
  ghostId,
  small = false,
}) {
  const { t } = useLanguage();
  if (!outfit) return null;
  const layers = assignLayers(
    outfit.itemIds.map((id) => BY_ID[id]).filter(Boolean),
    outfit.layerStructure,
  );
  return (
    <div
      className={`flatlay ${small ? "small" : ""} ${outfit.itemIds.length >= 6 ? "many-pieces" : ""}`}
      aria-label={t("Outfit flat lay")}
    >
      {outfit.itemIds.map((id) => {
        const item = BY_ID[id];
        if (!item) return null;
        const slot =
          layers.outer?.id === id
            ? "outerwear"
            : layers.mid?.id === id
              ? "midlayer"
              : item.category;
        const classes = `flat-item slot-${slot} ${item.accessorySlot ? `slot-accessory-${item.accessorySlot}` : ""} ${selected === id ? "selected" : ""} ${ghostId === id ? "ghost" : ""}`;
        return onSelect ? (
          <button
            className={classes}
            key={id}
            onClick={() => onSelect(id)}
            aria-label={t(`Select ${item.color} ${item.name}`)}
            aria-pressed={selected === id}
          >
            <Garment item={item} />
            <span className="garment-label">{t(item.name)}</span>
          </button>
        ) : (
          <div className={classes} key={id}>
            <Garment item={item} />
            {ghostId === id && (
              <span className="ghost-label">{t("THE MISSING PIECE")}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
