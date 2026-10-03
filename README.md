# Dealzy AI

**Amazing Deals. Smarter Choices.**

Dealzy is evolving into an AI-powered deals super-app: one search experience for local experiences, food, wellness, travel, shopping, comparison, savings, alerts, favorites and trip planning.

## Current V1.4 — Super App
- Responsive mobile-first web app
- Dealzy AI local intent parsing
- Browser geolocation (permission based)
- Categories, favorites, trips
- Deal detail pages
- Dealzy Toolbox:
  - Smart Compare
  - Budget Finder
  - Savings Calculator
  - Local alert rules
  - Provider search
  - Smart Planner
  - Price Watch
  - Coupon Vault
  - Backup & Restore
  - Split & Tip
  - Provider status
  - Install/share
- PWA manifest + service worker app shell
- Server-side `/api/search` provider gateway with demo fallback
- `/api/recommend` intent-aware recommendation endpoint
- In-app Dealzy Assistant chat (FR/EN): real Gemini replies grounded in Dealzy live search results when `GEMINI_API_KEY` is set on the server. Otherwise it offers the existing guided search without presenting it as an AI conversation.
- `/api/providers` source-status endpoint
- `/api/health` service health endpoint
- Security headers via `vercel.json`
- SEO basics: sitemap, robots, Open Graph metadata
- Demo inventory fallback

## Provider strategy
The UI must remain provider-agnostic. Live affiliate/provider feeds should map into one normalized Dealzy deal shape (id, title, category, location, coordinates, price, originalPrice, rating, image, partnerUrl, source, terms).

The Awin Offers adapter is wired into live search but remains inactive until an approved publisher account supplies both `AWIN_PUBLISHER_ID` and `AWIN_ACCESS_TOKEN` as **server-only** Vercel environment variables. It requests active US/CA offers from joined advertisers, keeps only HTTPS tracking links, and exposes an online Shopping category when configured. The API has no verified price fields, so Dealzy displays a promotion or voucher code without a fabricated original price or percentage saving. Set the variables in Preview first, verify actual response shape and joined offers, then set Production. The token must never be placed in client code or GitHub.

Other planned adapters:
- Groupon / approved affiliate source (the Groupon North America application in CJ is pending as verified on 3 October 2026; no live Groupon inventory or commission access is configured)
- CJ Affiliate
- Travel/ticket providers
- Additional local commerce APIs where licensing permits

No credentials or secrets should be committed to this repository. Live API calls should use Vercel server-side functions and environment variables.

### Abracadabra NYC seasonal link
After confirming the CJ advertiser relationship and obtaining a real CJ click URL, set `CJ_ABRACADABRA_URL` in Vercel. An image card and Halloween category appear only for visitors browsing the US market during October 2026. They are hidden when the URL is absent, invalid, or disabled with the public runtime provider setting `cjAbracadabra.enabled=false`. The card links to the merchant; it makes no discount or price claim. Review the destination and CJ tracking before setting Production, and remove the variable when the campaign ends.

### Expedia Travel Creator shop
The approved Dealzy Travel Creator shop is linked from Home, Explore and the Travel Hub. Links select the USA or Canada hotel collection for the current market (19 properties each, verified 3 October 2026). Morocco/Zinkom links are kept outside Dealzy. The public `expedia.enabled` switch and click tracking remain supported. This is external booking, not a price feed; Expedia US/Canada applications through CJ remain pending.

### Approved Impact partners
Pelago, Tours4fun, KKday and eSIMX are shown on Home, Explore (All/Travel) and the Travel Hub with affiliate disclosure. The eight country-specific URLs in `dealzy-affiliates.js` were generated in Impact on 3 October 2026 using `subId1=dealzy`, `subId2=us|ca` and `subId3=travel-partners`. Tours4fun USA specifically covers the American West. `/api/providers` advertises active clickouts and respects each provider’s runtime `enabled` flag. These links do not supply live prices or add to `liveExternalProviders`. No Zinkom/MA link is distributed in this catalog.

## Search visibility
The homepage and localized US, Canadian English, and Canadian French landing pages are linked in HTML, use distinct canonical URLs and reciprocal `hreflang` tags, and appear in `sitemap.xml`. Country page city links use validated `country`, `city`, and `lang` query parameters to open the app in the selected market; the app consumes those parameters and removes them from its URL. Public country pages describe functionality and provider limitations without indexing individual, short-lived offers. Keep the Search Console verification meta tag in the homepage while the URL-prefix property is in use.

## Free AI assistant setup
Create a Gemini API key in Google AI Studio on a **Free tier** project, restrict it to the Gemini API, and set `GEMINI_API_KEY` as a Vercel server-side environment variable for Preview and Production. Redeploy after setting it. The assistant uses `gemini-3.5-flash-lite`, calls the model only after a visitor sends a message, and has short inputs/outputs plus a per-instance request throttle. The Free tier has project-specific limits; if it is exhausted, the chat reports the temporary limit and does not switch to paid usage on its own. Do not enable billing for this key if zero spend is required. The UI discloses that messages are sent to Google on the Free tier; Dealzy sends the chosen city and a small set of public live offers, not precise GPS or account data. Chat history is held in memory for the current page only.

### Admin AI moderation

The **IA Modération** tab reviews existing direct deals on demand; **Deals → Vérifier le brouillon avec l’IA** reviews a proposed direct deal before publishing. Both call the existing `/api/assistant` function with `action: "moderate_deal"`, so this adds no Vercel function. The server verifies the Supabase JWT and current admin role; existing offers are fetched again from Supabase by ID. Only offer fields needed for review go to Gemini, with contact strings and URL query parameters stripped. Google may use Free-tier inputs to improve its products. Model output and basic field checks are advisory. Publishing and disabling still require an admin using the existing audited RPC actions. No user-submitted listings or automatic moderation queue exist in this version. The feature needs `GEMINI_API_KEY` in the deployment environment where it runs; without it, the UI reports that AI is not configured.

## Product principle
One search bar should understand intent: what, where, when, budget, party size and preferences. The user should not need to understand which provider supplies the deal.

## Safety and trust
Display source, current price, original price when verified, partner terms and affiliate disclosure. Do not present demo inventory as live partner inventory.

## V1.3 architecture
- UI remains provider-agnostic.
- Browser features are progressive enhancements; core browsing still works when location or APIs are unavailable.
- Live provider credentials must stay in Vercel environment variables and server-side functions only.
- The search API currently exposes demo fallback explicitly; it must never label demo content as a live partner offer.

## Next integration gates
1. Add approved live affiliate credentials in Vercel.
2. Implement provider adapters server-side.
3. Add user accounts before cloud-synced favorites and server alerts.
4. Add push/email alert delivery after explicit user opt-in.
5. Expand Canada only after currency, localization and partner coverage are verified.

## Super App direction
Dealzy V1.4 groups discovery, local search, comparison, planning, savings tools, price watches, coupon storage, nearby mapping, profile preparation and backup/restore in one interface. Live commerce data remains gated behind approved provider credentials.

## Cloud backend
- Supabase project connected for Dealzy Auth + Cloud Sync.
- RLS-protected tables for profiles, saved deals, trips, trip items, alerts, price watches and coupons.
- Legacy JSON sync table retained for compatibility while features migrate to normalized tables.
- Security advisor currently reports no issues.


## Travel provider validation
- Booking.com live accommodation data was successfully queried through the connected ChatGPT provider for Miami test dates.
- Skyscanner is connected in ChatGPT for assisted flight-price searches.
- These ChatGPT connections do **not** automatically grant Dealzy's public website API credentials.
- Public Dealzy travel search remains gated until official provider API/affiliate access is available.


## Travel Hub
- Hotels, flights, rental cars and things-to-do are grouped in one Super App module.
- Searches can be saved locally and included in cloud backup/sync.
- Hotels open Booking.com search, flights open Skyscanner search, while Dealzy waits for its own official public provider credentials.
- Dealzy never labels provider click-through data as native live Dealzy inventory.


## Hybrid normalized sync
Dealzy now keeps the compatibility JSON snapshot while also upserting cloud data into normalized Supabase tables for profiles, favorites, alerts, price watches, coupons and travel searches. Stable client keys are used to avoid duplicate rows during repeated automatic syncs. No destructive table replacement is used by the sync endpoint.
