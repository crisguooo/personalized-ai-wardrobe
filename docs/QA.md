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
