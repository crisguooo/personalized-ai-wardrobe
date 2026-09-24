import { useMemo, useState } from "react";
import { ArrowUpRight, SlidersHorizontal, Shuffle, Heart } from "lucide-react";
import { brandReferences, BRAND_STYLES } from "../data/brands.js";
import { insights, LABELS } from "../engine/wardrobe.js";
import "../style-reference.css";
export default function Style({ profile, onLearn }) {
  const [filter, setFilter] = useState("All styles");
  const [showFilter, setShowFilter] = useState(false);
  const [index, setIndex] = useState(0);
  const brands = useMemo(
    () => brandReferences(profile, filter),
    [profile, filter],
  );
  const brand = brands[index % brands.length];
  const signals = insights(profile).prefer.slice(0, 5);
  return (
    <section className="style-reference">
      <div className="style-reference-heading">
        <h1>My style.</h1>
        <button className="text-button" onClick={onLearn}>
          Keep discovering <Heart size={15} />
        </button>
      </div>
      <section
        className="style-section personal-style"
        aria-labelledby="personal-style-title"
      >
        <span className="eyebrow">01 / YOUR PREFERENCES</span>
        <h2 id="personal-style-title">Your style</h2>
        {signals.length > 0 ? (
          <div className="style-reference-tags">
            {signals.map(([key]) => (
              <span key={key}>{LABELS[key]}</span>
            ))}
          </div>
        ) : (
          <p>Like a few looks to discover your style tags.</p>
        )}
      </section>
      <section
        className="style-section similar-brands"
        aria-labelledby="similar-brands-title"
      >
        <div className="brand-toolbar">
          <div>
            <span className="eyebrow">02 / YOUR STYLE REFERENCES</span>
            <h2 id="similar-brands-title">Brands like you</h2>
          </div>
          <button
            aria-expanded={showFilter}
            aria-controls="brand-filters"
            onClick={() => setShowFilter(!showFilter)}
          >
            <SlidersHorizontal size={15} /> Filter
          </button>
        </div>
        {showFilter && (
          <div
            id="brand-filters"
            className="brand-filters"
            role="group"
            aria-label="Brand style filters"
          >
            {BRAND_STYLES.map((s) => (
              <button
                key={s}
                aria-pressed={filter === s}
                onClick={() => {
                  setFilter(s);
                  setIndex(0);
                }}
              >
                {s}
              </button>
            ))}
          </div>
        )}
        <article className="brand-reference" aria-live="polite">
          <div className="brand-logo-frame">
            <img
              key={brand.id}
              className="brand-logo"
              src={brand.image}
              alt={`${brand.name} logo`}
            />
          </div>
          <span className="eyebrow">{brand.styles.join(" / ")}</span>
          <h3>{brand.name}</h3>
          <p>{brand.description}</p>
          <div className="brand-reference-actions">
            <button
              className="outline"
              disabled={brands.length < 2}
              onClick={() => setIndex((index + 1) % brands.length)}
            >
              <Shuffle size={15} /> Try another brand
            </button>
            <a href={brand.url} target="_blank" rel="noreferrer">
              Explore brand <ArrowUpRight size={14} />
            </a>
          </div>
        </article>
      </section>
    </section>
  );
}
