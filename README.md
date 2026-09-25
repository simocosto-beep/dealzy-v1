# Dealzy AI

**Amazing Deals. Smarter Choices.**

Dealzy is evolving into an AI-powered deals super-app: one search experience for local experiences, food, wellness, travel, shopping, comparison, savings, alerts, favorites and trip planning.

## Current V1.2
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
  - Provider status
  - Install/share
- PWA manifest + service worker app shell
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
