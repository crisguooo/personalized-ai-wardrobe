import { useLanguage } from "../i18n/Language.jsx";
import { BY_ID } from "../data/catalog.js";
import { weatherBand, WEATHER_BANDS } from "../data/thermal.js";
import {
  comfortOffset,
  temperature,
  validRange,
  weatherNeeds,
} from "../engine/weather.js";

export default function WeatherNeeds({ closet, weather, overrides, onCloset }) {
  const { t } = useLanguage();
  if (!validRange(weather?.lowC, weather?.highC)) return null;
  const { missing } = weatherNeeds(closet, weather, overrides);
  const needsLighter =
    missing.some((r) => r.seasonal) &&
    weather.lowC - comfortOffset(weather) >= 22;
  const band = weatherBand(weather.lowC - comfortOffset(weather));
  return (
    <div className="weather-needs">
      <span className="eyebrow">
        {t("AT TODAY’S LOW · ")}
        {t(temperature(weather.lowC, weather.unit))}
      </span>
      <p>{t(band[1])}.</p>
      {missing.length > 0 && (
        <div className="missing-weather-pieces" role="status">
          <h3>
            {t(
              needsLighter
                ? "A lighter option would help"
                : "You may feel cold",
            )}
          </h3>
          <p>
            {t(
              needsLighter
                ? "Try these pieces for a more comfortable warm-weather look."
                : "These pieces would help keep you warmer at today’s low.",
            )}
          </p>
          <ul>
            {missing.map((r) => (
              <li key={r.key}>
                <b>{t(r.label)}</b>
                {!(
                  r.examples.length === 1 &&
                  BY_ID[`${r.examples[0]}:black`].name === r.label
                ) && (
                  <span>
                    {t(
                      r.examples
                        .map((key) => BY_ID[`${key}:black`].name)
                        .join(" or "),
                    )}
                  </span>
                )}
              </li>
            ))}
          </ul>
          {onCloset && (
            <button className="text-button" onClick={onCloset}>
              {t("Update my clothes →")}
            </button>
          )}
        </div>
      )}
      <details>
        <summary>{t("How temperature changes the outfit")}</summary>
        <p>
          {t(
            "A tee starts at {0}–{1}. Roughly every {2} below that, we add coverage or insulation. These are adjustable Wearwell defaults; your comfort preference shifts them.",
            [
              temperature(27, weather.unit),
              temperature(30, weather.unit),
              weather.unit === "F" ? "3–4°F" : "2°C",
            ],
          )}
        </p>
        <div className="temperature-ladder">
          {WEATHER_BANDS.map(([min, label], i) => (
            <div key={label}>
              <span>
                {t(
                  i === 0
                    ? `${temperature(min, weather.unit)}+`
                    : min === -Infinity
                      ? `Below ${temperature(0, weather.unit)}`
                      : `${temperature(min, weather.unit)} to <${temperature(WEATHER_BANDS[i - 1][0], weather.unit)}`,
                )}
              </span>
              <span>{t(label)}</span>
            </div>
          ))}
        </div>
      </details>
    </div>
  );
}
