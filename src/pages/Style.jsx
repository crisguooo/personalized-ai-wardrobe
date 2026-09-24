import { useState } from "react";
import { Heart, Plus, Sparkles } from "lucide-react";
import { insights, LABELS, hasEvidence } from "../engine/wardrobe.js";
import { summarizeStyle } from "../services/ai.js";
const pct = (n) => Math.round(n * 100);
export default function Style({ profile, state, onLearn }) {
  const found = insights(profile),
    [note, setNote] = useState(""),
    [status, setStatus] = useState("idle");
  const dimensions = [
    ["relaxed", "Silhouette", "Relaxed"],
    ["neutral", "Palette", "Neutral"],
    ["layered", "Layers", "Layered"],
    ["dressy", "Polish", "Dressy"],
  ];
  async function getNote() {
    setStatus("loading");
    try {
      const result = await summarizeStyle(profile, AbortSignal.timeout(15000));
      setNote(result.text);
      setStatus(result.source);
    } catch (e) {
      setNote(e.message);
      setStatus("error");
    }
  }
  const acceptance = (phase) => {
    const f = state.feedback.filter((e) => e.phase === phase);
    return f.length
      ? `${pct(f.filter((e) => e.rating === "like").length / f.length)}%`
      : "—";
  };
  return (
    <section className="style-page">
      <div className="page-heading compact">
        <div>
          <div className="eyebrow">A PORTRAIT, ALWAYS IN PROGRESS</div>
          <h1>
            Your style DNA.
            <br />
            <em>Distinctly unfinished.</em>
          </h1>
          <p>
            {profile.ratings} outfits rated. A little more understood with every
            one.
          </p>
        </div>
        <button className="primary" onClick={onLearn}>
          Keep discovering
          <Heart size={17} />
        </button>
      </div>
      <div className="dna-layout">
        <div className="dna-card">
          <div className="dna-header">
            <span>YOUR CURRENT SIGNALS</span>
            <span>✳</span>
          </div>
          {dimensions.map(([key, title, label]) => {
            const known = hasEvidence(profile, key)
              ? profile.evidence[key]
              : null;
            const weight = profile.weights[key] ?? 0;
            return (
              <div className="dna-row" key={key}>
                <div>
                  <h3>{title}</h3>
                  <span>
                    {known
                      ? weight < 0
                        ? `Less ${label.toLowerCase()}`
                        : label
                      : "Still exploring"}
                  </span>
                </div>
                <div className="dna-track">
                  <span
                    style={{ width: `${known ? (weight + 1) * 50 : 50}%` }}
                    className={!known ? "unknown" : ""}
                  />
                </div>
                <small>
                  {known
                    ? `${Math.round(known.count)} signal${Math.round(known.count) === 1 ? "" : "s"} · ${weight >= 0 ? "+" : ""}${weight.toFixed(2)}`
                    : profile.evidence[key]
                      ? "Not enough evidence yet"
                      : "No evidence yet"}
                </small>
              </div>
            );
          })}
          <p>
            These bars show preference signals, not a fixed identity. The middle
            is neutral.
          </p>
        </div>
        <div className="style-insights">
          <span className="eyebrow">THE PATTERNS WE'RE SEEING</span>
          <h2>
            No labels.
            <br />
            <em>Just your instincts.</em>
          </h2>
          {found.prefer.map(([k]) => (
            <div className="style-insight" key={k}>
              <Plus size={18} />
              <div>
                <h3>{LABELS[k]}</h3>
                <p>
                  Positive evidence across{" "}
                  {Math.ceil(profile.evidence[k].count)} weighted observations.
                </p>
              </div>
            </div>
          ))}
          {found.avoid.map(([k]) => (
            <div className="style-insight" key={k}>
              <span>−</span>
              <div>
                <h3>A little less {LABELS[k].toLowerCase()}</h3>
                <p>
                  Your reasons or repeated combinations point away from this.
                </p>
              </div>
            </div>
          ))}
          {!found.prefer.length && !found.avoid.length && (
            <p>
              Rate a few outfits and this page will tell your story. No preset
              personality types.
            </p>
          )}
          <button
            className="text-button"
            disabled={status === "loading" || !profile.ratings}
            onClick={getNote}
          >
            {status === "loading" ? "Connecting…" : "Put my style into words"}
            <Sparkles size={16} />
          </button>
          {note && (
            <p
              role="status"
              className={status === "error" ? "api-note error" : "api-note"}
            >
              {note}
            </p>
          )}
        </div>
      </div>
      <div className="learning-stats">
        <div>
          <span>{profile.ratings}</span>
          <p>first impressions recorded</p>
        </div>
        <div>
          <span>{acceptance("exploration")}</span>
          <p>loved during exploration</p>
        </div>
        <div>
          <span>{acceptance("personalized")}</span>
          <p>loved after personalization</p>
        </div>
      </div>
      {import.meta.env.DEV && (
        <details className="debug">
          <summary>Behind the preferences</summary>
          <p>
            Likes support shared features. Specific reasons update relevant
            dimensions. Unexplained dislikes mostly affect the top–bottom
            combination; they never blacklist every garment.
          </p>
          <pre>{JSON.stringify(profile, null, 2)}</pre>
        </details>
      )}
    </section>
  );
}
