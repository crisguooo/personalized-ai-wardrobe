import { useState, useEffect, useMemo } from "react";
import { ArrowUpRight } from "lucide-react";
import { gaps, preferenceScore } from "../engine/wardrobe.js";
import Garment from "../components/Garment.jsx";
import FlatLay from "../components/FlatLay.jsx";
const pct = (n) => Math.round(n * 100);
export default function Missing({ state, profile, track }) {
  const results = useMemo(
      () => gaps(state.closet, profile),
      [state.closet, profile],
    ),
    [active, setActive] = useState(0);
  const gap = results[Math.min(active, results.length - 1)];
  useEffect(() => {
    if (gap)
      track("missing_item_viewed", { itemId: gap.item.id, likely: gap.likely });
  }, [gap?.item.id]);
  if (!gap)
    return (
      <div className="empty">
        <h1>Nothing obvious missing.</h1>
        <p>
          More outfit ratings may reveal new possibilities. Your current closet
          is a good place to start.
        </p>
      </div>
    );
  return (
    <section className="missing-page">
      <div className="page-heading compact">
        <div>
          <div className="eyebrow">MAKE MORE OF WHAT YOU OWN</div>
          <h1>
            One new piece.
            <br />
            <em>So many possibilities.</em>
          </h1>
          <p>
            Your biggest wardrobe gaps, ranked by how much they feel like you.
          </p>
        </div>
        <div className="missing-stamp">
          MORE OUTFITS.
          <br />
          LESS GUESSWORK.<span>✳</span>
        </div>
      </div>
      <div className="gap-tabs">
        {results.map((g, i) => (
          <button
            key={g.item.id}
            className={active === i ? "active" : ""}
            onClick={() => setActive(i)}
          >
            <span>0{i + 1}</span>
            <div>
              <b>{g.item.name}</b>
              <small>{g.likely} likely new looks</small>
            </div>
            <ArrowUpRight size={17} />
          </button>
        ))}
      </div>
      <div className="gap-feature">
        <div className="gap-illustration">
          <span className="eyebrow">THE MISSING PIECE / 0{active + 1}</span>
          <Garment item={gap.item} />
          <span className="ghost-label">
            NOT IN YOUR CLOSET · {gap.item.color.toUpperCase()}
          </span>
        </div>
        <div className="gap-story">
          <span className="eyebrow">
            {profile.ratings
              ? "YOUR PERSONALIZED WARDROBE GAP"
              : "AN EARLY WARDROBE POSSIBILITY"}
          </span>
          <h2>{gap.item.name}</h2>
          <div className="unlock-number">
            +{gap.likely}
            <span>
              outfits you might
              <br />
              actually reach for
            </span>
          </div>
          <p>{gap.why}</p>
          <div className="works-with">
            {[
              ["top", "tops"],
              ["bottom", "bottoms"],
              ["shoes", "shoes"],
            ].map(([key, label]) => (
              <div key={key}>
                <b>{gap.counts[key]}</b>
                <span>{label} you own</span>
              </div>
            ))}
          </div>
          <small>
            Estimated from {gap.possible} sampled valid combinations.{" "}
            {profile.ratings
              ? "Outfit quality threshold: " + pct(gap.threshold) + "/100."
              : "Rate outfits to personalize these estimates."}{" "}
            No prices, brands or shopping links.
          </small>
        </div>
      </div>
      <div className="section-heading">
        <h2>A few doors it opens.</h2>
        <span>THE DASHED PIECE IS THE ONLY NEW ONE.</span>
      </div>
      <div className="unlocked-grid">
        {gap.examples.map((o, i) => (
          <article key={o.id}>
            <div className="outfit-card-top">
              <span>POSSIBILITY 0{i + 1}</span>
              <span>{pct(preferenceScore(o, profile))} taste score</span>
            </div>
            <FlatLay outfit={o} ghostId={gap.item.id} small />
          </article>
        ))}
      </div>
      <details className="debug">
        <summary>Why this ranking?</summary>
        <p>
          We generate valid outfits that must include exactly this missing
          candidate; every other item is owned. We count only outfits passing
          the shared outfit-quality and taste thresholds. Recolored duplicates
          count once; value combines quality, predicted preference and
          diversity. Counts are bounded sample estimates, not exhaustive
          combinations.
        </p>
        <div className="ranking-table">
          {results.map((g) => (
            <div key={g.item.id}>
              <b>{g.item.name}</b>
              <span>{g.possible} sampled</span>
              <span>{g.likely} likely</span>
              <span>{g.weighted.toFixed(1)} weighted score</span>
            </div>
          ))}
        </div>
      </details>
    </section>
  );
}
