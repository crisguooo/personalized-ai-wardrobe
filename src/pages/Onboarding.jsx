import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { BY_ID, COLORS, DEFAULT_COLORS } from "../data/catalog.js";
import {
  SETUP_GROUPS,
  normalizeOnboarding,
  canStartEarly,
  hasEssentials,
  nextGroup,
} from "../engine/onboarding.js";
import { appendEvents, event } from "../services/analytics.js";
import Garment from "../components/Garment.jsx";
import "../onboarding.css";

export default function Onboarding({
  state,
  setState,
  onComplete,
  storageError,
}) {
  const draft = normalizeOnboarding(state.onboarding);
  const group = SETUP_GROUPS[draft.group];
  const choices = draft.selections[group.key] ?? [];
  const archetype = choices[draft.colorIndex];
  const selectedColors = Object.keys(COLORS).filter((color) =>
    state.closet.includes(`${archetype}:${color}`),
  );
  const [previewColor, setPreviewColor] = useState(null);
  const title = useRef(null);
  const screen = `${draft.step}-${draft.group}-${draft.colorIndex}`;
  useEffect(() => {
    setPreviewColor(null);
    window.scrollTo({ top: 0, behavior: "instant" });
    title.current?.focus({ preventScroll: true });
  }, [screen]);

  const update = (next) => setState((s) => ({ ...s, onboarding: next }));
  const showReady = () =>
    update({ ...draft, step: "ready", resumeStep: draft.step });
  // Once the three essentials are covered, optional sections never gate entry.
  const early =
    canStartEarly(state.closet) ||
    (draft.group >= 3 && hasEssentials(state.closet));
  const complete = hasEssentials(state.closet);
  const groupAlreadyCovered = state.closet.some(
    (id) =>
      BY_ID[id]?.category ===
      { tops: "top", bottoms: "bottom", shoes: "shoes" }[group.key],
  );
  function chooseFit(key) {
    const removing = choices.includes(key);
    const next = removing
      ? choices.filter((k) => k !== key)
      : [...choices, key];
    setState((s) => ({
      ...s,
      closet: removing
        ? s.closet.filter((id) => BY_ID[id]?.archetype !== key)
        : s.closet,
      onboarding: {
        ...draft,
        selections: { ...draft.selections, [group.key]: next },
      },
    }));
  }
  function chooseColor(color) {
    const id = `${archetype}:${color}`;
    setPreviewColor(color);
    setState((s) => {
      const removing = s.closet.includes(id);
      return appendEvents(
        {
          ...s,
          closet: removing
            ? s.closet.filter((i) => i !== id)
            : [...s.closet, id],
        },
        event(removing ? "closet_item_removed" : "closet_item_added", {
          id,
          source: "onboarding",
        }),
      );
    });
  }
  function forward() {
    if (draft.step === "welcome") return update({ ...draft, step: "fits" });
    if (draft.step === "fits")
      return choices.length
        ? update({ ...draft, step: "colors", colorIndex: 0 })
        : update(nextGroup(draft));
    if (draft.step === "colors")
      return update(
        draft.colorIndex + 1 < choices.length
          ? { ...draft, colorIndex: draft.colorIndex + 1 }
          : nextGroup(draft),
      );
  }
  function back() {
    if (draft.step === "ready")
      return update({ ...draft, step: draft.resumeStep });
    if (draft.step === "colors")
      return update(
        draft.colorIndex > 0
          ? { ...draft, colorIndex: draft.colorIndex - 1 }
          : { ...draft, step: "fits" },
      );
    if (draft.group === 6) return update({ ...draft, step: "welcome" });
    if (!draft.group)
      return update({ ...draft, step: "fits", group: 6, colorIndex: 0 });
    const previousChoices =
      draft.selections[SETUP_GROUPS[draft.group - 1].key] ?? [];
    update({
      ...draft,
      group: draft.group - 1,
      step: previousChoices.length ? "colors" : "fits",
      colorIndex: Math.max(0, previousChoices.length - 1),
    });
  }
  const disabled =
    draft.step === "fits"
      ? !choices.length && !group.optional && !groupAlreadyCovered
      : draft.step === "colors"
        ? !selectedColors.length
        : false;
  const item = archetype
    ? BY_ID[
        `${archetype}:${previewColor ?? selectedColors.at(-1) ?? DEFAULT_COLORS[archetype] ?? "grey"}`
      ]
    : null;
  return (
    <div className={`onboarding onboarding-${draft.step}`}>
      <header className="setup-header">
        {draft.step !== "welcome" ? (
          <button className="setup-back" onClick={back}>
            <ArrowLeft size={18} />
            <span>Back</span>
          </button>
        ) : (
          <span />
        )}
        <div className="wordmark" aria-label="Wearwell">
          wearwell<span>✳</span>
        </div>
        {group.optional && ["fits", "colors"].includes(draft.step) ? (
          <button
            className="setup-skip"
            onClick={() => update(nextGroup(draft))}
          >
            Skip
          </button>
        ) : (
          <span />
        )}
      </header>
      {!["welcome", "ready"].includes(draft.step) && draft.group !== 6 && (
        <div
          className="setup-progress"
          role="progressbar"
          aria-label="Closet setup"
          aria-valuemin={0}
          aria-valuemax={3}
          aria-valuenow={Math.min(
            3,
            draft.group +
              (draft.step === "colors"
                ? (draft.colorIndex + 1) / (choices.length + 1)
                : 0),
          )}
          aria-valuetext={
            group.optional ? "Essentials done. Optional pieces." : group.key
          }
        >
          {[0, 1, 2].map((i) => (
            <span key={i}>
              <i
                style={{
                  width: `${Math.max(0, Math.min(1, draft.group - i + (draft.step === "colors" ? (draft.colorIndex + 1) / (choices.length + 1) : 0))) * 100}%`,
                }}
              />
            </span>
          ))}
        </div>
      )}
      {storageError && (
        <p className="setup-error" role="alert">
          {storageError}
        </p>
      )}
      <main className="setup-main" key={screen}>
        {draft.step === "welcome" && (
          <>
            <div className="setup-intro">
              <span className="eyebrow">A WARDROBE THAT GETS YOU</span>
              <h1 ref={title} tabIndex={-1}>
                Your clothes.
                <br />
                <em>Your kind of style.</em>
              </h1>
              <p>Start with a few pieces you already own.</p>
            </div>
            <div
              className="setup-welcome-art"
              aria-label="A tee, jeans and sneakers"
            >
              <div>
                <Garment item={BY_ID["crew-tee:white"]} />
              </div>
              <div>
                <Garment item={BY_ID["wide-jeans:blue"]} />
              </div>
              <div>
                <Garment item={BY_ID["sneakers:white"]} />
              </div>
              <span className="setup-art-star" aria-hidden="true">
                ✳
              </span>
            </div>
          </>
        )}
        {draft.step === "fits" && (
          <>
            <div className="setup-question">
              <span className="eyebrow">
                {group.optional
                  ? "A LITTLE EXTRA · OPTIONAL"
                  : "JUST THE EVERYDAY FAVORITES"}
              </span>
              <h1 ref={title} tabIndex={-1}>
                {group.title}
              </h1>
              <p>Pick as many as you like.</p>
            </div>
            <div className="setup-fit-grid">
              {group.items.map((key) => {
                const ownedColor = state.closet
                  .find((id) => BY_ID[id]?.archetype === key)
                  ?.split(":")[1];
                const garment =
                  BY_ID[
                    `${key}:${ownedColor ?? DEFAULT_COLORS[key] ?? "grey"}`
                  ];
                const selected = choices.includes(key);
                return (
                  <button
                    className={`setup-fit ${selected ? "chosen" : ""}`}
                    key={key}
                    onClick={() => chooseFit(key)}
                    aria-pressed={selected}
                    aria-label={garment.name}
                  >
                    <Garment item={garment} />
                    <span>{garment.name}</span>
                    <span className="setup-check" aria-hidden="true">
                      {selected && <Check size={14} />}
                    </span>
                  </button>
                );
              })}
            </div>
          </>
        )}
        {draft.step === "colors" && item && (
          <>
            <div className="setup-question">
              <span className="eyebrow">{item.name}</span>
              <h1 ref={title} tabIndex={-1}>
                Which colors
                <br />
                do you own?
              </h1>
              <p>Pick every color you have.</p>
            </div>
            <div className="setup-color-art">
              <Garment item={item} />
            </div>
            <div
              className="setup-colors"
              aria-label={`Colors for ${item.name}`}
            >
              {Object.entries(COLORS).map(([color, { hex }]) => (
                <button
                  key={color}
                  aria-pressed={selectedColors.includes(color)}
                  aria-label={color}
                  className={selectedColors.includes(color) ? "chosen" : ""}
                  onClick={() => chooseColor(color)}
                >
                  <span style={{ background: hex }}>
                    {selectedColors.includes(color) && (
                      <Check
                        size={20}
                        color={
                          [
                            "black",
                            "navy",
                            "brown",
                            "red",
                            "burgundy",
                            "olive",
                          ].includes(color)
                            ? "white"
                            : "#292923"
                        }
                      />
                    )}
                  </span>
                  <span>{color}</span>
                </button>
              ))}
            </div>
          </>
        )}
        {draft.step === "ready" && (
          <>
            <div className="setup-question">
              <span className="setup-payoff-star" aria-hidden="true">
                ✳
              </span>
              <h1 ref={title} tabIndex={-1}>
                Your closet
                <br />
                is <em>taking shape.</em>
              </h1>
              <p className="setup-piece-count">{state.closet.length} pieces</p>
            </div>
            <div className="setup-preview" aria-label="Your selected clothes">
              {state.closet.slice(0, 12).map((id) => (
                <div key={id}>
                  <Garment item={BY_ID[id]} />
                </div>
              ))}
            </div>
            <p className="setup-payoff-note">
              Now, let’s find what feels like you.
            </p>
          </>
        )}
      </main>
      <footer className="setup-footer">
        <div>
          {draft.step === "ready" ? (
            <button
              className="primary"
              disabled={!complete}
              onClick={onComplete}
            >
              Dress for today
              <ArrowRight size={19} />
            </button>
          ) : early && draft.step !== "welcome" ? (
            <>
              <button className="primary" onClick={showReady}>
                Start with these
                <ArrowRight size={19} />
              </button>
              <button
                className="setup-secondary"
                disabled={disabled}
                onClick={forward}
              >
                Keep adding
              </button>
            </>
          ) : (
            <button className="primary" disabled={disabled} onClick={forward}>
              {draft.step === "welcome" ? "Build my closet" : "Continue"}
              <ArrowRight size={19} />
            </button>
          )}
          {draft.step === "welcome" && (
            <span className="setup-footnote">
              A few favorites are enough. Add more whenever.
            </span>
          )}
        </div>
      </footer>
    </div>
  );
}
