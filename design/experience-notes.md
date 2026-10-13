# Dealzy warm experience — 13 October 2026

Approved direction: warm ivory, coral, plum, human photography, editorial typography.

The homepage uses the existing live provider search, favorites, itinerary, market picker, account and affiliate URLs. No API, database, payments or provider configuration is changed. Search supports Enter. City selectors use the existing market state. EN/FR switching remains available. Prices and availability come from providers; generated photographs are inspirational, never offer inventory.

Motion: slow photographic movement, sunlight, floating postcard, single entrance reveals and hover feedback. A pause control persists locally. System reduced motion, hidden document and offscreen hero stop the decorative animations.

Files: index.html, dealzy-experience.css/js, two local WebP photos, translations and minimal core UI hooks. Shared asset URLs and the service worker version are advanced together. Install invitation is below the main discovery content.

Assets generated for this design: a convivial sunlit terrace, and a Canadian alpine lake. Both compressed to WebP at 1280 px. Existing offer images retain provider provenance.

Validation completed: 47 Node tests pass, including two regressions for unknown coordinates and destination confirmation. Chromium UI checks with isolated test responses passed FR/EN, search with Enter and a CAD budget, city selection, favorites, keyboard detail access, travel and outdoor category navigation, pause and reduced motion. No horizontal overflow at 320/390/768/1440 px and no uncaught JavaScript errors. Test fixtures are not included in the public app.

The existing GitHub/Vercel integration generated a preview for draft PR #27. Production has not been promoted.
