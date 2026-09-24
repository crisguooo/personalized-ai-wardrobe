# MVP verification

## Automated

- 50 Node tests pass. The new fashion-engine cases cover layer capacity, valid defined/roomy silhouettes, learned ranking reversals, targeted dislikes, confidence and nonredundant insights, occasion objectives, practical footwear, soft palette scoring, refinements, diversity, swap locking, shared-engine gap value and legacy persistence. Existing winter, units, onboarding and storage regressions continue to pass.
- Vite production build passes.
- Source formatting check passes.
- npm dependency audit reported zero vulnerabilities at install time.

## First-time onboarding redesign

### Recommendation-engine refactor (2026-09-24)

- No stylesheet, artwork, navigation, closet or onboarding layout changes. Existing component routes call a stable wardrobe facade backed by pure styling modules.
- Isolated QA at port 5182 with an independently stored closet and deterministic summary API at port 3002; no user inventory was edited.
- Work selected tailored trousers, loafers and a blazer; Comfy selected a tee, relaxed sweatpants and sneakers. Selection immediately changes the outfit as well as the occasion label.
- More dressy raised the formality target and selected trousers/loafers. Swap changed only the top; the original bottoms and shoes stayed locked. Saving and reloading preserved the look.
- Missing displayed actual hypothetical owned-plus-one previews. Revised diversity weighting put a lower raw-count item above higher-count alternatives.
- One Love left My Style at Still exploring; the summary API explicitly asked for more evidence. Five UI ratings (including Too basic) produced supported, nonredundant palette/interest/silhouette insights, then the existing personalized swipe experience. Reload preserved the five ratings.
- Development query `?debug=1#outfits` exposed finite component scores, centralized weights, targets and rule notes. Browser console showed no errors during these interactions.
- Removing the debug query hid the panel; the final production bundle contains no debug-panel label. The unchanged studio layout was visually checked. The main preview/API were restarted on ports 5173/3001 with the final code.
- See `STYLING_ENGINE.md` for the audit, formulas, limits and compatibility decisions. Later scoring rules supersede earlier palette-filter and preference-only gap descriptions below.

### Winter layering, palette and closet categories

- Added 12 archetypes and four colors (72 / 864 total); category buttons keep the left closet list focused while the owned list stays visible.
- Browser QA at localhost:5182: Outerwear category shows short wool/cropped jackets; selecting camel and adding the short wool jacket immediately adds the correct variant to My clothes.
- At −3 to 1°C the recommendation contains a thermal top, lined pants, winter boots, one parka, scarf, beanie and gloves. It excludes the owned short-sleeve tee and fleece jacket; the palette note reports one neutral color.
- Removing the thermal top through the UI replaces the outfit with a named warm long-sleeve base checklist. The studio also renders a recoverable empty state. Adding the thermal top restores recommendations.
- At 390 × 844 the category buttons and two lists remain visible without horizontal overflow. Test data lives on a separate preview origin; the user's closet is unchanged.
- Existing records below describe earlier milestones; the winter base and one-shell constraints above supersede their layering assumptions.

### Simple closet and temperature ladder revision

- Closet now has two simultaneous scrolling lists on desktop and mobile: all clothes on the left and owned pieces on the right. No search, fit filters, statistics, starter panel or editorial sidebars.
- Expanded metadata and original vector illustrations to 60 archetypes / 480 color variants, including winter layers and separate accessory slots.
- Verified a three-piece closet at −3–1°C produces an explicit missing winter equipment list; only the three owned items appear in the outfit.
- **Update my clothes** opens the two-list editor during onboarding without revealing product navigation. Added winter pieces there and verified the missing-equipment heading disappears on returning to Today.
- Visually checked the two lists at desktop width and 390px; no horizontal overflow.
- Verified blue long-sleeve tee addition appears in the owned list; removing it re-enables the same add action. Newest pieces appear first.
- Verified seven winter pieces render at equal width on mobile, without overlapping; winter explanations can recommend opening a retained coat for ventilation.
- The new temperature ladder and coverage rules supersede the earlier thermal assumptions documented below.

### Weather extension

Verified in a separate production preview with a fresh origin:

1. Seasonal choices appear immediately after Welcome, with Skip; selected knit and knee-high boots count toward essentials without forcing extra tees or shoes.
2. Built eight owned variants, then followed **Start with these → Dress for today** into temperature input without product navigation.
3. A reversed 17–9°C range shows validation. Switching a valid 9–17°C input to Fahrenheit converts it to 48.2–62.6°F.
4. Refresh after entering weather resumes the comfort question. Default guidance produced wool coat + tee + scarf with instructions to remove the coat and scarf at the high.
5. A personal heavy-coat threshold of 17°C changed the base to a knit and retained the coat at the high, removing only the scarf.
6. Edited the knee-high boots' maximum temperature to 19°C, saved, refreshed and verified both the value and **Your own comfort guide** label.
7. **Teach Wearwell my style** completed onboarding and opened weather-aware Swipe & Learn; full navigation appeared then. Returning users can reopen Today and edit temperatures.
8. Inspected the recommendation and temperature input at 390 × 844 with no horizontal overflow; restored the temporary viewport afterward.

### Earlier onboarding verification

Verified against a production preview using isolated localhost origins, preserving the user's active development closet:

1. Fresh entry displays Welcome with no product navigation, catalog, search, filters, sidebar or statistics.
2. Selected two top silhouettes and multiple colors. Reload restored the exact color screen and selected colors.
3. Added four tops, three bottoms and one pair of shoes. The eighth piece immediately exposed **Start with these** without visiting optional categories.
4. The payoff displayed **8 pieces** and the eight selected garment variants.
5. Back returned to the previous shoe color screen. **Keep adding** continued to layers; Skip worked through layers, outerwear and accessories.
6. **Teach Wearwell my style** opened Swipe & Learn directly with zero ratings. Full navigation appeared only after completion.
7. Reload preserved the completed state and the normal product experience.
8. Welcome and color selection visually checked at 390 × 844. Document width matched viewport width, with no horizontal overflow and no product navigation. The temporary viewport override was restored afterward.

## Original product-loop browser demo

Verified before the onboarding redesign in Chrome on localhost with a newly created application origin. The catalog/starter entry described below is historical and has since been replaced:

1. Empty closet shows disabled learning until required categories are present.
2. Starter adds 18 pieces and enables learning.
3. Five exploration actions: dislike skinny outfit as too fitted; like a red baby tee/wide jeans look; like relaxed sweats; dislike tailored all-black outfit as too dressy; like beige knit/wide jeans.
4. Fifth-rating insight reports actual simple/casual/wide-leg preferences and lower affinity for skinny/polished combinations. It does not invent layering evidence.
5. Personalized next outfit uses the beige knit, wide jeans and white sneakers. Its score reflects the recorded feedback.
6. Going out generation changes the recommendation. Swapping the knit changes only the top; bottom and shoes remain.
7. Saved look and generated outfit survive reload along with 18 owned pieces and six ratings.
8. Style DNA shows evidence, phase acceptance counts and a working no-key summary through the local server.
9. Missing shows three ranked candidates, compatibility counts, qualifying previews and ghost styling. Every preview contains only one hypothetical item.
10. 390px mobile closet inspected; page width does not exceed viewport width.

## Issues corrected during QA

- Fixed an unclosed color-swatch wrapper caught by the build.
- Moved sticky behavior to the entire sidebar so the selection card cannot cover the starter action.
- Removed flat-lay isolation that prevented white-background compositing.
- Added cell edge clipping to prevent adjacent atlas artwork leaking into cards.
- Preserved generated outfit occasion across reload and when opening saved looks.
- Tightened gap threshold relative to the current closet's score distribution, and corrected explanations to describe combinations rather than implying a coat adds bottoms.

## Scope of validation

Manual UI checks and deterministic unit tests; no paid live LLM requests, real user preference study, hosted deployment, or multi-device synchronization test. No upstream writes and no public repository were used.

## 2026-09-24 — Consistent garment photography and accent palettes

- Replaced all 36 supplemental vector silhouettes, including scarf and tall boots, with one matching photographic atlas. All 72 archetypes now use photographic sources; the 864 item IDs and existing closet records are unchanged.
- Checked actual desktop and 390px mobile Closet rendering on isolated preview port 5182: seasonal shirts, winter outerwear and accessories; beige, white, olive and red tinting; no browser console errors.
- Added regressions for repeated beige/black, red/olive accents, bag vs. long-coat area, repeated bold garments, and an incoherent base. Updated the winter test to accept a controlled scarf accent while preserving all required winter equipment.
- `npm test`: 53 passed. `npm run build`: passed.
- Generation prompt and asset mapping: `GARMENT_ASSETS.md`.

## 2026-09-24 — Style references, swipe studio and intentional outfit quality

- 64 tests pass, including 11 new tests for the captured awkward outfit, recipe-first generation, required-item constraints, flexible personalization, grounding, shared style language, occasion-dependent thermal contrast, focal hierarchy, rise/hem proportion, normalized score components and the 16-brand library. Production build passes.
- In isolated browser origin 5182, verified Filter → Outdoor → Patagonia → Try another brand → Arc’teryx; no preference writes from browsing references.
- Verified Like on the left and Not for me on the right each record one rating and advance. Desktop left drag and mobile right drag also advance and increment ratings. Refresh preserves ratings (5 → 7), saved looks remain and saving a new look increments the collection (1 → 2). More layered still changes the outfit; all four refinement controls remain available.
- Desktop and 390 × 844 mobile layouts visually checked. Refined card compositing to retain the cream background while dragging and clipped neighboring atlas-cell bleed. No console errors. Test tab closed and viewport reset; user's 5173 wardrobe was only read to capture the regression case.

## 2026-09-24 — Clear feedback, weather wording and My Style sections

- Bounded the swipe art and shoe hit area above a separate vote row. Selected shoe labels remain clear of Like at desktop and 390px; measured mobile separation is about 50px, with no horizontal overflow. Like advances once (9 → 10 ratings) and clears piece selection.
- Save look becomes a red, filled bookmark and “Saved” with aria-pressed. Verified collection increment (2 → 3), saved records after reload, and red state. Duplicate saves remain idempotent.
- My Style now has distinct Your style and Brands like you frames. All 16 local logo assets loaded in the actual browser; verified Outdoor filtering and responsive layout.
- Weather copy distinguishes warmth gaps from optional polish. Winter boots, hats and gloves retain their thermal role. Optional suggestions only use owned, compatible bags/jewelry with a suitable palette, and are suppressed when warmth/heat coverage is inadequate. Cold-day UI checked at −14°C to −4°C, without “incomplete” wording.
- 66 unit tests pass, including cold accessory/coat warnings in both units and optional accessory regressions; production build passes. No browser console errors. QA uses isolated origin 5182; no test ratings or weather changes to the user's 5173 wardrobe.

## 2026-09-24 — Colour families and temperature-first generation

- 73 tests pass. New regressions cover earth-family grouping, red accents against unified vs mixed foundations, palette priority through diversity, puffer −5/10°C bounds, strict winter-boot exclusion at 5°C, per-piece/personal adjustments, seasonal filtering before formula generation, invalid saved/swapped seasonal items, summer shortages and afternoon removal of hats/gloves.
- Production build passes. Isolated browser checks at −14→−4°C show a thermal base and winter equipment; 28→31°C shows a tee with no winter accessories/outerwear. Manual scarf insertion is rejected; More layered can add a light cap, not a winter layer. At 5→10°C, winter boots are excluded and the colour-family caption renders correctly.
- All candidate-consuming pages share the current weather pool, and Today supplies forecast, profile and thermal overrides at generation time. Setup readiness is independent of weather eligibility, so a seasonal shortage doesn't reset the closet experience.
- Research sources and interpretation are documented in `COLOR_AND_SEASONS.md`. The user's main wardrobe remains untouched by QA.


## 2026-09-24 — Direction-first recommendation architecture

- Creative generation now begins with occasion, learned direction priors, a silhouette recipe and a hero/anchor; supports and shoes are selected within that point of view. Weather adapts completed creative seeds afterward.
- Complete-look cohesion, intentionality, shoe compatibility and direction coherence are explicit numeric components. Optional additions must win a leave-one-out comparison. Thermal necessities retain functional credit.
- Added 8 regression tests covering both reported awkward looks, changed garments/colors, occasion/learned directions, deliberate extras, footwear grounding, summer/winter adaptation provenance, functional winter credit and persistence. Updated older tests to pass their forecast into the adaptation API and to avoid requiring arbitrary coats/accessories.
- Full suite: 84 passing tests. Production build passes. A 72-piece winter wardrobe adaptation was sampled at about 0.5 seconds locally (a single observation, not a performance guarantee).
- Browser QA on isolated localhost:5182: 5–10°C renders protective layers and honest cold-gap copy; 28–30°C produces three-piece looks without scarves/coats; Work and Comfy select different core silhouettes; Like advances to another outfit and increments feedback; no captured browser warnings/errors. The existing layout, Save control and refinements remain intact.
- The user's primary localhost:5173 wardrobe was not edited during verification. Existing saved outfits and learned feedback remain compatible.


## 2026-09-24 — Color strategy engine

- Per-garment color descriptors distinguish hue, temperature, value, saturation, semantic shade and area; navy, dusty blue, medium denim and powder blue remain different. Added charcoal/powder swatches without changing the layout.
- Strategy-led generation supports eight harmonies. Removed every red/burgundy gate and the three-family ranking partition, including saved looks, swaps, winter completion and finishing touches. Weather seed lanes preserve color-strategy alternatives.
- Added 11 color tests for metadata, light/dark tonal examples, tonal depth, warm/cool complementary palettes, split complements, area/occlusion, saturation/placement, four versus two colors, strategy generation, learned ranking reversal and debug scores. Replaced obsolete red-ban tests with valid red/burgundy generation/swap/history and cold-weather protection regressions.
- 94 tests pass; production build passes. Full-catalog generation remains bounded at 900 results and passes the existing runtime limit.
- Browser verification on isolated localhost:5182: the development debug disclosure shows Color Strategy and all requested sub-scores plus tonal depth and per-garment area; after switching the same origin to the production build, the panel is absent even with `?debug=1`. Existing outfits, navigation and controls render normally with the strategy caption. No captured browser errors. The primary 5173 wardrobe was not edited.


## 2026-09-24 — Construction-based layer roles

- Added 9 regressions: construction classification (including anonymous variants), all five reported competing-outer combinations in either order, valid slim-cardigan/roomy-coat capacity checks, four explicit layer structures, role-constrained generation, cross-category swaps, winter outer replacement, and color/debug slot alignment.
- Full suite: 103 passing tests; production build passes; diff whitespace check passes. Existing full-catalog deterministic/bounded/runtime tests pass. No existing test assertions were relaxed for this change.
- Closet display categories and garment IDs remain stable. The flat lay uses its existing positions according to assigned roles, preventing a thin cardigan and long cardigan from sharing one midlayer position. No CSS redesign.
- Browser verification: the main local dev service had stopped and its tab retained an old rendered page. Restarted the existing project on port 5173 and opened a fresh Today preview with the existing 14–16°C wardrobe. Latest strategy caption and outfit render normally; no captured console errors. No test closet edits, ratings or temperature changes were made.


## 2026-09-24 — GitHub release and free public demo

- README rewritten around user problems, product approach, business hypotheses and measurement, recommendation architecture, tradeoffs and deployment instructions. No unmeasured growth/revenue results are presented as facts.
- Full suite: 103 tests pass; production build passes. Vercel Git build configuration is included for optional future integration; Node 22 is specified for hosted builds.
- Latest application code pushed to the existing GitHub main branch in commit `af16f9f`.
- Published static `dist/` snapshot through Vercel Drop to Deploy in the existing **cg / Hobby** workspace as `wearwell-demo`. Production alias: https://wearwell-demo.vercel.app/ ; immutable deployment: https://wearwell-demo-kvlmtzo80-cg-cf62.vercel.app/ . No Pro/trial upgrade, payment details, model keys, database or paid integration was added.
- Verified public access in the in-app browser without Vercel login: welcome page, Build my closet transition, seasonal clothing imagery and Back navigation. No captured browser errors. This is an online smoke test; full engine regression coverage is automated locally.
- Deployment is a manual static snapshot and is not Git-connected. Future Git pushes do not redeploy automatically. Browser-local closet/feedback storage remains separate from localhost.
