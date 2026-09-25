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
- `/api/providers` source-status endpoint
- `/api/health` service health endpoint
- Security headers via `vercel.json`
- SEO basics: sitemap, robots, Open Graph metadata
- Demo inventory fallback

## Provider strategy
The UI must remain provider-agnostic. Live affiliate/provider feeds should map into one normalized Dealzy deal shape (id, title, category, location, coordinates, price, originalPrice, rating, image, partnerUrl, source, terms).

Planned adapters:
- Groupon / approved affiliate source
- CJ Affiliate
- Travel/ticket providers
- Additional local commerce APIs where licensing permits

No credentials or secrets should be committed to this repository. Live API calls should use Vercel server-side functions and environment variables.

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
