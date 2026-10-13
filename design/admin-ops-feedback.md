# Admin assistant feedback — 14 October 2026

The assistant dashboard could remain on “Chargement du suivi…” after a failed request, while a short-lived generic “Failed to fetch” alert disappeared. The email configuration form also appeared for every superadmin, even when the server reported an existing connection.

The snapshot now has a persistent loading, ready or error state and an explicit retry button. A failed network read receives one automatic retry; each attempt times out after 12 seconds. Concurrent reads are deduplicated, and initial navigation no longer triggers two loads. Previously loaded diagnostics stay visible with their fetch time and an explicit warning when a refresh fails. Before the first successful read, empty sections are labelled unavailable rather than interpreted as “no issues”.

An existing email connection exposes “Modifier la connexion email”, keeping the key form closed until requested. Only superadmins see configuration controls, and the existing server authorization remains unchanged. Configuration writes are never automatically retried; key input is cleared after submission or cancellation. A successful write is not relabelled a failure when its subsequent diagnostic refresh fails. The browser asset revision is `20261014-ops-feedback1`.

Validation:

- Existing Node regression suite: 47 passed.
- Browser integration checks against the actual HTML and JavaScript, with isolated local API fixtures: transient recovery, persistent failure, manual retry, preservation of stale diagnostics, forbidden responses without retry, hung-request timeout, configured/unconfigured email forms, cancellation, admin/viewer restrictions, write failure without replay, and successful write followed by failed refresh.
- Layouts checked at 320, 390, 768 and 1440 pixels without horizontal document overflow; ready and failure screens visually reviewed at 390 pixels.
- Read-only production database verification: schedule active, email key present (boolean only), successful checks at 23:10/23:20/23:30 UTC on 13 October, and no failed or unknown email batches. No key value was read or changed and no email was sent by these checks.

The original browser network interruption cannot be attributed to a precise cause from the screenshots. This change makes recovery and failure states usable; it does not claim to prevent all network outages.
