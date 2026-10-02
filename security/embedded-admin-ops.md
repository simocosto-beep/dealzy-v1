# Embedded administrative supervision

The site now uses Supabase pg_cron every ten minutes to run dealzy_ops.tick(). No ChatGPT task or open browser is needed. The private worker retires direct offers after their explicit ends_at date, records each action, reconciles queued email responses, and prepares intervention emails using existing provider, contract and cloud-sync diagnostics. It does not actively probe external provider APIs, perform arbitrary model-driven actions, change accounts, renew contracts or repair private client data.

Admin > Assistant admin shows interventions, execution history and email status. Only an active superadmin can save a Resend sending key, restricted to dealzyai.com, into Vault using dealzy_admin_ops_configure. The key is never returned or placed in client storage. Email is unavailable until this server credential is configured. Recipient and sender are fixed to the previously authorized superadmin and alert address in the worker.

Retries reuse the stored batch and idempotency key within 23 hours. Failed or uncertain sends stop automatic delivery and appear in the admin. accepted means API acceptance, not confirmed inbox delivery. This implementation does not yet poll delivery events or repair a failed notification configuration automatically.

SQL deployment: security/embedded-admin-ops.sql. Transactional tests: security/test-embedded-admin-ops.sql; run inside BEGIN/ROLLBACK after loading the deployment SQL. Tests cover offer expiry, preserving future offers, audit, restricted worker permissions, unauthenticated RPC refusal, API acceptance and uncertain-send blocking. All fixtures are rolled back. The existing 32 Node tests pass.

To pause: SELECT cron.alter_job(job_id := (SELECT jobid FROM cron.job WHERE jobname='dealzy-embedded-admin'), active := false);

The former ChatGPT admin-email task remains paused. Initial backend verification reported email_not_configured with no retired offers. A real autonomous email test is required after configuring the credential.
