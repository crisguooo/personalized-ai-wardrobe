import { useState, useEffect, useRef, useMemo } from "react";
import {
  ArrowUpRight,
  Check,
  Heart,
  ChevronRight,
  Sparkles,
  Shuffle,
  Bookmark,
  Plus,
  X,
} from "lucide-react";
import { BY_ID } from "../data/catalog.js";
import {
  rank,
  validity,
  swapCandidates,
  preferenceScore,
  learn,
} from "../engine/wardrobe.js";
import { event, appendEvents } from "../services/analytics.js";
import Garment from "../components/Garment.jsx";
import PaletteNote from "../components/PaletteNote.jsx";
import ScoreDebug from "../components/ScoreDebug.jsx";
import FlatLay from "../components/FlatLay.jsx";
import WeatherNeeds from "../components/WeatherNeeds.jsx";
import {
  today,
  validRange,
  rankForWeather,
  weatherCandidates,
  weatherReason,
  temperature,
} from "../engine/weather.js";
const pct = (n) => Math.round(n * 100);
import "../outfit-deck.css";
export default function Builder({
  state,
  setState,
  profile,
  track,
  notify,
  onLearn,
  onWeather,
}) {
  const hasWeather =
    state.weather?.date === today() &&
    validRange(state.weather.lowC, state.weather.highC);
  const order = (
    items,
    occasion = "Everyday",
    options = {},
    rankingProfile = profile,
  ) =>
    hasWeather
      ? rankForWeather(
          items,
          rankingProfile,
          state.weather,
          state.thermalOverrides,
          occasion,
          options,
        )
      : rank(items, rankingProfile, occasion, options);
  const [occasion, setOccasion] = useState(
    () => state.generated.at(-1)?.occasion ?? "Everyday",
  );
  const candidates = useMemo(
    () =>
      weatherCandidates(
        state.closet,
        profile,
        hasWeather ? state.weather : undefined,
        state.thermalOverrides,
        occasion,
      ),
    [state.closet, profile, state.weather, state.thermalOverrides, occasion],
  );
  const [current, setCurrent] = useState(
      () =>
        order(candidates, state.generated.at(-1)?.occasion ?? "Everyday")[0],
    ),
    [selected, setSelected] = useState(null),
    [tab, setTab] = useState("studio"),
    [activeRefinement, setActiveRefinement] = useState(null);
  const [reviewed, setReviewed] = useState([]),
    [deckDone, setDeckDone] = useState(false),
    [drag, setDrag] = useState(0);
  const ratingLock = useRef(false),
    pointer = useRef(null),
    suppressClick = useRef(false);
  useEffect(() => {
    ratingLock.current = false;
    setDrag(0);
  }, [current?.id]);
  function rateLook(rating) {
    if (!current || ratingLock.current || deckDone) return;
    ratingLock.current = true;
    const feedback = {
      id: crypto.randomUUID(),
      outfitId: current.id,
      itemIds: current.itemIds,
      aestheticDirection: current.aestheticDirection,
      colorStrategy: current.colorStrategy,
      heroItemId: current.heroItemId,
      outfitArchetype: current.outfitArchetype,
      rating,
      reason: null,
      timestamp: new Date().toISOString(),
      phase: "personalized",
      occasion,
    };
    const nextProfile = learn([...state.feedback, feedback]);
    setState((s) =>
      appendEvents(
        {
          ...s,
          feedback: [...s.feedback, feedback],
          profile: learn([...s.feedback, feedback]),
        },
        event(rating === "like" ? "outfit_liked" : "outfit_disliked", {
          outfitId: current.id,
          source: "studio",
          occasion,
        }),
      ),
    );
    const seen = [...reviewed, current.id];
    setReviewed(seen);
    const next = order(
      candidates.filter((o) => !seen.includes(o.id)),
      occasion,
      {
        refinement: activeRefinement,
        recent: [...state.feedback.slice(-3), feedback],
      },
      nextProfile,
    )[0];
    setDrag(0);
    if (next) apply(next);
    else {
      setDeckDone(true);
      notify("You've seen these looks. Try a new plan or a refinement.");
    }
  }
  const available = state.closet.map((id) => BY_ID[id]);
  useEffect(() => {
    if (
      !current ||
      validity(current, state.closet).length ||
      (hasWeather &&
        !rankForWeather(
          [current],
          profile,
          state.weather,
          state.thermalOverrides,
        ).length)
    )
      setCurrent(order(candidates, occasion)[0]);
  }, [candidates, state.weather, state.thermalOverrides]);
  function apply(
    outfit,
    name = "personalized_outfit_generated",
    nextOccasion = occasion,
  ) {
    if (!outfit || validity(outfit, state.closet).length) return;
    if (
      hasWeather &&
      !rankForWeather([outfit], profile, state.weather, state.thermalOverrides)
        .length
    ) {
      notify(
        "That piece doesn’t suit today’s temperature. Try a seasonal alternative.",
      );
      return;
    }
    setCurrent(outfit);
    setDeckDone(false);
    setSelected(null);
    setState((s) =>
      appendEvents(
        {
          ...s,
          generated: [
            ...s.generated.filter((o) => o.id !== outfit.id),
            {
              id: outfit.id,
              itemIds: outfit.itemIds,
              aestheticDirection: outfit.aestheticDirection,
              colorStrategy: outfit.colorStrategy,
              heroItemId: outfit.heroItemId,
              outfitArchetype: outfit.outfitArchetype,
              occasion: nextOccasion,
              createdAt: new Date().toISOString(),
            },
          ].slice(-60),
        },
        event(name, { outfitId: outfit.id, occasion: nextOccasion }),
      ),
    );
  }
  function styleMe() {
    ratingLock.current = false;
    setReviewed([]);
    setActiveRefinement(null);
    const recent = new Set(state.generated.slice(-8).map((o) => o.id));
    const list = order(
      candidates.filter((o) => o.id !== current?.id),
      occasion,
      { recent: state.generated.slice(-4) },
    );
    apply(list.find((o) => !recent.has(o.id)) ?? list[0] ?? current);
  }
  function doSwap() {
    if (!selected) {
      notify("Select a piece on the canvas first.");
      return;
    }
    const options = swapCandidates(current, selected, state.closet);
    const next = order(options, occasion, {
      diversity: false,
      refinement: activeRefinement,
    })[0];
    if (next) {
      apply(next, "outfit_item_swapped");
      notify("One piece changed. The rest stays yours.");
    } else notify("Add another piece in this category to swap it.");
  }
  function refine(type) {
    const options = order(
      candidates.filter((o) => o.id !== current.id),
      occasion,
      { refinement: type, diversity: false },
    );
    setActiveRefinement(type);
    if (options[0]) apply(options[0]);
    else
      notify(
        "This closet has no matching refinement yet. Try adding a layer or another silhouette.",
      );
  }
  const isSaved = state.saved.some((o) => o.id === current?.id);
  function save() {
    if (state.saved.some((o) => o.id === current.id)) {
      notify("This look is already saved.");
      return;
    }
    setState((s) =>
      s.saved.some((o) => o.id === current.id)
        ? s
        : {
            ...s,
            saved: [
              ...s.saved,
              {
                id: current.id,
                itemIds: current.itemIds,
                aestheticDirection: current.aestheticDirection,
                colorStrategy: current.colorStrategy,
                heroItemId: current.heroItemId,
                outfitArchetype: current.outfitArchetype,
                occasion,
                createdAt: new Date().toISOString(),
              },
            ],
          },
    );
    notify("Saved to your outfit collection.");
  }
  return (
    <section className="builder-page">
      <div className="page-heading compact">
        <div>
          <div className="eyebrow">YOUR PERSONAL OUTFIT STUDIO</div>
          <h1>
            Same clothes.
            <br />
            <em>New chemistry.</em>
          </h1>
        </div>
        <button className="outline" onClick={onLearn}>
          <Heart size={17} />
          Refine my taste
        </button>
      </div>
      {hasWeather && (
        <WeatherNeeds
          closet={state.closet}
          weather={state.weather}
          overrides={state.thermalOverrides}
        />
      )}
      <div className="segmented studio-tabs">
        <button
          className={tab === "studio" ? "active" : ""}
          onClick={() => setTab("studio")}
        >
          The studio
        </button>
        <button
          className={tab === "saved" ? "active" : ""}
          onClick={() => setTab("saved")}
        >
          Saved looks · {state.saved.length}
        </button>
      </div>
      {tab === "saved" ? (
        <div className="saved-grid">
          {state.saved.length ? (
            state.saved.map((o) => (
              <button
                className="saved-card"
                key={o.id}
                onClick={() => {
                  const errors = validity(o, state.closet);
                  if (errors.length) {
                    notify(errors[0]);
                    return;
                  }
                  if (
                    hasWeather &&
                    !rankForWeather(
                      [o],
                      profile,
                      state.weather,
                      state.thermalOverrides,
                    ).length
                  ) {
                    notify(
                      "This saved look doesn’t suit today’s temperature. Choose a new look.",
                    );
                    return;
                  }
                  setCurrent(o);
                  setOccasion(o.occasion ?? "Everyday");
                  setTab("studio");
                }}
              >
                <FlatLay outfit={o} small />
                <span>
                  {o.occasion} <ArrowUpRight size={16} />
                </span>
              </button>
            ))
          ) : (
            <div className="inline-empty">
              Your favorite combinations belong here. Save a look from the
              studio.
            </div>
          )}
        </div>
      ) : !current ? (
        <div className="inline-empty">
          <p>
            Start with a base and shoes that suit today’s temperature. Review
            today’s suggestions to build a comfortable look.
          </p>
          <button className="primary" onClick={onWeather}>
            Review today’s needs
          </button>
        </div>
      ) : (
        <div className="builder-layout">
          <aside className="builder-controls">
            <button className="weather-pill" onClick={onWeather}>
              {hasWeather
                ? `${temperature(state.weather.lowC, state.weather.unit)} → ${temperature(state.weather.highC, state.weather.unit)} · Edit weather`
                : "Add today’s temperatures"}
            </button>
            <span className="eyebrow">WHAT'S THE PLAN?</span>
            <div className="occasion-list">
              {["Everyday", "Going out", "Work", "Date", "Comfy"].map((o) => (
                <button
                  className={occasion === o ? "active" : ""}
                  key={o}
                  onClick={() => {
                    setOccasion(o);
                    setReviewed([]);
                    ratingLock.current = false;
                    setActiveRefinement(null);
                    apply(
                      order(
                        weatherCandidates(
                          state.closet,
                          profile,
                          hasWeather ? state.weather : undefined,
                          state.thermalOverrides,
                          o,
                        ),
                        o,
                      )[0],
                      "occasion_outfit_generated",
                      o,
                    );
                  }}
                >
                  {o}
                  {occasion === o ? (
                    <Check size={16} />
                  ) : (
                    <ChevronRight size={16} />
                  )}
                </button>
              ))}
            </div>
            <button className="primary" onClick={styleMe}>
              <Sparkles size={18} />
              Style me
            </button>
            <div className="studio-insight">
              <span className="eyebrow">A LITTLE MORE YOU</span>
              <p>
                {profile.ratings
                  ? `Built from ${profile.ratings} outfit ratings and the ${state.closet.length} pieces in your closet.`
                  : "Your first looks start with variety. Rate a few to help us learn your taste."}
              </p>
            </div>
            <div className="owned-picker">
              <span className="eyebrow">ON YOUR RAIL</span>
              <div>
                {available.map((i) => (
                  <button
                    key={i.id}
                    title={`${i.color} ${i.name}`}
                    onClick={() => {
                      const old = current.itemIds.find(
                        (id) =>
                          BY_ID[id].category === i.category &&
                          (i.category !== "accessory" ||
                            BY_ID[id].accessorySlot === i.accessorySlot),
                      );
                      let ids = old
                        ? current.itemIds.map((id) => (id === old ? i.id : id))
                        : [...current.itemIds, i.id];
                      const next = {
                        id: [...ids].sort().join("|"),
                        itemIds: ids,
                      };
                      if (!validity(next, state.closet).length) apply(next);
                      else
                        notify(
                          "That piece would make the layers too bulky. Try another.",
                        );
                    }}
                  >
                    <Garment item={i} />
                  </button>
                ))}
              </div>
            </div>
          </aside>
          <div className="builder-deck-column">
            <div className="studio-canvas outfit-deck">
              <div className="outfit-card-top">
                <span>{occasion.toUpperCase()} / YOUR EDIT</span>
                <button
                  onClick={save}
                  className="save-button"
                  aria-pressed={isSaved}
                >
                  <Bookmark
                    size={16}
                    fill={isSaved ? "currentColor" : "none"}
                  />
                  {isSaved ? "Saved" : "Save look"}
                </button>
              </div>
              {deckDone ? (
                <div className="deck-complete">
                  <h2>A little more understood.</h2>
                  <p>
                    You've rated these looks. Try another plan or make a small
                    shift below.
                  </p>
                  <button
                    className="outline"
                    onClick={() => {
                      setReviewed([]);
                      setDeckDone(false);
                      ratingLock.current = false;
                      styleMe();
                    }}
                  >
                    Browse again
                  </button>
                </div>
              ) : (
                <div
                  key={current.id}
                  className="deck-card"
                  style={{
                    transform: `translateX(${drag}px) rotate(${drag / 35}deg)`,
                  }}
                  onClickCapture={(e) => {
                    if (suppressClick.current) {
                      e.preventDefault();
                      e.stopPropagation();
                      suppressClick.current = false;
                    }
                  }}
                  onPointerDown={(e) => {
                    if (e.button === 0) {
                      pointer.current = { x: e.clientX, y: e.clientY };
                      suppressClick.current = false;
                    }
                  }}
                  onPointerMove={(e) => {
                    if (!pointer.current) return;
                    const dx = e.clientX - pointer.current.x,
                      dy = e.clientY - pointer.current.y;
                    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 8) {
                      e.currentTarget.setPointerCapture(e.pointerId);
                      setDrag(Math.max(-130, Math.min(130, dx)));
                    }
                  }}
                  onPointerUp={(e) => {
                    if (!pointer.current) return;
                    const dx = e.clientX - pointer.current.x,
                      dy = e.clientY - pointer.current.y;
                    pointer.current = null;
                    if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy)) {
                      suppressClick.current = true;
                      rateLook(dx < 0 ? "like" : "dislike");
                    }
                    setDrag(0);
                  }}
                  onPointerCancel={() => {
                    pointer.current = null;
                    setDrag(0);
                  }}
                >
                  <FlatLay
                    outfit={current}
                    selected={selected}
                    onSelect={setSelected}
                  />
                  {Math.abs(drag) > 35 && (
                    <span className="deck-drag-label">
                      {drag < 0 ? "Like" : "Not for me"}
                    </span>
                  )}
                </div>
              )}
              <div className="deck-votes">
                <button
                  className="deck-like"
                  disabled={deckDone}
                  onClick={() => rateLook("like")}
                  aria-label="Like this outfit"
                >
                  <Heart size={21} />
                  <span>Like</span>
                </button>
                <span>Would you wear this?</span>
                <button
                  disabled={deckDone}
                  onClick={() => rateLook("dislike")}
                  aria-label="Dislike this outfit"
                >
                  <X size={21} />
                  <span>Not for me</span>
                </button>
              </div>
              <PaletteNote outfit={current} />
              <ScoreDebug
                outfit={current}
                profile={profile}
                occasion={occasion}
                refinement={activeRefinement}
              />
              {hasWeather && (
                <div className="weather-reason">
                  <span className="eyebrow">WHY THESE PIECES</span>
                  <p>
                    {weatherReason(
                      current,
                      state.weather,
                      state.thermalOverrides,
                    )}
                  </p>
                </div>
              )}
              <div className="canvas-bottom">
                <span>
                  {selected
                    ? `${BY_ID[selected].color} ${BY_ID[selected].name}`
                    : "Tap a piece to make a small change."}
                </span>
                <button
                  className="outline"
                  disabled={!selected}
                  onClick={doSwap}
                >
                  <Shuffle size={15} />
                  Swap this
                </button>
              </div>
            </div>
            <aside className="refinement-panel">
              <span className="eyebrow">THE FINISHING TOUCH</span>
              <h3>
                Almost you?
                <br />
                <em>Make a little shift.</em>
              </h3>
              <p>A change of mood, without starting from scratch.</p>
              {["Less basic", "More casual", "More dressy", "More layered"].map(
                (r) => (
                  <button key={r} onClick={() => refine(r)}>
                    {r}
                    <Plus size={15} />
                  </button>
                ),
              )}
              <div className="taste-score">
                <span>
                  {pct(preferenceScore(current, profile))}
                  <small>/100</small>
                </span>
                <p>
                  {profile.ratings
                    ? "Your current taste score"
                    : "A neutral starting score"}
                </p>
              </div>
              <small>Based on observed preferences, not a probability.</small>
            </aside>
          </div>
        </div>
      )}
    </section>
  );
}
