import { useState } from "react";
import { ArrowRight, Check, Plus, X } from "lucide-react";
import {
  ARCHETYPES,
  BY_ID,
  CATEGORIES,
  COLORS,
  DEFAULT_COLORS,
} from "../data/catalog.js";
import Garment from "../components/Garment.jsx";
import "../closet.css";
export default function Closet({ state, owned, toggle, start, ready }) {
  const [colors, setColors] = useState({});
  const [categoryFilter, setCategoryFilter] = useState("top");
  return (
    <section className="simple-closet">
      <h1>
        Tell us <em>what you own.</em>
      </h1>
      <div className="closet-lists">
        <section className="clothes-column" aria-label="All clothes">
          <h2>All clothes</h2>
          <div className="closet-categories" aria-label="Clothing categories">
            {CATEGORIES.filter(([key]) => key !== "all").map(([key, label]) => (
              <button
                key={key}
                aria-pressed={categoryFilter === key}
                onClick={() => setCategoryFilter(key)}
              >
                {label}
              </button>
            ))}
          </div>
          <div
            key={categoryFilter}
            className="clothes-scroll"
            tabIndex={0}
            aria-label="Browse all clothes"
          >
            {CATEGORIES.filter(([key]) => key === categoryFilter).map(
              ([category, name]) => (
                <div key={category} className="clothes-group">
                  <h3>{name}</h3>
                  {ARCHETYPES.filter((a) => a.category === category).map(
                    (a) => {
                      const color =
                        colors[a.key] ?? DEFAULT_COLORS[a.key] ?? "black";
                      const item = BY_ID[a.key + ":" + color];
                      const selected = state.closet.includes(item.id);
                      return (
                        <div className="clothes-row" key={a.key}>
                          <Garment item={item} />
                          <div className="clothes-name">
                            <span>{a.name}</span>
                            <select
                              aria-label={a.name + " color"}
                              value={color}
                              onChange={(e) =>
                                setColors((s) => ({
                                  ...s,
                                  [a.key]: e.target.value,
                                }))
                              }
                            >
                              {Object.keys(COLORS).map((c) => (
                                <option key={c} value={c}>
                                  {c}
                                </option>
                              ))}
                            </select>
                          </div>
                          <button
                            className={
                              "clothes-add " + (selected ? "added" : "")
                            }
                            aria-label={
                              (selected ? "Already added " : "Add ") +
                              color +
                              " " +
                              a.name
                            }
                            disabled={selected}
                            onClick={() => toggle(item.id)}
                          >
                            {selected ? (
                              <Check size={17} />
                            ) : (
                              <Plus size={18} />
                            )}
                          </button>
                        </div>
                      );
                    },
                  )}
                </div>
              ),
            )}
          </div>
        </section>
        <section
          className="clothes-column owned-column"
          aria-label="My clothes"
        >
          <h2>My clothes</h2>
          <div
            key={categoryFilter}
            className="clothes-scroll"
            tabIndex={0}
            aria-label="Clothes I own"
            aria-live="polite"
          >
            {!owned.length && (
              <p className="closet-empty-note">
                Tap + on the left.
                <br />
                Your clothes appear here.
              </p>
            )}
            {[...owned].reverse().map((item) => (
              <div className="clothes-row" key={item.id}>
                <Garment item={item} />
                <div className="clothes-name">
                  <span>{item.name}</span>
                  <small>{item.color}</small>
                </div>
                <button
                  className="clothes-remove"
                  aria-label={"Remove " + item.color + " " + item.name}
                  onClick={() => toggle(item.id)}
                >
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
        </section>
      </div>
      <div className="simple-closet-footer">
        {!ready && <p>Add a top, bottoms and shoes to continue.</p>}
        <button className="primary" disabled={!ready} onClick={start}>
          Dress for today <ArrowRight size={18} />
        </button>
      </div>
    </section>
  );
}
