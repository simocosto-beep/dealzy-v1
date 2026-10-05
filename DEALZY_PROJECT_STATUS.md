# DEALZY — PROJECT STATUS

## Operating rule
Project name is the primary context key. Before any Dealzy action: recover Dealzy context, read this file, verify current GitHub/config/data state, then act. Never treat a failed search as proof that something does not exist. Group changes, test, review the diff, obtain user approval before production-impacting actions when appropriate, then deploy once.

## Verified state — 2026-10-05
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
