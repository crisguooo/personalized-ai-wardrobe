# MVP verification

## Automated

- 27 Node tests pass, including two-degree coverage steps, Fahrenheit boundary equivalence, named winter equipment at threshold crossings, multiple winter accessories, and per-piece upper/lower range changes.
- Vite production build passes.
- Source formatting check passes.
- npm dependency audit reported zero vulnerabilities at install time.

## First-time onboarding redesign

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
