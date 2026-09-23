import { Plus, Sparkles } from "lucide-react";
import { insights, LABELS } from "../engine/wardrobe.js";
export default function InsightMoment({ profile, onContinue }) {
  const found = insights(profile);
  return (
    <section className="insight-moment">
      <div className="insight-star">✳</div>
      <div className="eyebrow">FIVE CHOICES. A FEW CONNECTIONS.</div>
      <h1>
        We learned something
        <br />
        <em>about you.</em>
      </h1>
      <p>
        Your first {profile.ratings} ratings are beginning to paint a picture.
      </p>
      <div className="insight-columns">
        <div>
          <span className="eyebrow">YOU SEEM TO LEAN TOWARD</span>
          {found.prefer.length ? (
            found.prefer.map(([k]) => (
              <h3 key={k}>
                <Plus size={17} />
                {LABELS[k]}
              </h3>
            ))
          ) : (
            <p>We're still looking for a consistent positive signal.</p>
          )}
        </div>
        <div>
          <span className="eyebrow">MAYBE A LITTLE LESS OF</span>
          {found.avoid.length ? (
            found.avoid.map(([k]) => (
              <h3 key={k}>
                <span>−</span>
                {LABELS[k]}
              </h3>
            ))
          ) : (
            <p>No clear dislikes yet. We won't invent any.</p>
          )}
        </div>
      </div>
      <p className="subtle">
        Early signals, never a box to fit into. Your style can change.
      </p>
      <button className="primary" onClick={onContinue}>
        Show me better outfits
        <Sparkles size={18} />
      </button>
    </section>
  );
}
