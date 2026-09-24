# MVP verification

## Automated

- 16 Node tests pass, covering metadata, validity, owned-only generation, exploration, targeted feedback, opposite taste profiles, ranking uplift, single-item swaps, weighted gaps, storage, the no-key provider, early setup completion, optional groups, resumable drafts and returning-user migration.
- Vite production build passes.
- Source formatting check passes.
- npm dependency audit reported zero vulnerabilities at install time.

## First-time onboarding redesign

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

Verified before the onboarding redesign in Chrome on localhost with a newly created application origin. The catalog/starter entry below is now available after onboarding:

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
