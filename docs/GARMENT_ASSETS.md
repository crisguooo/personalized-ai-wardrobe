# Photographic garment assets

All 72 archetypes render with photographic grayscale atlases. The original 36 use `public/assets/wardrobe-atlas.png`; the seasonal/additional 36 use `public/assets/wardrobe-seasonal-atlas.png`. Each atlas is a 6 × 6 grid. Catalog sprites 36–71 map to cells 0–35 in the second atlas. Existing item IDs, ownership and tint colors are preserved. The renderer no longer uses the legacy SVG shapes.

The seasonal atlas was generated with the built-in imagegen tool on 2026-09-24, using the original atlas as a style reference. No CLI generation or external account key was used.

## Generation prompt

Use case: product-mockup. Asset type: one production wardrobe sprite atlas for Wearwell. Generate a NEW square 6-column by 6-row photographic contact sheet, exactly 36 equally sized square cells, matching the attached reference atlas's grayscale isolated clothing product photography style, scale, front-facing/flat lay arrangement, real textile detail and soft even studio lighting. Reference is STYLE ONLY; use the NEW subjects listed below. Each complete item centered inside its own equal cell with at least 10% blank padding, no clipping, no cross-cell overlap, no grid lines, no labels, no numbers, no text, no logos, no models or hangers. Pure white background. All fabrics medium neutral gray (not near black or white), realistic knit/fleece/leather/fabric weave, folds, seams, stitching and dimensional shading; avoid vector, line art, cartoon, 3D plastic. Highest resolution square available. Footwear/accessories are realistically photographed too. Maintain exact row-major order:
Row1: pair knee-high leather boots; loosely folded long soft wool scarf; fine-gauge cashmere crewneck sweater; long-sleeve subtle plaid flannel button shirt; fitted ribbed long-sleeve top; open-front long knee-length knit cardigan.
Row2: straight wool tailored trousers; fleece-lined fitted leggings; pleated midi skirt; cotton casual shorts; cropped waist-length light jacket; short hip-length wool jacket.
Row3: pair Chelsea ankle boots; small crossbody bag with visible strap; long-sleeve crisp cotton button-down shirt; breezy linen short-sleeve collared shirt; turtleneck sweater; fitted long-sleeve thermal base top.
Row4: thin V-neck button cardigan; zip-front fleece jacket; sleeveless padded puffer vest; ankle-cropped tailored trousers; relaxed linen trousers; athletic leggings.
Row5: fleece-lined straight warm pants; long quilted down coat; hooded insulated parka; hooded lightweight rain jacket; pair summer sandals; pair insulated winter boots.
Row6: wool knit beanie; pair winter gloves; curved leather belt with buckle; pair hoop earrings; sunglasses; canvas tote bag.
The 36 objects must all have the same authentic photographic rendering quality as the provided style reference.

## Color composition

Palette ranking supports repeated black, beige, cream, white, grey, camel, brown and navy as foundational neutrals. Red, burgundy and olive are accent colors. Relative visible area is estimated from clothing category and length; layered tops are partly covered. This is a styling heuristic, not a measured percentage of a photograph.

A single accent family occupying at most 25% of estimated visible area gets an accent bonus when the remaining base uses at most two neutral colors. Large bold garments, multiple accent families and scattered base colors lower the score. Repeating a bold hue increases its area; repeating a neutral does not incur a new-color penalty. Temperature coverage and physical layer compatibility still take priority. Palette scores remain soft preferences and never remove an owned item or invent missing clothing.
