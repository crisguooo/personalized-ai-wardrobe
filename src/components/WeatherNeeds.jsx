import { BY_ID } from "../data/catalog.js";
import { weatherBand, WEATHER_BANDS } from "../data/thermal.js";
import {
  comfortOffset,
  temperature,
  validRange,
  weatherNeeds,
} from "../engine/weather.js";

export default function WeatherNeeds({ closet, weather, overrides, onCloset }) {
  if (!validRange(weather?.lowC, weather?.highC)) return null;
  const { missing } = weatherNeeds(closet, weather, overrides);
  const band = weatherBand(weather.lowC - comfortOffset(weather));
  return (
    <div className="weather-needs">
      <span className="eyebrow">
        AT TODAY’S LOW · {temperature(weather.lowC, weather.unit)}
      </span>
      <p>{band[1]}.</p>
      {missing.length > 0 && (
        <div className="missing-weather-pieces" role="status">
          <h3>Missing from your closet</h3>
          <p>Add these to cover the colder part of today.</p>
          <ul>
            {missing.map((r) => (
              <li key={r.key}>
                <b>{r.label}</b>
                {!(
                  r.examples.length === 1 &&
                  BY_ID[`${r.examples[0]}:black`].name === r.label
                ) && (
                  <span>
                    {r.examples
                      .map((key) => BY_ID[`${key}:black`].name)
                      .join(" or ")}
                  </span>
                )}
              </li>
            ))}
          </ul>
          {onCloset && (
            <button className="text-button" onClick={onCloset}>
              Update my clothes →
            </button>
          )}
        </div>
      )}
      <details>
        <summary>How temperature changes the outfit</summary>
        <p>
          A tee starts at {temperature(27, weather.unit)}–
          {temperature(30, weather.unit)}. Roughly every{" "}
          {weather.unit === "F" ? "3–4°F" : "2°C"} below that, we add coverage
          or insulation. These are adjustable Wearwell defaults; your comfort
          preference shifts them.
        </p>
        <div className="temperature-ladder">
          {WEATHER_BANDS.map(([min, label], i) => (
            <div key={label}>
              <span>
                {i === 0
                  ? `${temperature(min, weather.unit)}+`
                  : min === -Infinity
                    ? `Below ${temperature(0, weather.unit)}`
                    : `${temperature(min, weather.unit)} to <${temperature(WEATHER_BANDS[i - 1][0], weather.unit)}`}
              </span>
              <span>{label}</span>
            </div>
          ))}
        </div>
      </details>
    </div>
  );
}
