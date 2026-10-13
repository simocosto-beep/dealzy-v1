# Dealzy Évasion — 13 October 2026

Approved direction: concept 3, selected by the owner: forest green, warm ivory, champagne light, immersive photography and confident sans-serif typography. Replaces the rejected coral/plum/serif concept on the existing preview branch.

Homepage: panoramic lake hero, legible bilingual headline, responsive search, occasion shortcuts within the landscape, two clearly labelled inspirational cards, live provider offers, travel and destination sections, coherent dark-green footer and mobile navigation.

Identity: new native SVG horizon/mountain/water symbol in header and footer; favicon, maskable app PNGs (180/192/512), installation card, country/info guides, admin/reset logos and social share preview use the same design. Branding URLs and the service worker are versioned together to retire cached old icons. App background and browser theme match the new palette.

Motion: restrained slow photographic zoom, moving sunlight, entrance reveals and image/card hover feedback. Pause persists locally; system reduced motion, hidden document and offscreen hero stop decorative animation. Pausing never hides content.

Existing provider search, favorites, travel hub, city picker, account and affiliate URLs remain connected. No backend, database, payment or provider configuration changed. Saved legacy hero copy no longer overwrites the design; genuine custom admin copy remains supported.

The new hero photograph is generated inspiration, not an offer image. Two existing generated inspirational assets are reused. Live offer images retain their provider provenance. The SVG logo and interface icons are code-native vectors.

Hero asset: assets/experience/escape-horizon.webp, 1536 × 1024, approximately 231 KB. Built-in image generation was used. Prompt: cinematic Canadian mountain lake at golden hour, woman with olive backpack in the right third, calm dark forest and water on the left for UI text, warm sun rays, natural editorial texture, no text/logo/UI, inspirational landscape rather than a specific bookable property. Original generation: exec-b27af165-2d94-485d-b198-856ff8e139d4.png.

Validation: all 47 existing Node tests pass. Local Chromium with isolated test provider responses passes FR/EN (including saved legacy runtime copy), installation branding and position, assistant/tools dialogs, pause, Enter search with city and budget, favorites, keyboard offer details, travel filter, market picker, outdoor search and reduced motion. No horizontal overflow at 320, 390, 768 and 1440 pixels; no uncaught page errors. Desktop and mobile layouts visually reviewed. Fixture offers and QA screenshots are not published.

Delivery: existing draft PR #27 and its GitHub/Vercel branch preview. Production is not promoted by this design update. The Vercel preview uses the project's existing access protection; the connector has not been able to bypass it, so local UI validation is reported separately from deployment readiness.

## Follow-up: SIM CORP and animated light

The owner approved the Évasion direction and requested the SIM CORP © signature and stronger animation. The main footer and country/info-page footers now include that signature. Moving sunlight, restrained lake glints, a drifting lake photograph and a gold headline accent animate the landscape. The existing pause, reduced-motion preference, document visibility and offscreen detection also cover the new layers and pseudo-elements.

Affiliate audit: the public production provider endpoint reports Booking enabled, Expedia's Dealzy shop enabled, Viator production configured, Ticketmaster and Yelp configured, and Awin awaiting its key. A real Miami activity request returned 20 live results from Ticketmaster and Viator. The protected preview API could not be inspected without its existing Vercel sign-in; its empty state must not be described as proof of missing production affiliations. The Booking search link is now visible in the homepage partner strip, and Travel Hub car/attraction buttons use the existing approved Booking affiliate redirect. Commission eligibility remains governed by the partner agreement; no commission or sale is claimed from a test.

Validation: 47 Node tests pass, plus the existing Chromium flows and new checks for SIM CORP text, three decorative light layers, pause on water and pseudo-elements, reduced-motion removal, and responsive overflow. No backend or credentials were changed.

A read-only integration check served the updated UI locally against the actual public provider/search API responses: 12 homepage offer cards rendered, Booking retained its affiliate tracking and selected Miami destination, Expedia pointed to the Dealzy USA shop, and the corporate signature rendered. No JavaScript page errors occurred. This verifies the real-data frontend independently of the protected preview environment.
