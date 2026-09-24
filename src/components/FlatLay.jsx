import Garment from "./Garment.jsx";
import { BY_ID } from "../data/catalog.js";
export default function FlatLay({
  outfit,
  selected,
  onSelect,
  ghostId,
  small = false,
}) {
  if (!outfit) return null;
  return (
    <div
      className={`flatlay ${small ? "small" : ""} ${outfit.itemIds.length >= 6 ? "many-pieces" : ""}`}
      aria-label="Outfit flat lay"
    >
      {outfit.itemIds.map((id) => {
        const item = BY_ID[id];
        if (!item) return null;
        const classes = `flat-item slot-${item.category} ${item.accessorySlot ? `slot-accessory-${item.accessorySlot}` : ""} ${selected === id ? "selected" : ""} ${ghostId === id ? "ghost" : ""}`;
        return onSelect ? (
          <button
            className={classes}
            key={id}
            onClick={() => onSelect(id)}
            aria-label={`Select ${item.color} ${item.name}`}
            aria-pressed={selected === id}
          >
            <Garment item={item} />
            <span className="garment-label">{item.name}</span>
          </button>
        ) : (
          <div className={classes} key={id}>
            <Garment item={item} />
            {ghostId === id && (
              <span className="ghost-label">THE MISSING PIECE</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
