# Deterministic styling engine

## Repository audit and scope

The existing product was already deterministic. `server/provider.js` only generated optional style-profile prose; it never chose clothes. The previous weaknesses were in the local engine:

| Area | Previous implementation | Refactor |
| --- | --- | --- |
| Clothing schema | 72 archetypes / 864 stable color IDs; categories, fit, tags, coarse formality/warmth, thermal guides | Enrich those IDs with construction and styling defaults; retain existing wardrobe records and artwork |
| Candidate generation | Build the core Cartesian product, hash/sample it, add layers/accessories | Indexed bounded sampling; conservative physical validation; retain both plain and accessorized candidates |
| Occasions | Small additive dressiness/casualness bonuses; selecting an occasion changed the label until generation | Five centralized objective profiles; selecting an occasion immediately scores/selects its outfit |
| Swipe learning | Feature weights, reason targeting, archetype-pair scores; every dislike also penalized the pair | Reason-only attribution, weak ambiguous dislikes, repeated-evidence confidence, personal overrides of style priors |
| Color | Cohesive palettes could eliminate every alternative before preference scoring | Soft color score, dominant-color estimate and accessory accents; expressive-color preferences can reduce penalties |
| Missing | Hypothetical owned-plus-one combinations, preference cutoff, summed preference score | Same full outfit score, quality/taste cutoffs, recolor deduplication and diversity-adjusted value |
| Controls | Builder implemented its own replacement/refinement ordering | Shared swap candidate validation and temporary scoring objectives |

No layout, typography, imagery, onboarding steps, navigation or CSS changes were needed. Closet editing, Today, Swipe & Learn, My Style, saved outfits and Missing remain in place.

## Smallest shared boundary

`src/engine/wardrobe.js` remains the public facade used by existing pages, storage and the summary server. Pure modules sit behind it:

| Module | Responsibility |
| --- | --- |
| `data/styling.js` | Volume, structure, texture, length, bulk, layer capacity, exposure, visual weight, formality and color-family defaults |
| `engine/compatibility.js` | Primary slots, ownership, duplicates, accessory slots and physical layer capacity |
| `engine/features.js` | Shared observable features and visual-interest intensity |
| `engine/profile.js` | Learning, confidence, preference scoring and evidence-backed insights |
| `engine/occasions.js` | All occasion weights, desired interest/formality and temporary refinement changes |
| `engine/scoring.js` | Numeric silhouette, layering, palette, comfort, interest, occasion and personal scores |
| `engine/recommendations.js` | Bounded candidate generation, ranking, diversity and locked-piece swaps |
| `engine/gaps.js` | Hypothetical additions evaluated through the same generator and scorer |
| `engine/weather.js` | Existing thermal requirements and low/high-day assessment, then shared style ranking |

The pipeline is owned IDs → bounded candidates → physical checks → weather eligibility when present → general/occasion/personal weighted score → quality-bounded diversity → displayed recommendations. No LLM reranker is required or enabled. The existing optional provider continues to receive supported preference labels only.

## Metadata and conservative compatibility

Existing `fit` values and 0–5 legacy `warmth` values stay compatible. `formality` is normalized to 1–5; styling volume, exposure, bulk, capacity and visual weight use 1–5. Texture is used for interest, structure for polish/comfort/layering, length for proportion/layering, exposure for coverage and color family for palette relationships. No unused aspirational dimensions were added.

Construction metadata can have archetype overrides; it does not contain favored named outfit recipes. An oversized hoodie has bulk 5, a close-cut leather jacket capacity 2, and a roomy down coat capacity 5. Each outer layer must accommodate the accumulated inner stack. A thin base contributes little extra bulk beneath a midlayer; substantial inner pieces contribute more.

The existing single-outer-shell product rule is retained, including fleece jackets and padded vests. Knit midlayers can sit under a coat. Oversized/oversized and fitted/fitted combinations remain valid. Their default silhouette scores are moderate, and repeated positive evidence can raise them above default balanced combinations. No preference can override physical incompatibility.

## Scoring and personalization

`scoreBreakdown(outfit, profile, occasion, { refinement })` returns a 0–1 total, component scores, normalized weights, raw metrics, targets and rule notes. Invalid combinations return `valid: false` and named failures. Every normalized occasion weight lives in `occasions.js`.

Visual interest is an intensity built from texture, proportion, controlled contrast, focal volume, accessories and layering. Its score measures closeness to the desired intensity; more is not automatically better. Date uses polish, intention, comfort and preference rather than exposure or feminine tags. Work assumes business casual and evaluates ensemble structure, polish, coverage and gym coding. Comfy uses softness, ease and footwear bulk/weight, without a hoodie-only recipe.

Love adds broad positive evidence. Specific dislike reasons update only the corresponding feature relationships; color rejection does not penalize garment pairings. “Too basic” raises the desired interest signal, while formality reasons have directional effects. “Just not me” only weakly adjusts that top–bottom pairing. Weights are shrunk toward neutral, so one event does not rewrite the profile.

Evidence stores weighted count, observation count and confidence. Insights require at least two observations and enough weighted evidence. Redundant palette/silhouette statements are grouped, with specific supported combinations preferred over generic labels. My Style, the five-swipe insight and the optional summary API use this same evidence gate.

## Diversity, swap and refinements

Core products are sampled by index rather than fully allocated. The generator caps core samples, layer samples and the returned pool (900 normally, 300 per Missing candidate). A coprime stride avoids repeatedly sampling the same shoe position. Round-robin collection avoids spending the entire cap on one base combination. This is a representative sample, not an exhaustive search or global optimum.

Ranked shortlists vary top, bottom, silhouette, layers and shoes, with recoloring weighted as a small change. Greedy diversity operates among comparable scores within 0.18 of the current best, examining at most 180 candidates for a 24-look diversified prefix. Recent outfits also lower repetition. Physical and weather eligibility remain intact.

Swap locks every unselected ID and ranks only same-category/same-accessory-slot replacements. Refinement controls temporarily change centralized target/weight parameters. They do not alter learned weights. A new occasion or Style me clears the temporary refinement.

## Missing value

For each unowned archetype, temporarily add one color variant (the closet's most represented color, with canonical fallback). Generate valid owned-plus-one outfits that contain that item. Apply the same Everyday score and require:

- Quality ≥ the greater of 0.70 and the closet's sampled 65th-percentile quality minus 0.02.
- Personal score ≥ 0.55 after at least three ratings, otherwise ≥ the neutral 0.50.

Recolored copies of the same archetype combination count once. Value is `sum(quality × personal score) × diversity`, where diversity is the fraction represented by meaningfully distinct combinations. Thus many near-identical low-relevance options cannot win on raw count alone. The UI uses actual qualifying examples; the counts remain explicitly sampled estimates. This evergreen gap score is separate from Today's missing winter-equipment checklist.

## Persistence and inspection

Storage remains `wearwell:v1`, and clothing IDs are unchanged. Profile version 2 is rebuilt from feedback, so no manual migration/reset is necessary. Known historical feedback is retained even if tighter construction defaults would reject the original outfit today. Owned saved looks are retained for history, while reopening/recommending a physically incompatible look is blocked with an explanation.

In a development build, append `?debug=1#outfits` to inspect the current outfit's complete score breakdown. This panel is opt-in and absent from production builds. The pure scoring API is also directly testable in Node. The optional summary provider remains independent of generation and can be left unconfigured.

Validation covers metadata, layering capacity, silhouette priors, learned ranking reversals, reason attribution, evidence gating, all five occasions, soft color scoring, diversity, locked swaps, Missing value, legacy persistence and existing winter/temperature behavior. Product heuristics remain adjustable starting points, not universal fashion rules or calibrated preference probabilities.
