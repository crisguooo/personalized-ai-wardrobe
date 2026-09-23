import { useState, useEffect, useRef, useMemo } from "react";
import { X, Heart, ArrowRight, ArrowUpRight } from "lucide-react";
import {
  rank,
  explore,
  learn,
  features,
  preferenceScore,
  LABELS,
  REASONS,
} from "../engine/wardrobe.js";
import { event, appendEvents } from "../services/analytics.js";
import FlatLay from "../components/FlatLay.jsx";
import Empty from "../components/Empty.jsx";
import InsightMoment from "../components/InsightMoment.jsx";
const pct = (n) => Math.round(n * 100);
export default function Swipe({
  state,
  setState,
  profile,
  candidates,
  track,
  onBuilder,
}) {
  const [pending, setPending] = useState(false),
    [leaving, setLeaving] = useState(""),
    [drag, setDrag] = useState(0);
  const pointer = useRef(null),
    lock = useRef(false);
  const seen = new Set(state.feedback.map((f) => f.outfitId));
  const queue = useMemo(
    () =>
      state.learned
        ? rank(candidates, profile)
        : explore(candidates, Math.min(24, candidates.length)),
    [candidates, state.learned, profile],
  );
  const current =
    queue.find((o) => !seen.has(o.id)) ??
    candidates.find((o) => !seen.has(o.id));
  const milestone = state.feedback.length >= 5 && !state.learned;
  useEffect(() => {
    if (current && !milestone)
      track("outfit_viewed", {
        outfitId: current.id,
        phase: state.learned ? "personalized" : "exploration",
      });
  }, [current?.id, milestone, state.learned]);
  function rate(rating, reason) {
    if (!current || lock.current) return;
    lock.current = true;
    setLeaving(rating);
    setTimeout(() => {
      setState((s) => {
        const feedback = [
          ...s.feedback,
          {
            id: crypto.randomUUID(),
            outfitId: current.id,
            itemIds: current.itemIds,
            rating,
            reason: reason ?? null,
            timestamp: new Date().toISOString(),
            phase: s.learned ? "personalized" : "exploration",
          },
        ];
        return appendEvents(
          { ...s, feedback, profile: learn(feedback) },
          event(rating === "like" ? "outfit_liked" : "outfit_disliked", {
            outfitId: current.id,
          }),
          ...(reason ? [event("dislike_reason_selected", { reason })] : []),
        );
      });
      setPending(false);
      setLeaving("");
      setDrag(0);
      lock.current = false;
    }, 220);
  }
  if (milestone)
    return (
      <InsightMoment
        {...{ profile }}
        onContinue={() => {
          setState((s) =>
            appendEvents(
              { ...s, learned: true },
              event("style_profile_generated", { ratings: s.feedback.length }),
            ),
          );
        }}
      />
    );
  if (!current)
    return (
      <Empty
        title="A little more understood."
        text="You've explored the available combinations. Put what we've learned to work in your outfit studio, or add a few more pieces."
        action="Open my outfit studio"
        onClick={onBuilder}
      />
    );
  const progress = Math.min(5, state.feedback.length);
  return (
    <section className="swipe-page">
      <div className="swipe-heading">
        <div className="eyebrow">
          {state.learned ? "MADE MORE YOU" : "02 · A LITTLE STYLE INSTINCT"}
        </div>
        <h1>
          {state.learned ? (
            <>
              Now we're <em>getting you.</em>
            </>
          ) : (
            <>
              Would you <em>wear this?</em>
            </>
          )}
        </h1>
        <p>
          {state.learned
            ? "New combinations, ranked by your actual ratings."
            : "Go with your gut. Every choice helps us connect the dots."}
        </p>
      </div>
      <div className="swipe-layout">
        <aside className="swipe-aside">
          <span className="eyebrow">
            {state.learned ? "YOUR PERSONAL EDIT" : "THE EXPLORATION EDIT"}
          </span>
          <h3>
            {state.learned
              ? "Familiar pieces.\nBetter chemistry."
              : "A little variety.\nA little discovery."}
          </h3>
          <p>
            {state.learned
              ? "Your feedback changes how we rank these combinations. Keep rating to refine the picture."
              : "We’re trying different shapes, palettes and proportions to learn what feels like you."}
          </p>
          <div className="rating-dots">
            {Array.from({ length: 5 }, (_, i) => (
              <span className={i < progress ? "filled" : ""} key={i} />
            ))}
          </div>
          <small>
            {state.learned
              ? `${profile.ratings} outfits rated`
              : `${progress} of 5 first impressions`}
          </small>
          {state.learned && (
            <button className="text-button" onClick={onBuilder}>
              Visit the outfit studio
              <ArrowUpRight size={16} />
            </button>
          )}
        </aside>
        <div>
          <div
            className={`swipe-card ${leaving}`}
            style={{
              transform: drag
                ? `translateX(${drag}px) rotate(${drag / 20}deg)`
                : undefined,
            }}
            onPointerDown={(e) => {
              if (pending) return;
              pointer.current = e.clientX;
              e.currentTarget.setPointerCapture(e.pointerId);
            }}
            onPointerMove={(e) => {
              if (pointer.current !== null)
                setDrag(e.clientX - pointer.current);
            }}
            onPointerUp={() => {
              if (drag > 85) rate("like");
              else if (drag < -85) setPending(true);
              setDrag(0);
              pointer.current = null;
            }}
            onPointerCancel={() => {
              pointer.current = null;
              setDrag(0);
            }}
          >
            <div className="outfit-card-top">
              <span>
                LOOK {String(state.feedback.length + 1).padStart(2, "0")}
              </span>
              <span>
                {state.learned
                  ? `${pct(preferenceScore(current, profile))}/100 taste score`
                  : "A fresh combination"}
              </span>
            </div>
            <FlatLay outfit={current} />
            <div className="outfit-card-caption">
              {Object.entries(features(current))
                .filter(
                  ([key, v]) =>
                    v === 1 &&
                    [
                      "relaxed",
                      "fitted",
                      "layered",
                      "contrast",
                      "monochrome",
                      "balanced",
                    ].includes(key),
                )
                .slice(0, 2)
                .map(([key]) => (
                  <span key={key}>{LABELS[key]}</span>
                ))}
            </div>
          </div>
          {pending ? (
            <div className="reason-panel">
              <h3>
                What felt off? <span>Optional</span>
              </h3>
              <div className="reason-chips">
                {REASONS.map((r) => (
                  <button
                    key={r}
                    disabled={!!leaving}
                    onClick={() => rate("dislike", r)}
                  >
                    {r}
                  </button>
                ))}
              </div>
              <button
                className="text-button"
                disabled={!!leaving}
                onClick={() => rate("dislike")}
              >
                Skip reason & keep going
                <ArrowRight size={16} />
              </button>
              <button
                className="cancel-reason"
                onClick={() => setPending(false)}
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="rating-actions">
              <button
                className="nope"
                disabled={!!leaving}
                onClick={() => setPending(true)}
              >
                <X size={22} />
                Not for me
              </button>
              <button
                className="love"
                disabled={!!leaving}
                onClick={() => rate("like")}
              >
                <Heart size={22} />
                Love this
              </button>
            </div>
          )}
          <p className="swipe-hint">
            {pending
              ? "Your choice, your reasons."
              : "Swipe left or right, or use the buttons."}
          </p>
        </div>
        <aside className="swipe-note">
          <span>100%</span>
          <p>from your closet</p>
          <div className="handwritten">
            New possibilities,
            <br />
            same favorite pieces.
          </div>
        </aside>
      </div>
    </section>
  );
}
