# Dealzy user administration rollout

1. Run `npm ci && npm test`. The suite executes the migration against an isolated PostgreSQL database, checks grants and role actions, and exercises the Edge handler with a mocked Supabase API. Check the production catalog for matching columns and legacy function signatures before applying the SQL.
2. Apply `migrations/20260929173649_harden_dealzy_users_admin_access.sql` and verify direct writes are denied, the three legacy role/status RPCs have no authenticated `EXECUTE` privilege, and the staff RPC protects all superadmin rows. The migration does not rewrite production user data.
3. Deploy `dealzy-admin-user-auth` with `index.ts` and `permissions.ts`, keeping JWT verification enabled. Then deploy `dealzy-admin-users` and `dealzy-admin-user-action`, also with JWT verification enabled. They forward the caller token to the checked implementation.
4. Test User, Admin and Superadmin actions with dedicated test accounts where available. A target with a Superadmin role must return 403 for every administrative action. Deploy the web branch to a Vercel preview, test `/admin` and the reset link, then publish the tested revision to production.

Supabase branching is unavailable on this project's Free plan, and the account has reached its active Free project limit. The committed PostgreSQL and mocked Edge tests provide an isolated pre-deployment gate; they do not replace a live end-to-end test with separate Supabase accounts.

Do not give the browser a service-role key. The only permitted browser writes to staff roles are through `dealzy_superadmin_set_staff`; all other user and account mutations go through the checked Edge Function. The Superadmin can maintain their own email and password through the authenticated My Dealzy account flow or password recovery, outside the administrative target actions.
