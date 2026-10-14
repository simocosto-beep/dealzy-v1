# DEALZY — PROJECT STATUS

## Operating rule
Project name is the primary context key. Before any Dealzy action: recover Dealzy context, read this file, verify current GitHub/config/data state, then act. Never treat a failed search as proof that something does not exist. Group changes, test, review the diff, obtain user approval before production-impacting actions when appropriate, then deploy once.

## Affiliate audit — 2026-10-14
- Booking and Expedia US/CA URLs retain their existing publisher/creator attribution. A successful redirect is not evidence of a payable commission.
- Skyscanner now uses an ordinary, unmonetized search URL. The previous referral ID came from example documentation; do not restore it or substitute an unapproved account ID.
- Both flight forms share route/date/market validation. The Travel Hub keeps invalid input editable.
- Travel Hub uses canonical affiliate IDs and starts authenticated keepalive tracking before navigation. Guests retain local history; the server report still counts signed-in members only.
- Magic Story remains US-only. Removed the unverified 45% discount from displayed copy; existing tracking URLs are preserved.
- Mobile Explore grid and affiliate text must fit the viewport so favourite buttons remain reachable.
- Verification: `npm test` (57 passing). Mobile browser checks at 390px passed for Miami/USD and Toronto/CAD: live API results, offer clickout, favourites surviving reload, canonical Travel Hub attribution, flight market parameters and account login form. Booking/Expedia cards remain aligned.
- Browser click tracking used local fixtures; no artificial member clicks, bookings, emails or account changes were written to production. Physical Android use and merchant checkout/commission settlement are not covered by these checks.

## Historical state — 2026-10-05
- Repository: simocosto-beep/dealzy-v1; production branch: main.
- Affiliate registry: dealzy-affiliates.js.
- Magic Story is ALREADY integrated for USA only.
- Magic Story CJ advertiser ID: 8056181.
- Magic Story promo tracking: https://www.tkqlhce.com/click-101895085-17360114.
- Magic Story evergreen tracking: https://www.tkqlhce.com/click-101895085-17360179.
- Offer copy: 45% off first subscription book / 45 % sur le premier livre avec abonnement.
- Other affiliate entries currently visible in registry: Pelago, Tours4fun, KKday, eSIMX; Expedia destinations are separate.
- Canada must remain separate from USA; Magic Story currently has no CA URL in the registry.
- Known maintenance item: affiliate-partners.test.mjs still reflects the earlier four-partner assumptions and should be reviewed before the next Dealzy code batch.

## Do not redo
- Do not re-integrate Magic Story unless the existing implementation is intentionally being replaced.
- Do not assume an affiliate is absent based only on code-search returning zero results; inspect the authoritative registry.
