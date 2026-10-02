import { useLanguage } from "../i18n/Language.jsx";
import { Plus, Sparkles } from "lucide-react";
import { insights, LABELS } from "../engine/wardrobe.js";
export default function InsightMoment({ profile, onContinue }) {
  const { t } = useLanguage();
  const found = insights(profile);
  return (
    <section className="insight-moment">
      <div className="insight-star">✳</div>
      <div className="eyebrow">{t("FIVE CHOICES. A FEW CONNECTIONS.")}</div>
      <h1>
        {t("We learned something")}
        <br />
        <em>{t("about you.")}</em>
      </h1>
      <p>
        {t("Your first ")}
        {t(profile.ratings)}
        {t(" ratings are beginning to paint a picture.")}
      </p>
      <div className="insight-columns">
        <div>
          <span className="eyebrow">{t("YOU SEEM TO LEAN TOWARD")}</span>
          {found.prefer.length ? (
            found.prefer.map(([k]) => (
              <h3 key={k}>
                <Plus size={17} />
                {t(LABELS[k])}
              </h3>
            ))
          ) : (
            <p>{t("We're still looking for a consistent positive signal.")}</p>
          )}
        </div>
        <div>
          <span className="eyebrow">{t("MAYBE A LITTLE LESS OF")}</span>
          {found.avoid.length ? (
            found.avoid.map(([k]) => (
              <h3 key={k}>
                <span>−</span>
                {t(LABELS[k])}
              </h3>
            ))
          ) : (
            <p>{t("No clear dislikes yet. We won't invent any.")}</p>
          )}
        </div>
      </div>
      <p className="subtle">
        {t("Early signals, never a box to fit into. Your style can change.")}
      </p>
      <button className="primary" onClick={onContinue}>
        {t("Show me better outfits")}
        <Sparkles size={18} />
      </button>
    </section>
  );
}
