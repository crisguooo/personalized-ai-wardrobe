# Reference review and implementation plan

Reference: https://github.com/hastalasophia/chers-closet (inspected September 23, 2026).

Read README.md, CLAUDE.md, package.json, App.jsx, useCloset.js, illustrations.js, ClosetPage.jsx, OutfitCreatorPage.jsx, the outfit gallery, index.css and magic-build-system-prompt.md; inspected the src tree and bundled data schema.

## Actual architecture

React 18 + Vite 6 + React Router 6. Large page components use inline styles. Closet category carousels become filtered grids, with image-focused cards, bordered windows and tactile hover shadows. Outfit Creator has a clothing picker and category-positioned flat-lay canvas; individual layers support positioning, resize and stacking. Illustration filenames resolve through an eager import.meta.glob lookup. useCloset holds page-local React state backed by sessionStorage and seeds the author's personal wardrobe JSON. Magic Build sends metadata directly to Anthropic and parses itemIds plus explanation. Its embedded prompt contains the author's personal formulas and body/style preferences.

Documentation is partly stale: Magic Build is wired in the actual code, despite CLAUDE.md calling it unfinished. Actual persistence is sessionStorage, despite that file describing localStorage. sessionStorage ordinarily survives reload within the same tab; the implementation's comments incorrectly imply that it necessarily resets on refresh. The app includes travel/packing, screensaver and startup sequences unrelated to this product.

## Retain as ideas, rebuild as independent implementation

- Visual clothing selection, category browsing, flat lays and a replaceable illustration registry.
- Separate item metadata from image presentation.
- No upstream code, personal wardrobe data, illustrations, icons, prompt or fonts copied. No LICENSE was present in the inspected root; public visibility alone is not a reuse license.
- Remove personal styling prescriptions, travel, screensaver, inventory CRUD and client-side API credentials.

## New architecture

React/Vite UI; canonical catalog and color variants; pure deterministic validity, feature extraction, evidence updates, ranking and gap evaluation modules; one shared persistent application state; versioned localStorage adapter; bounded event abstraction; optional Node HTTP API with a provider interface for evidence-grounded summaries. Normal recommendation ownership is checked in deterministic code. Missing-item previews are an explicit, separately marked hypothetical mode.

## Implementation milestones

1. Private GitHub repository, reference inspection and original asset library.
2. Canonical closet selection and persistence.
3. Valid candidate generation, varied exploration, reason-aware feedback and fifth-rating insight.
4. Style DNA, personalized batches, occasion builder and localized swaps.
5. Preference-weighted wardrobe gaps with three previews.
6. Logic tests, production build, browser demo QA, documentation and push to private origin.

Design: editorial cream paper, ink typography, tomato-red interaction accents, serif headlines, illustrated clothing and tactile controls. The first screen is the closet itself.
