import { useState, useEffect, useMemo } from "react";
import { ArrowLeft, ArrowRight, Plus, Check, ChevronDown } from "lucide-react";
import { gaps } from "../engine/wardrobe.js";
import { BY_ID, COLORS } from "../data/catalog.js";
import Garment from "../components/Garment.jsx";
import FlatLay from "../components/FlatLay.jsx";
import "../missing.css";

function Piece({ gap, onAdd }) {
  const [showColors, setShowColors] = useState(false);
  const [color, setColor] = useState(gap.item.color);
  const [exploring, setExploring] = useState(false);
  const [example, setExample] = useState(0);
  const item = BY_ID[`${gap.item.archetype}:${color}`];
  return (
    <article
      className="missing-piece"
      id="missing-piece"
      aria-label={gap.item.name}
    >
      <div className="missing-visual">
        <Garment item={showColors ? item : gap.item} />
      </div>
      <h2>{gap.item.name}</h2>
      <p className="missing-reason">{gap.shortReason}</p>
      <p className="missing-count">
        +{gap.likely} outfit possibilities <small>estimated</small>
      </p>
      <div className="missing-actions">
        <button
          aria-expanded={exploring}
          aria-controls="missing-ideas"
          onClick={() => {
            setExploring(!exploring);
            setShowColors(false);
          }}
        >
          Explore outfits <ArrowRight size={15} />
        </button>
        <button
          aria-expanded={showColors}
          aria-controls="missing-colors"
          onClick={() => {
            setShowColors(!showColors);
            setExploring(false);
          }}
        >
          <Plus size={15} /> Already have this?
        </button>
      </div>
      {showColors && (
        <div className="missing-colors" id="missing-colors">
          <p>
            Which color do you own? <b>{color}</b>
          </p>
          <div
            className="missing-swatches"
            role="group"
            aria-label="Owned color"
          >
            {Object.entries(COLORS).map(([name, swatch]) => (
              <button
                key={name}
                aria-label={name}
                aria-pressed={color === name}
                title={name}
                style={{ "--swatch": swatch.hex }}
                onClick={() => setColor(name)}
              >
                {color === name && <Check size={15} />}
              </button>
            ))}
          </div>
          <button
            className="primary missing-add"
            onClick={() => onAdd(item.id)}
          >
            <Plus size={16} /> Add to closet
          </button>
        </div>
      )}
      {exploring && (
        <div className="missing-ideas" id="missing-ideas">
          <FlatLay outfit={gap.examples[example]} ghostId={gap.item.id} small />
          <div className="missing-pager">
            <button
              aria-label="Previous outfit"
              disabled={example === 0}
              onClick={() => setExample(example - 1)}
            >
              <ArrowLeft size={17} />
            </button>
            <span>
              {example + 1} / {gap.examples.length} · everything else is yours
            </span>
            <button
              aria-label="Next outfit"
              disabled={example === gap.examples.length - 1}
              onClick={() => setExample(example + 1)}
            >
              <ArrowRight size={17} />
            </button>
          </div>
        </div>
      )}
    </article>
  );
}

export default function Missing({ state, profile, track, onAdd }) {
  const results = useMemo(
    () => gaps(state.closet, profile),
    [state.closet, profile],
  );
  const [active, setActive] = useState(null);
  const [added, setAdded] = useState("");
  const gap = results.find((g) => g.item.id === active);
  useEffect(() => {
    if (gap)
      track("missing_item_viewed", { itemId: gap.item.id, likely: gap.likely });
  }, [gap?.item.id]);
  return (
    <section className="missing-simple">
      <h1>A little more possibility.</h1>
      <p className="missing-intro">
        {results.length
          ? "Tap a piece to see what it could add."
          : "Nothing obvious missing. Keep exploring your style."}
      </p>
      <div className="missing-tags" aria-label="Pieces to explore">
        {results.map((g) => (
          <button
            key={g.item.id}
            className={active === g.item.id ? "active" : ""}
            aria-expanded={active === g.item.id}
            aria-controls="missing-piece"
            onClick={() => setActive(active === g.item.id ? null : g.item.id)}
          >
            {g.item.name}
            <ChevronDown size={14} />
          </button>
        ))}
      </div>
      {added && (
        <p className="missing-added" role="status">
          <Check size={16} />
          {added}
        </p>
      )}
      {gap && (
        <Piece
          key={gap.item.id}
          gap={gap}
          onAdd={(id) => {
            onAdd(id);
            setAdded(
              `${BY_ID[id].color[0].toUpperCase() + BY_ID[id].color.slice(1)} ${BY_ID[id].name.toLowerCase()} added to your closet.`,
            );
            setActive(null);
          }}
        />
      )}
    </section>
  );
}
