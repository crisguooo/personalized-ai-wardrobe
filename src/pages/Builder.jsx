import { useState, useEffect } from "react";
import {
  ArrowUpRight,
  Check,
  Heart,
  ChevronRight,
  Sparkles,
  Shuffle,
  Bookmark,
  Plus,
} from "lucide-react";
import { BY_ID } from "../data/catalog.js";
import {
  rank,
  validity,
  features,
  preferenceScore,
} from "../engine/wardrobe.js";
import { event, appendEvents } from "../services/analytics.js";
import Garment from "../components/Garment.jsx";
import FlatLay from "../components/FlatLay.jsx";
import WeatherNeeds from "../components/WeatherNeeds.jsx";
import {
  today,
  validRange,
  rankForWeather,
  weatherReason,
  weatherFit,
  temperature,
} from "../engine/weather.js";
const pct = (n) => Math.round(n * 100);
export default function Builder({
  state,
  setState,
  profile,
  candidates,
  track,
  notify,
  onLearn,
  onWeather,
}) {
  const hasWeather =
    state.weather?.date === today() &&
    validRange(state.weather.lowC, state.weather.highC);
  const order = (items, occasion = "Everyday") =>
    hasWeather
      ? rankForWeather(
          items,
          profile,
          state.weather,
          state.thermalOverrides,
          occasion,
        )
      : rank(items, profile, occasion);
  const [occasion, setOccasion] = useState(
      () => state.generated.at(-1)?.occasion ?? "Everyday",
    ),
    [current, setCurrent] = useState(() =>
      hasWeather
        ? order(candidates)[0]
        : (state.generated.at(-1) ?? order(candidates)[0]),
    ),
    [selected, setSelected] = useState(null),
    [tab, setTab] = useState("studio");
  const available = state.closet.map((id) => BY_ID[id]);
  useEffect(() => {
    if (current && validity(current, state.closet).length)
      setCurrent(order(candidates, occasion)[0]);
  }, [candidates]);
  function apply(outfit, name = "personalized_outfit_generated") {
    if (!outfit) return;
    setCurrent(outfit);
    setSelected(null);
    setState((s) =>
      appendEvents(
        {
          ...s,
          generated: [
            ...s.generated.filter((o) => o.id !== outfit.id),
            { ...outfit, occasion, createdAt: new Date().toISOString() },
          ].slice(-60),
        },
        event(name, { outfitId: outfit.id, occasion }),
      ),
    );
  }
  function styleMe() {
    const recent = new Set(state.generated.slice(-8).map((o) => o.id));
    const list = order(
      candidates.filter((o) => o.id !== current?.id),
      occasion,
    );
    apply(list.find((o) => !recent.has(o.id)) ?? list[0] ?? current);
  }
  function doSwap() {
    if (!selected) {
      notify("Select a piece on the canvas first.");
      return;
    }
    const options = available
      .filter(
        (i) =>
          i.category === BY_ID[selected].category &&
          i.id !== selected &&
          (i.category !== "accessory" ||
            i.accessorySlot === BY_ID[selected].accessorySlot),
      )
      .map((i) => {
        const itemIds = current.itemIds.map((id) =>
          id === selected ? i.id : id,
        );
        return { id: [...itemIds].sort().join("|"), itemIds };
      })
      .filter((o) => !validity(o, state.closet).length);
    const next = order(options, occasion)[0];
    if (next) {
      apply(next, "outfit_item_swapped");
      notify("One piece changed. The rest stays yours.");
    } else notify("Add another piece in this category to swap it.");
  }
  function refine(type) {
    const f = features(current);
    let options = candidates.filter((o) => o.id !== current.id);
    if (type === "More layered")
      options = options.filter((o) => features(o).layered > f.layered);
    if (type === "More casual")
      options = options.filter((o) => features(o).casual > f.casual);
    if (type === "More dressy")
      options = options.filter((o) => features(o).dressy > f.dressy);
    if (type === "Less basic")
      options = options.filter(
        (o) =>
          features(o).simple < f.simple ||
          features(o).colorful > f.colorful ||
          features(o).layered > f.layered,
      );
    if (hasWeather && options.length) {
      const best = Math.min(
        ...options.map(
          (o) => weatherFit(o, state.weather, state.thermalOverrides).penalty,
        ),
      );
      options = options.filter(
        (o) =>
          weatherFit(o, state.weather, state.thermalOverrides).penalty <=
          best + 3,
      );
    }
    options.sort((a, b) => {
      const changed = (o) =>
        o.itemIds.filter((id) => !current.itemIds.includes(id)).length;
      return (
        changed(a) - changed(b) ||
        preferenceScore(b, profile) - preferenceScore(a, profile)
      );
    });
    if (options[0]) apply(options[0]);
    else
      notify(
        "This closet has no matching refinement yet. Try adding a layer or another silhouette.",
      );
  }
  function save() {
    if (state.saved.some((o) => o.id === current.id)) {
      notify("This look is already saved.");
      return;
    }
    setState((s) => ({
      ...s,
      saved: [
        ...s.saved,
        { ...current, occasion, createdAt: new Date().toISOString() },
      ],
    }));
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
                  onClick={() => setOccasion(o)}
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
          <div className="studio-canvas">
            <div className="outfit-card-top">
              <span>{occasion.toUpperCase()} / YOUR EDIT</span>
              <button onClick={save} className="save-button">
                <Bookmark size={16} />
                Save look
              </button>
            </div>
            <FlatLay
              outfit={current}
              selected={selected}
              onSelect={setSelected}
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
              <button className="outline" disabled={!selected} onClick={doSwap}>
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
      )}
    </section>
  );
}
