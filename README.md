# Wearwell

**Less guesswork. More you.**

[Live demo](https://wearwell-demo.vercel.app/) · [Product and engineering notes](docs/STYLING_ENGINE.md)

Wearwell helps people decide what to wear from the clothes they already own. It combines a representative digital closet, personal style feedback and daily temperatures to recommend complete looks—and explains why those pieces work together.

A consumer product prototype built with React, Vite and an explainable, local recommendation engine. No account, paid AI key or garment-photo upload is required for the demo.

## The problem

Having a full wardrobe does not make getting dressed easy. People still need to answer three questions:

- **What works together?** Individually compatible garments can form an awkward outfit.
- **What feels like me?** Generic recommendations ignore taste, silhouette and comfort preferences.
- **What is actually worth adding?** A shopping catalog cannot show whether a new piece meaningfully improves an existing wardrobe.

Digitizing every garment before seeing value adds another barrier. Wearwell starts with familiar silhouettes and colors, then learns through small decisions about complete outfits.

## The product approach

| User need | Wearwell's response |
| --- | --- |
| Get started without cataloging everything | Progressive setup; eight pieces across tops, bottoms and shoes unlock an early start. Seasonal extras are optional. |
| Keep the wardrobe accurate | Categorized **All clothes** and **My clothes** lists; each silhouette/color pair is a separate owned item. |
| Decide what to wear today | Enter the daily low/high in °C or °F, adjust cold tolerance, and get a look with a short practical explanation. |
| Make recommendations feel personal | Like/dislike complete looks, optionally explain dislikes, and refine future rankings. |
| Dress for a specific plan | Occasion-based outfit cards, single-item swaps, save controls and lightweight refinements. |
| Understand a developing taste | Evidence-backed style tags and editorial brand references with filters. |
| Identify a useful wardrobe addition | **Missing** ranks sampled new outfit opportunities; an already-owned piece can be added with its color. |

The visual identity uses a cream background, editorial typography, red accents and photographic-style garment cutouts. Navigation stays out of first-time setup so each step has one clear task.

## Business impact

**The business thesis is to turn wardrobe ownership into a recurring decision-making service.** A useful daily recommendation can create repeat use; saved looks and feedback can make the service more valuable over time; wardrobe gaps can support considered purchases instead of indiscriminate shopping.

These are product hypotheses, not measured commercial results. No production cohort study, revenue experiment or validated retention lift has been run.

| Intended outcome | Mechanism already implemented | How to validate it |
| --- | --- | --- |
| Lower activation friction | Representative closet, skippable groups, early start | Setup completion rate and median time to first useful look |
| Reduce daily decision effort | Weather-aware looks, concise reasons and controlled swaps | Time to a chosen/saved look, plus wearer-reported confidence |
| Increase return usage | Daily context and a preference profile that evolves with feedback | D7/D30 retention and useful recommendation days per active user |
| Improve personalization | Reason-aware learning and whole-look reranking | Acceptance/save rate versus a non-personalized baseline, controlling for occasion and closet size |
| Increase use of existing clothes | Owned-only recommendations and silhouette diversity | Share of owned garments appearing in accepted looks; confirm actual wear separately |
| Make gap discovery more useful | Quality- and preference-weighted new combinations | Gap exploration, corrected ownership and user-rated usefulness of previews |
| Keep prototype operating costs low | Client-side inference and local persistence | Hosting usage and cost per active demo user; no paid model calls in the hosted demo |

An eventual business could test a paid planning service or clearly disclosed commerce referrals. Neither monetization nor checkout is implemented. The current deployment is a personal, non-commercial portfolio demo.

Local event records support prototype inspection; there is no connected analytics pipeline. Likes, saves and generated counts are proxies, not evidence that someone wore an outfit or bought an item.

## How the recommendation engine works

The central engineering decision is to **design an intentional look before adapting it to the weather**.

```text
Occasion + learned style
  → one aesthetic direction
  → silhouette formula + layering structure
  → hero piece + color strategy
  → supporting garments and shoes
  → complete-look aesthetic evaluation
  → weather validation / adjustment
  → personal reranking + diversity
```

### 1. A direction and formula guide generation

Each outfit expresses a primary direction: minimal clean, relaxed street, sporty casual, soft feminine, polished casual, edgy or preppy. Candidate pools are shaped by proven proportions such as fitted/cropped + wide bottoms, oversized + straight bottoms, or roomy outerwear + a fitted base.

Formulas influence which candidates are built, not just how random combinations are scored. They are flexible priors; learned taste can change their ranking. Shoes are assessed against the complete silhouette and style language.

### 2. Fewer pieces, with a reason for each

The default is **top + bottom + shoes**. Optional pieces must improve the complete look. A leave-one-out comparison asks whether removing a piece makes the composition worse. Necessary weather protection is treated separately from decorative additions.

Layer structures are chosen before garments: `base`, `base + mid`, `base + outer`, or `base + mid + outer`. Roles depend on structure, length, bulk, fit, intended use and capacity—not just the Closet category. A long or chunky cardigan occupies the outer slot; a thin cardigan can fit beneath a roomy coat. Two competing dominant outer layers are rejected.

### 3. Color is a strategy, not a three-color rule

Every garment has a semantic shade, hue/family, temperature, value, saturation and approximate visual area. Navy, dusty blue, denim blue and powder blue remain distinct.

Generation supports eight strategies: monochromatic/tonal, warm tonal, cool tonal, neutral + accent, analogous, complementary, split complementary and high-contrast neutral. Scoring considers hue relationships, temperature, lightness, saturation, dominance, vertical placement and tonal depth. Visible area accounts for layering and partial occlusion.

There is no blanket three-color limit or red/burgundy ban. An intentional four-color palette can outrank an incoherent two-color palette.

### 4. Weather modifies the look

Low/high temperatures, personal cold tolerance and editable per-piece guides determine coverage and insulation needs. Cold conditions require an appropriate base; a puffer cannot justify an exposed summer top. Winter boots default to below 5°C; a regular puffer defaults to −5–10°C. Removable layers handle warmer afternoons.

If the closet cannot provide enough protection, the product names the missing need and explains that the wearer may feel cold. Optional accessories are described as styling improvements. These are adjustable product heuristics, not measured fabric ratings or a guarantee of thermal comfort.

### 5. Feedback learns relationships

Likes add evidence about outfit features. Explicit dislike reasons target relevant relationships; an unexplained dislike is a weak signal. Color learning captures temperature, saturation, contrast, complexity, tonal/contrast relationships and accent tolerance rather than concluding that one disliked blue outfit means “dislikes blue.”

Signals are bounded and confidence-weighted. Insights need repeated evidence. This is online preference learning over interpretable features, not model training or fine-tuning.

### 6. Missing measures incremental wardrobe value

For a missing archetype, generate hypothetical outfits that include that piece while keeping every other garment owned. Keep high-quality, preference-compatible results, deduplicate recolored combinations, and account for variety.

The displayed `+N` is a bounded sample of qualifying opportunities. It is not an exhaustive combination count, a purchase recommendation guarantee, or a forecast of actual wear.

## Try the demo

1. Build a small closet with tops, bottoms and shoes; add seasonal pieces you actually own.
2. Enter today's low/high and your comfort preference in **Today**.
3. Use **Teach Wearwell my style** and rate several looks.
4. Open **Outfits**, choose a plan, compare cards, swap one item or save a look.
5. View learned tags and brand references in **My style**.
6. Explore **Missing** and inspect the hypothetical outfit previews.

Data stays in the current browser. A different device, browser or deployment origin starts a separate closet. Clearing site data resets it.

## Run locally

Requires Node.js **22.16+** and npm. The Vercel demo uses Node 22 for builds.

```sh
git clone https://github.com/crisguooo/personalized-ai-wardrobe.git
cd personalized-ai-wardrobe
npm ci
npm run dev
```

The repository's access permissions apply when cloning. Open the localhost URL printed by Vite, normally `http://127.0.0.1:5173`.

```sh
npm test              # engine, feedback, persistence and regression tests
npm run build         # static production client → dist/
npm run preview       # preview the production client
npm run format:check  # source formatting
```

`npm run dev` also starts an optional local summary API. The current product screens and hosted demo do not depend on that service. `.env.example` documents optional server-only Anthropic configuration for experimentation; no provider keys are needed or deployed for this demo. Never prefix a secret with `VITE_`.

## Deploy on Vercel Hobby

The published demo uses **Drop to Deploy**: the locally tested `dist/` build is uploaded directly to the existing Hobby workspace. This requires no additional GitHub App permissions. It is a static snapshot; pushing to GitHub does **not** automatically redeploy this demo. Rebuild and upload `dist/` to update it.

For a future Git-connected deployment, import this repository into an existing **Hobby** workspace. `vercel.json` declares:

- Framework: Vite
- Install: `npm ci`
- Build: `npm test && npm run build`
- Output: `dist`
- Environment variables: none required

The deployment serves static assets. Recommendations, preference learning and persistence run in the browser; there are no deployed model calls, database services or application functions. Hash-based routes work without a catch-all rewrite. No custom domain or paid add-on is required.

[Vercel Hobby](https://vercel.com/docs/plans/hobby) is for personal, non-commercial use and is subject to usage limits. This demo does not require Pro or a Pro trial. Commercial use would need a separate hosting decision.

## Architecture and verification

| Area | Main files |
| --- | --- |
| Canonical wardrobe: 72 archetypes × 14 colors | `src/data/catalog.js`, `styling.js`, `thermal.js`, `layers.js` |
| Directions, formula-led generation, ranking and swaps | `src/engine/directions.js`, `formulas.js`, `recommendations.js` |
| Complete-look scoring and palette evaluation | `src/engine/scoring.js`, `aesthetics.js`, `color-engine.js` |
| Weather adaptation and missing protection | `src/engine/weather.js` |
| Feature extraction and preference learning | `src/engine/features.js`, `profile.js` |
| Incremental wardrobe opportunities | `src/engine/gaps.js` |
| Browser persistence | `src/services/storage.js` |
| Optional local prose provider | `server/` |

**103 automated tests** cover owned-only deterministic generation, physical roles, intentional styling, color strategies, seasonal constraints, preference changes, swaps, gap quality and storage. Regression fixtures include competing outer layers and visually incoherent multi-piece looks. The current static snapshot was tested and built locally before upload. The included Vercel configuration also runs tests before building when deployed from Git.

In development, open `?debug=1#outfits` for score components, color strategy, visible-area shares and layer assignments. Diagnostics are excluded from production UI.

Further detail: [Styling architecture](docs/STYLING_ENGINE.md) · [Color and weather logic](docs/COLOR_AND_SEASONS.md) · [QA record](docs/QA.md).

## Tradeoffs and next steps

- Archetype-level metadata keeps setup fast, but does not capture each real garment's fabric, exact measurements or pattern.
- Styling scores are explainable heuristics, not stylist-certified judgments or calibrated probabilities.
- Candidate search is bounded for responsiveness; small closets limit variety and no global optimum is guaranteed.
- Local storage reduces backend cost and avoids uploading wardrobe data, but provides no account, cross-device sync or server backup.
- Brand references are editorial comparisons, not affiliations, inventory sources or sponsored recommendations.

Next, validate whether people actually choose and wear the looks, measure time-to-decision and retention with consent, and use that evidence to improve visual judgments and personalization confidence before adding infrastructure or monetization.

## Attribution

[Cher's Closet](https://github.com/hastalasophia/chers-closet), designed and built by **Sophia Liu**, inspired image-led closet browsing and flat-lay interaction. Wearwell is an independent implementation; upstream application code, personal data and styling prompts were not copied.

Garment artwork was created for this prototype. Brand marks identify editorial references and remain their owners' property; source records are in [Brand assets](docs/BRAND_ASSETS.md). See also [Garment assets](docs/GARMENT_ASSETS.md). Third-party packages and fonts retain their respective licenses.
