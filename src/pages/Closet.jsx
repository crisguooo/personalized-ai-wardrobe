import { useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Plus,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import {
  ARCHETYPES,
  BY_ID,
  CATEGORIES,
  COLORS,
  DEFAULT_COLORS,
  STARTER_IDS,
} from "../data/catalog.js";
import Garment from "../components/Garment.jsx";
export default function Closet({
  state,
  owned,
  toggle,
  start,
  ready,
  onStarter,
}) {
  const [category, setCategory] = useState("all"),
    [query, setQuery] = useState(""),
    [mode, setMode] = useState("library"),
    [colors, setColors] = useState({}),
    [fit, setFit] = useState("all");
  const shown =
    mode === "owned"
      ? owned
      : ARCHETYPES.map(
          (a) =>
            BY_ID[
              `${a.key}:${colors[a.key] ?? DEFAULT_COLORS[a.key] ?? "grey"}`
            ],
        );
  const filtered = shown.filter(
    (i) =>
      (category === "all" || i.category === category) &&
      (fit === "all" || i.fit === fit) &&
      `${i.name} ${i.fit} ${i.color}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  const counts = Object.fromEntries(
    ["top", "bottom", "shoes"].map((c) => [
      c,
      owned.filter((i) => i.category === c).length,
    ]),
  );
  return (
    <section className="closet-page">
      <div className="page-heading">
        <div>
          <div className="eyebrow">
            <span>01</span> THE CLOSET COMES FIRST
          </div>
          <h1>
            Good style starts
            <br />
            with <em>what you own.</em>
          </h1>
          <p>
            Pick the pieces that feel like your wardrobe. Close enough is
            perfect.
          </p>
        </div>
        <aside className="closet-note">
          <span className="note-star">✳</span>
          <p>
            Your wardrobe
            <br />
            learns your taste.
          </p>
          <span>
            YOU BRING THE CLOTHES.
            <br />
            WE'LL FIND THE CONNECTIONS.
          </span>
        </aside>
      </div>
      <div className="closet-layout">
        <div className="catalog">
          <div className="catalog-top">
            <div className="segmented">
              <button
                className={mode === "library" ? "active" : ""}
                onClick={() => setMode("library")}
              >
                The edit <span>36</span>
              </button>
              <button
                className={mode === "owned" ? "active" : ""}
                onClick={() => setMode("owned")}
              >
                My closet <span>{owned.length}</span>
              </button>
            </div>
            <label className="search">
              <Search size={17} />
              <input
                aria-label="Search clothing"
                placeholder="Find a piece…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
          </div>
          <div className="filter-row">
            <div className="category-tabs">
              {CATEGORIES.map(([key, label]) => (
                <button
                  key={key}
                  className={category === key ? "active" : ""}
                  onClick={() => setCategory(key)}
                >
                  {label}
                </button>
              ))}
            </div>
            <label className="fit-filter">
              <SlidersHorizontal size={15} />
              <select
                aria-label="Filter by fit"
                value={fit}
                onChange={(e) => setFit(e.target.value)}
              >
                <option value="all">All fits</option>
                {[
                  "fitted",
                  "regular",
                  "relaxed",
                  "oversized",
                  "straight",
                  "wide-leg",
                  "skinny",
                ].map((f) => (
                  <option key={f}>{f}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="item-grid">
            {filtered.map((item) => {
              const selected = state.closet.includes(item.id);
              return (
                <article
                  className={`item-card ${selected ? "in-closet" : ""}`}
                  key={mode === "owned" ? item.id : item.key}
                >
                  <button
                    className="item-picture"
                    onClick={() => toggle(item.id)}
                    aria-label={`${selected ? "Remove" : "Add"} ${item.color} ${item.name}`}
                    aria-pressed={selected}
                  >
                    <Garment item={item} />
                    <span className="add-icon">
                      {selected ? <Check size={16} /> : <Plus size={17} />}
                    </span>
                    {selected && (
                      <span className="owned-label">IN YOUR CLOSET</span>
                    )}
                  </button>
                  <div className="item-info">
                    <h3>{item.name}</h3>
                    <span>
                      {item.fit} · {item.color}
                    </span>
                  </div>
                  {mode === "library" && (
                    <div
                      className="swatches"
                      aria-label={`Colors for ${item.name}`}
                    >
                      {Object.entries(COLORS).map(([color, { hex }]) => (
                        <button
                          key={color}
                          aria-label={`${item.name} in ${color}`}
                          aria-pressed={item.color === color}
                          title={color}
                          className={item.color === color ? "active" : ""}
                          style={{ "--swatch": hex }}
                          onClick={() =>
                            setColors((s) => ({ ...s, [item.key]: color }))
                          }
                        />
                      ))}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
          {!filtered.length && (
            <div className="inline-empty">
              {mode === "owned"
                ? "Your selected pieces will live here. Browse The edit to add some."
                : "No pieces match those filters."}
            </div>
          )}
        </div>
        <aside className="closet-sidebar">
          <div className="selection-card">
            <div className="eyebrow">YOUR STARTING LINEUP</div>
            <div className="closet-count">
              {owned.length}
              <span>pieces & counting</span>
            </div>
            <div className="mini-lineup">
              {(owned.length
                ? owned.slice(-4)
                : STARTER_IDS.slice(0, 4).map((id) => BY_ID[id])
              ).map((i) => (
                <div key={i.id}>
                  <Garment item={i} />
                </div>
              ))}
            </div>
            <p>A few favorites. A lot of possibilities.</p>
            <div className="closet-checks">
              {[
                ["top", "A top"],
                ["bottom", "A bottom"],
                ["shoes", "A pair of shoes"],
              ].map(([key, label]) => (
                <div key={key} className={counts[key] ? "done" : ""}>
                  <span>
                    {counts[key] ? <Check size={13} /> : <Plus size={13} />}
                  </span>
                  {label}
                  <b>{counts[key] || "—"}</b>
                </div>
              ))}
            </div>
            <button className="primary" disabled={!ready} onClick={start}>
              Find my style
              <ArrowRight size={18} />
            </button>
            <small>
              {ready
                ? "A few quick outfit ratings. No right answers."
                : "Add these three essentials to begin."}
            </small>
          </div>
          <div className="starter-card">
            <span className="eyebrow">JUST LOOKING AROUND?</span>
            <h3>
              Try a little
              <br />
              of everything.
            </h3>
            <p>
              Start with 18 everyday pieces, then edit them to feel like you.
            </p>
            <button onClick={onStarter}>
              Add the starter closet
              <ArrowUpRight size={17} />
            </button>
          </div>
        </aside>
      </div>
    </section>
  );
}
