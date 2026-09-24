# Color intentionality and seasonal adaptation

## Color engine

`engine/color-engine.js` replaces family-count rules. `palette.js` is a stable re-export for existing callers. Garments carry `colorSpec`: semantic name, hue in degrees (null for achromatic), family, warm/cool/neutral temperature, 0–1 perceptual value and saturation, neutral-foundation eligibility, and approximate visual area. These are curated estimates, not color measurements extracted from a photograph.

Navy, dusty blue, medium denim blue and powder blue have distinct values/saturations. Existing blue denim receives a material-specific descriptor. Powder blue and charcoal are additional selectable swatches using the existing photo tint system; all prior IDs remain valid. The 72 archetypes now provide 1,008 variants.

Eight strategies are supported: monochromatic/tonal, warm tonal, cool tonal, neutral + accent, analogous, complementary, split complementary and high-contrast neutral. During generation, a strategy is selected around the outfit anchor before choosing supporting colors and shoes. Two preferred strategy lanes plus a bounded alternative lane retain variety; preference evidence can change strategy ordering. Historical or manually assembled looks infer their strongest strategy. Generated and saved looks retain `colorStrategy`.

The complete palette is evaluated using hue relationships, temperature dominance/controlled contrast, value relationships, saturation, proportion, vertical placement and tonal depth. Warm/cool contrast is supported when the selected harmony explains it. There is no universal preference for medium light-dark contrast. Tonal looks gain depth from value and texture variation, without requiring identical shades.

Areas approximate visible color influence: long coats dominate, shoes/details are smaller, outer layers partially hide inner tops and long coats partly cover bottoms. Dominant/support/accent roles separate value blocks within a family, so powder blue and navy remain visible as different contributions. 60/30/10 is inspiration, not an enforced percentage. Neutral repetitions and top-to-shoe echoes can create continuity; unrelated vivid blocks reduce placement and saturation scores.

No maximum-color-count tier or pair-specific ban remains. Red + burgundy may be tonal. Four well-structured colors may beat two incoherent colors. Physical compatibility and weather protection are unchanged. Optional accessories must still earn their place in the complete-look aesthetic evaluation; good color alone does not require adding another piece.

Likes learn temperature, saturation, contrast, complexity, strategy and accent preferences. Explicit color dislikes target those relationships; one ambiguous dislike contributes only weak strategy evidence and does not create an aversion to blue (or any named hue). Evidence-weighted personal blending avoids score saturation and permits low/high-contrast preferences to reverse palette rankings. The user's prior feedback is recalculated without resetting their wardrobe.

With `?debug=1#outfits` in a development build, the existing debug disclosure shows the chosen strategy and hue, temperature, value, saturation, proportion, placement, tonal-depth, personal-color and final-color scores. Its JSON also includes each garment's visible area and the dominant/support/accent breakdown. Production does not render this diagnostic panel. The regular palette caption uses the strategy name in its existing position.

## Seasonal selection

The creative pass builds complete looks first. `weatherPool` supplies eligible substitutions during subsequent weather adaptation. `rankForWeather` repeats eligibility checks for saved looks, swaps and callers supplying prebuilt candidates.

- Below 12°C: long-sleeved non-linen base; a tee cannot be rescued by a coat's warmth score. The complete outfit must still satisfy the warm-base requirements.
- Below −10°C: thermal base.
- At 22°C and above: lighter bases, no insulated winter bottoms; at 26°C and above: airy/short-sleeved bases or a linen shirt.
- Regular puffer: −5°C through 10°C, inclusive. Colder days call for an insulated parka/long puffer. Its standalone guide and ambient eligibility agree.
- Insulated winter boots: the forecast low must be strictly below 5°C by default. Boots have their own ambient guide (−25 to <5°C), separate from their additive insulation.
- Warm scarves, hats and gloves have upper ambient limits (12, 8 and 5°C). Warm-day generation cannot add these just to improve style/layering scores.
- Outer and middle layers also obey their upper ambient guide. Afternoon scoring checks those bounds again and evaluates removing layers, hats and gloves as the day warms. Non-removable footwear exceeding its upper bound contributes to the too-warm warning.

These are adjustable product defaults, not measured insulation ratings. Comfort offsets affect the base/layer choice; explicit per-piece temperature overrides apply to ambient bounds. A warm preference never licenses short sleeves at an actually cold low. Missing seasonally usable bases/shoes produce specific suggestions instead of fabricated closet items.

All three outfit surfaces (Today, Outfits and Swipe & Learn) use the weather-filtered candidate pool when a current forecast is available. Wardrobe setup readiness remains independent of whether the wardrobe currently covers the weather.
