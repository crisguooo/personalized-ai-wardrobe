# Wearwell styling engine

## Recommendation order

Occasion + learned taste → one aesthetic direction → silhouette archetype → layering structure → hero/anchor → supporting pieces (including shoes) → complete-look evaluation → weather adaptation → personal reranking and diversity.

This is a deterministic local engine. The optional server only writes evidence-backed profile prose; it does not select clothes. Product styling scores are adjustable heuristics, not calibrated probabilities or a visual vision model.

## Creative pass

`generate(ownedIds, { occasion, profile, requiredId, limit })` sees the whole closet, without weather. `directions.js` defines seven directions: minimal clean, relaxed street, sporty casual, soft feminine, polished casual, edgy and preppy. Occasion priors and observed style/direction preferences order those directions before generation.

Each direction restricts recipe slot pools using style-tag affinity. Specific tags matter; a shared generic “casual” tag cannot connect every aesthetic. Quiet, low-bulk shoes can bridge minimalist and tailored looks. Sparse closets retain their best available alternatives rather than becoming invalid for a subjective style mismatch.

Recipes include fitted/cropped + wide, oversized + straight/slim, roomy shell + fitted inner + relaxed leg, structured + relaxed, easy straight, and fluid volume. A bounded exploration recipe preserves less conventional proportions. The recipe selects an anchor (wide bottom, oversized top, structured top or shell) before support selection. Supports are chosen against the direction and palette; shoes are selected against the complete body silhouette, style language, formality and visual weight. There is no Cartesian enumeration of cardigan × coat × scarf stacks.

Generated records include `aestheticDirection`, `heroItemId`, `outfitArchetype`, `generationFormula`, `generationLayerStructure`, `layerStructure` and `occasion`. The same clothing IDs are deduplicated; the stronger direction interpretation wins. Generation is deterministic, owned-only and capped at 900 results (300 per Missing exploration). This is a representative search, not an exhaustive optimum.

## Fewer, purposeful pieces

The default is top + bottom + shoes. Every optional layer/accessory must improve the specific composition, with a small complexity cost and a minimum net improvement of 0.018. The whole outfit is checked again after an addition so a new accessory cannot justify leaving a redundant earlier layer in place.

`composition` evaluates direction consistency, shoe compatibility, visual weight, focal hierarchy, formula, proportion and palette as one look. Unrelated pieces and competing palettes reduce the complete-look score. `intentionalityScores` performs a leave-one-out comparison and exposes redundant IDs, cohesion, intentionality, direction coherence and shoe compatibility. Quiet outfits can be intentional through silhouette and texture; a brightly colored hero is not required.

An explicitly requested `requiredId` (used for Missing) stays in the hypothetical outfit, but must still pass the same overall quality threshold. Optional finishing-touch suggestions also need a measured improvement; ownership or compatibility alone is not sufficient.

## Weather adaptation

`weatherCandidates(ids, profile, weather, overrides, occasion)` first calls the creative pass. It selects aesthetically stronger seeds across directions and recipes, then adapts them through a bounded beam. Each adapted record retains `styleSeedId` and its direction. Unsuitable bases and shoes are substituted; missing thermal requirements get compatible replacements or additions. Additional insulation is considered only for an actual cold deficit. An extra is removed if its removal does not lose protection or meaningful aesthetic value.

`weatherEssentialIds` recomputes functional necessity from the actual forecast, including edited guides and personal comfort. Required winter pieces are exempt from the redundancy penalty, but not from whole-look style/color evaluation. `rankForWeather` independently checks all final garments and physical validity, including saved looks and swaps. It prioritizes available coverage and avoids materially worse discomfort; comfortable ranges are treated as equivalent rather than optimizing tiny arithmetic warmth differences ahead of aesthetics. Personal/occasion ranking runs on the suitable set.

Pass the forecast to `weatherCandidates` when asking it to construct weather-adjusted looks. Without a forecast it deliberately returns the creative pass, without forced winter bundles. `rankForWeather` validates supplied looks; it cannot invent missing wardrobe pieces.

Existing product defaults remain: winter bases cannot be summer tees, no two outer shells, regular puffer defaults to −5…10°C, winter boots strictly below 5°C, seasonal upper temperature limits, per-piece overrides, personal cold/warm offsets, morning protection and afternoon removal. Shortages are described honestly. These thermal guides are product estimates, not individualized physiological measurements.

## Ranking, learning and color

Centralized occasion weights normalize to one. In addition to silhouette, formula, visual weight, proportion, thermal/style coherence, focal hierarchy, color, layering, comfort, occasion and personal preference, the score now exposes complete-look cohesion, intentionality, direction coherence and shoe compatibility. Occasion has at least a 0.15 budget; personal taste retains its existing budget. Broad feature learning leaves headroom for specific, repeated pairing feedback rather than saturating similar looks at 1.0.

Likes learn direction and garment relationships; explicit dislike reasons update only relevant features. Ambiguous dislikes weakly affect the top–bottom pairing. Defined silhouettes and volume-on-volume can still outrank conventional proportions after repeated positive feedback. Physical incompatibilities remain invalid. Styling priors are not rigid garment bans.

The palette engine chooses a color strategy before supports and scores hue, temperature, value, saturation, visible area, placement and tonal depth. It has no three-color preference tier or red/burgundy ban. Color relationship preferences are learned from feedback; four intentional colors can beat two incoherent colors. See COLOR_AND_SEASONS.md for the color model and debugging fields.

Diversity varies silhouette/core items among comparable scores; it does not add items for novelty. Swaps lock all unselected IDs. Refinements adjust temporary scoring targets. Changing a plan regenerates its candidates with the new occasion, then ranks them. Saved outfits and feedback retain direction/hero/archetype metadata; old records infer a direction and require no reset.

Missing continues to count distinct qualifying archetype combinations, not recolors or raw candidate counts. These are sampled estimates, separate from weather shortages. The UI layout and controls are unchanged by this engine revision.

## Validation and inspection

`npm test` covers construction, colors, temperatures, direction generation, shoe matching, optional-piece removal, learned exceptions, persistence, shortages and opportunity scoring. The two user-reported failures are direct aesthetic regression fixtures:

- fitted beige top + black cargo + black sneakers + beige cardigan + black blazer + blue scarf;
- red knit + blue sweatpants + black puffer + black sneakers + blue scarf.

Both are physically valid but receive low default cohesion/intentionality. Perturbed garment/color fixtures exercise the same general behavior. Separate tests verify necessary winter accessories remain and that summer looks do not acquire arbitrary layers.

In a development build, `?debug=1#outfits` exposes the current numeric breakdown. It is absent from production. Styling still depends on archetype metadata and learned feedback, not visual inspection of each real garment; material and cut differences within an archetype are a known limit.


## Construction-based layer roles

`data/layers.js` separates display categories from `layerRole`, allowed `layerRoles`, and `outerwearRole`. Construction metadata (intended use, length, bulk, structure and fit/volume) is authoritative. Thin/fitted layering knits are midlayers; regular soft knits may fill mid or light-outer slots; long, bulky, oversized or structured layering pieces occupy the dominant outer slot. Jackets and coats have outer intended use. No item-name or color-pair bans are used.

Generation chooses one of `base`, `base + mid`, `base + outer`, `base + mid + outer` before choosing garments. Each slot has a role-filtered pool. Planned layers still have to earn their place aesthetically; merely supporting a three-layer plan does not make that plan preferable. Accessories cannot introduce unplanned clothing layers.

`assignLayers` resolves an explicit mid/outer relationship and checks cumulative inner bulk against layer capacity, plus the middle piece's softness, volume and hem against the outer garment. One dominant outer is allowed. A long cardigan therefore competes with a bomber, leather jacket or puffer; a thin cardigan may fit under a roomy long coat. Two pieces sharing a Closet category can occupy distinct valid slots. Swaps target effective roles, and weather replaces the occupied outer slot instead of stacking another shell.

The same assignment powers validation/ranking (including old saved candidates), formula recognition, shoe grounding, color occlusion, debug slot IDs and existing flat-lay positions. Closet taxonomy, IDs and temperature guides remain unchanged. These are construction estimates at archetype level, not measurements of individual garments.
