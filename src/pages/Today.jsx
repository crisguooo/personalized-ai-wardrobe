import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Thermometer,
  Sun,
  Snowflake,
  Check,
} from "lucide-react";
import { BY_ID } from "../data/catalog.js";
import PaletteNote from "../components/PaletteNote.jsx";
import FlatLay from "../components/FlatLay.jsx";
import Garment from "../components/Garment.jsx";
import WeatherNeeds from "../components/WeatherNeeds.jsx";
import {
  freshWeather,
  today,
  toC,
  fromC,
  temperature,
  validRange,
  weatherCandidates,
  rankForWeather,
  weatherReason,
  guideFor,
} from "../engine/weather.js";
import "../weather.css";

export default function Today({
  state,
  setState,
  profile,
  onComplete,
  onCloset,
  onboarding = false,
}) {
  const weather = state.weather ?? freshWeather();
  const [step, setStep] = useState(() =>
    weather.date === today() && validRange(weather.lowC, weather.highC)
      ? weather.confirmed
        ? "look"
        : "comfort"
      : "weather",
  );
  const [unit, setUnit] = useState(weather.unit);
  const [low, setLow] = useState(
    weather.lowC === null
      ? ""
      : String(Math.round(fromC(weather.lowC, weather.unit) * 10) / 10),
  );
  const [high, setHigh] = useState(
    weather.highC === null
      ? ""
      : String(Math.round(fromC(weather.highC, weather.unit) * 10) / 10),
  );
  const [error, setError] = useState("");
  const [comfort, setComfort] = useState(weather.comfort);
  const [threshold, setThreshold] = useState(
    String(Math.round(fromC(weather.coatBelowC, weather.unit))),
  );
  const [index, setIndex] = useState(0);
  const root = useRef(null);
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
    const heading = root.current?.querySelector("h1");
    if (heading) {
      heading.tabIndex = -1;
      heading.focus({ preventScroll: true });
    }
  }, [step]);
  const candidates = useMemo(
    () => weatherCandidates(state.closet),
    [state.closet],
  );
  const ranked = useMemo(() => {
    const all = rankForWeather(
      candidates,
      profile,
      weather,
      state.thermalOverrides,
    );
    return all;
  }, [candidates, profile, weather, state.thermalOverrides]);
  const current = ranked[index % Math.max(1, ranked.length)];
  function changeUnit(next) {
    setError("");
    const convert = (value) =>
      value.trim() === ""
        ? ""
        : String(Math.round(fromC(toC(Number(value), unit), next) * 10) / 10);
    setLow(convert(low));
    setHigh(convert(high));
    setThreshold(convert(threshold));
    setUnit(next);
  }
  function saveWeather(e) {
    e.preventDefault();
    const lowC = toC(Number(low), unit),
      highC = toC(Number(high), unit);
    if (low.trim() === "" || high.trim() === "" || !validRange(lowC, highC)) {
      setError(
        `Enter both temperatures from ${temperature(-40, unit)} to ${temperature(50, unit)}, with the low no higher than the high.`,
      );
      return;
    }
    setState((s) => ({
      ...s,
      weather: {
        ...freshWeather(),
        ...s.weather,
        lowC,
        highC,
        unit,
        date: today(),
        confirmed: false,
      },
    }));
    setError("");
    setStep("comfort");
  }
  function saveComfort(e) {
    e.preventDefault();
    const coatBelowC = toC(Number(threshold), unit);
    if (
      comfort === "custom" &&
      (threshold.trim() === "" ||
        !Number.isFinite(coatBelowC) ||
        coatBelowC < -10 ||
        coatBelowC > 30)
    ) {
      setError(
        `Choose a temperature from ${temperature(-10, unit)} to ${temperature(30, unit)}.`,
      );
      return;
    }
    setState((s) => ({
      ...s,
      weather: {
        ...s.weather,
        comfort,
        confirmed: true,
        coatBelowC: comfort === "custom" ? coatBelowC : s.weather.coatBelowC,
      },
    }));
    setError("");
    setIndex(0);
    setStep("look");
  }
  return (
    <section
      ref={root}
      className={`today-page ${onboarding ? "today-onboarding" : ""}`}
    >
      {onboarding && (
        <header className="today-header">
          <button
            className="text-button"
            onClick={
              step === "weather"
                ? onCloset
                : () => setStep(step === "comfort" ? "weather" : "comfort")
            }
          >
            <ArrowLeft size={18} /> Back
          </button>
          <span className="wordmark">
            wearwell<span>✳</span>
          </span>
          <span />
        </header>
      )}
      {step === "weather" && (
        <form className="weather-task" onSubmit={saveWeather}>
          <div className="weather-icon">
            <Sun size={28} />
          </div>
          <span className="eyebrow">DRESS FOR THE WHOLE DAY</span>
          <h1>
            What’s the weather
            <br />
            <em>doing today?</em>
          </h1>
          <p>Enter today’s low and high.</p>
          <div className="weather-units" aria-label="Temperature unit">
            {["C", "F"].map((u) => (
              <button
                type="button"
                key={u}
                aria-pressed={u === unit}
                onClick={() => changeUnit(u)}
              >
                °{u} {u === "C" ? "Celsius" : "Fahrenheit"}
              </button>
            ))}
          </div>
          <div className="weather-inputs">
            <label>
              Lowest · °{unit}
              <input
                type="number"
                step="any"
                inputMode="decimal"
                value={low}
                onChange={(e) => setLow(e.target.value)}
                placeholder={unit === "C" ? "9" : "48"}
                required
              />
            </label>
            <label>
              Highest · °{unit}
              <input
                type="number"
                step="any"
                inputMode="decimal"
                value={high}
                onChange={(e) => setHigh(e.target.value)}
                placeholder={unit === "C" ? "17" : "63"}
                required
              />
            </label>
          </div>
          <p className="weather-small">
            Use your forecast. We’ll plan for both ends of the day.
          </p>
          {error && (
            <p className="weather-error" role="alert">
              {error}
            </p>
          )}
          <div className="weather-action">
            <button className="primary" type="submit">
              Continue <ArrowRight size={18} />
            </button>
          </div>
        </form>
      )}
      {step === "comfort" && (
        <form className="weather-task" onSubmit={saveComfort}>
          <div className="weather-icon">
            <Thermometer size={28} />
          </div>
          <span className="eyebrow">YOUR COMFORT COMES FIRST</span>
          <h1>
            How does the cold
            <br />
            <em>feel to you?</em>
          </h1>
          <p>It’s personal. You can change this anytime.</p>
          <div className="comfort-options">
            {[
              [
                "default",
                "Not sure — help me decide",
                "Start with Wearwell’s temperature guides.",
              ],
              ["cold", "I get cold easily", "Give me a little more warmth."],
              ["warm", "I usually run warm", "Keep my layers lighter."],
              [
                "custom",
                "I know my own comfort",
                "Tell us when you reach for a big coat.",
              ],
            ].map(([id, name, detail]) => (
              <button
                type="button"
                key={id}
                aria-pressed={comfort === id}
                onClick={() => setComfort(id)}
              >
                <span>
                  <b>{name}</b>
                  <small>{detail}</small>
                </span>
                {comfort === id && <Check size={18} />}
              </button>
            ))}
          </div>
          {comfort === "custom" && (
            <label className="coat-threshold">
              I want a big coat at or below (°{unit})
              <input
                type="number"
                step="any"
                value={threshold}
                onChange={(e) => setThreshold(e.target.value)}
                required
              />
              <small>
                For example, {temperature(17, unit)} if mild days still feel
                cold.
              </small>
            </label>
          )}
          {error && (
            <p className="weather-error" role="alert">
              {error}
            </p>
          )}
          <div className="weather-action">
            <button className="primary" type="submit">
              Find today’s outfit <ArrowRight size={18} />
            </button>
            <button
              className="text-button"
              type="button"
              onClick={() => setStep("weather")}
            >
              Back to temperatures
            </button>
          </div>
        </form>
      )}
      {step === "look" && (
        <div className="today-result">
          <div className="today-result-heading">
            <span className="eyebrow">FROM YOUR CLOSET · FOR TODAY</span>
            <h1>
              A little less
              <br />
              <em>what should I wear?</em>
            </h1>
            <button className="weather-pill" onClick={() => setStep("weather")}>
              <Snowflake size={16} />
              {temperature(weather.lowC, unit)}
              <span>→</span>
              <Sun size={16} />
              {temperature(weather.highC, unit)}
              <span> Edit</span>
            </button>
          </div>
          <WeatherNeeds
            closet={state.closet}
            weather={weather}
            overrides={state.thermalOverrides}
            onCloset={onCloset}
          />
          {current ? (
            <>
              <div className="today-outfit">
                <FlatLay outfit={current} />
                <PaletteNote outfit={current} />
                <div className="weather-reason">
                  <span className="eyebrow">WHY THESE PIECES</span>
                  <p>
                    {weatherReason(current, weather, state.thermalOverrides)}
                  </p>
                </div>
              </div>
              <div className="today-actions">
                <button
                  className="outline"
                  disabled={ranked.length < 2}
                  onClick={() => setIndex((i) => i + 1)}
                >
                  Try another look
                </button>
                <button
                  className="text-button"
                  onClick={() => setStep("comfort")}
                >
                  Adjust my comfort
                </button>
              </div>
              <details className="piece-guides">
                <summary>
                  Temperature guides for these pieces <span>Personalize</span>
                </summary>
                <p>
                  Starting estimates in °{unit}, not universal rules. Top ranges
                  refer to wearing the top without extra layers; layering
                  changes the whole outfit. Wind, rain, fabric and activity can
                  change how you feel.
                </p>
                {current.itemIds.map((id) => (
                  <PieceGuide
                    key={`${id}-${unit}`}
                    item={BY_ID[id]}
                    unit={unit}
                    overrides={state.thermalOverrides}
                    onSave={(range) => {
                      setState((s) => ({
                        ...s,
                        thermalOverrides: {
                          ...s.thermalOverrides,
                          [id]: range,
                        },
                      }));
                      setIndex(0);
                    }}
                  />
                ))}
              </details>
            </>
          ) : (
            <p>
              We need a suitable base before building this look. Add the missing
              pieces above; a warm coat cannot replace a warm long-sleeve base.
            </p>
          )}
          <div className="today-finish">
            <button
              className="primary"
              disabled={!current}
              onClick={onComplete}
            >
              Teach Wearwell my style <ArrowRight size={18} />
            </button>
            <button className="text-button" onClick={onCloset}>
              Add warmer or lighter pieces
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

function PieceGuide({ item, unit, overrides, onSave }) {
  const guide = guideFor(item, overrides);
  const [low, setLow] = useState(String(Math.round(fromC(guide.minC, unit))));
  const [high, setHigh] = useState(String(Math.round(fromC(guide.maxC, unit))));
  const [status, setStatus] = useState("");
  return (
    <div className="piece-guide">
      <Garment item={item} />
      <div>
        <b>
          {item.color} {item.name}
        </b>
        {guide.active ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const minC = toC(Number(low), unit),
                maxC = toC(Number(high), unit);
              if (!low.trim() || !high.trim() || !validRange(minC, maxC)) {
                setStatus("Enter a valid low-to-high range.");
                return;
              }
              onSave({ minC, maxC });
              setStatus("Saved for this piece.");
            }}
          >
            <div>
              <input
                aria-label={`${item.name} minimum temperature`}
                type="number"
                step="any"
                value={low}
                onChange={(e) => setLow(e.target.value)}
              />
              <span>to</span>
              <input
                aria-label={`${item.name} maximum temperature`}
                type="number"
                step="any"
                value={high}
                onChange={(e) => setHigh(e.target.value)}
              />
              <span>°{unit}</span>
              <button type="submit">Save</button>
            </div>
            <small role="status">
              {status ||
                (overrides?.[item.id]
                  ? "Your own comfort guide"
                  : "Wearwell starting guide")}
            </small>
          </form>
        ) : (
          <small>Styling piece · no warmth assumed</small>
        )}
      </div>
    </div>
  );
}
