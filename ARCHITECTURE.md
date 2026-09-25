# Dealzy AI — Architecture Notes

## Goal
Dealzy should behave like a deals super-app: one search surface for discovery, comparison, savings, alerts, favorites, trips and partner checkout.

## Current layers

### 1. Client UI
`index.html`
- Home, Explore, Favorites, Trips, Profile
- Local intent parsing for fast fallback
- Geolocation permission flow
- Deal detail view
- Demo inventory clearly labeled as demo

### 2. Toolbox
`dealzy-tools.js`
- Smart Compare
- Budget Finder
- Savings Calculator
- Deal Alerts (local rules)
- Provider Search
- Split & Tip
- Source health/status
- Install/share

### 3. Provider abstraction
`dealzy-providers.js`
Normalizes provider results into one Dealzy shape and supports server + demo adapters.

### 4. Server gateway
`api/search.js`
Single endpoint for future affiliate/provider aggregation. Current mode is explicit demo fallback.

`api/health.js`
Reports service mode and readiness.

### 5. PWA shell
`manifest.webmanifest` + `sw.js`
Installable app shell and offline fallback for core static assets.

## Normalized deal shape
- id
- title
- category
- place/location
- coordinates when available
- current price
- original price
- rating/reviews
- image
- description
- partnerUrl
- source
- terms/disclosure

## Live-provider rule
All secrets stay server-side in Vercel environment variables. Never expose API keys in browser JavaScript.

## Recommended next modules
- Accounts + sync
- Cloud favorites/trips
- Push/email alerts
- Price-history store
- Map view
- Checkout attribution analytics
- Canada localization/currency
