import { useLanguage } from "../i18n/Language.jsx";
import { useState } from "react";
import { ArrowRight, Check, Plus, X } from "lucide-react";
import {
  ARCHETYPES,
  CATALOG,
  BY_ID,
  CATEGORIES,
  COLORS,
  DEFAULT_COLORS,
} from "../data/catalog.js";
import Garment from "../components/Garment.jsx";
import { DEMO_PIECE_COUNT } from "../engine/demo-closet.js";
import "../closet.css";
export default function Closet({
  state,
  owned,
  toggle,
  start,
  ready,
  onAddDemo,
}) {
  const { t } = useLanguage();
  const [colors, setColors] = useState({});
  const [categoryFilter, setCategoryFilter] = useState("top");
  const allAdded = owned.length === CATALOG.length;
  const demoCount = Math.min(DEMO_PIECE_COUNT, CATALOG.length - owned.length);
  return (
    <section className="simple-closet">
      <h1>
        {t("Tell us ")}
        <em>{t("what you own.")}</em>
      </h1>
      <div className="closet-demo-tools">
        <button className="outline" onClick={onAddDemo} disabled={allAdded}>
          {allAdded ? <Check size={16} /> : <Plus size={16} />}
          {allAdded
            ? t("All clothes added")
            : t("Add {0} random demo pieces", [demoCount])}
        </button>
        <small role="status">
          {t("All seasons · Varied colors · Clothes & accessories")}
        </small>
      </div>
      <div className="closet-lists">
        <section className="clothes-column" aria-label={t("All clothes")}>
          <h2>{t("All clothes")}</h2>
          <div
            className="closet-categories"
            aria-label={t("Clothing categories")}
          >
            {CATEGORIES.filter(([key]) => key !== "all").map(([key, label]) => (
              <button
                key={key}
                aria-pressed={categoryFilter === key}
                onClick={() => setCategoryFilter(key)}
              >
                {t(label)}
              </button>
            ))}
          </div>
          <div
            key={categoryFilter}
            className="clothes-scroll"
            tabIndex={0}
            aria-label={t("Browse all clothes")}
          >
            {CATEGORIES.filter(([key]) => key === categoryFilter).map(
              ([category, name]) => (
                <div key={category} className="clothes-group">
                  <h3>{t(name)}</h3>
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
                            <span>{t(a.name)}</span>
                            <select
                              aria-label={t(a.name + " color")}
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
                                  {t(c)}
                                </option>
                              ))}
                            </select>
                          </div>
                          <button
                            className={
                              "clothes-add " + (selected ? "added" : "")
                            }
                            aria-label={t(
                              (selected ? "Already added " : "Add ") +
                                color +
                                " " +
                                a.name,
                            )}
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
          aria-label={t("My clothes")}
        >
          <h2>{t("My clothes")}</h2>
          <div
            key={categoryFilter}
            className="clothes-scroll"
            tabIndex={0}
            aria-label={t("Clothes I own")}
            aria-live="polite"
          >
            {!owned.length && (
              <p className="closet-empty-note">
                {t("Tap + on the left.")}
                <br />
                {t("Your clothes appear here.")}
              </p>
            )}
            {[...owned].reverse().map((item) => (
              <div className="clothes-row" key={item.id}>
                <Garment item={item} />
                <div className="clothes-name">
                  <span>{t(item.name)}</span>
                  <small>{t(item.color)}</small>
                </div>
                <button
                  className="clothes-remove"
                  aria-label={t("Remove " + item.color + " " + item.name)}
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
        {!ready && <p>{t("Add a top, bottoms and shoes to continue.")}</p>}
        <button className="primary" disabled={!ready} onClick={start}>
          {t("Dress for today ")}
          <ArrowRight size={18} />
        </button>
      </div>
    </section>
  );
}
