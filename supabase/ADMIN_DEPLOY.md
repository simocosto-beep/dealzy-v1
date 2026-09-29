# Dealzy user administration rollout

1. Apply `migrations/20260929173649_harden_dealzy_users_admin_access.sql` to a development database and verify the role grants, user search RPC, detail RPC and denial of direct writes.
2. Deploy `dealzy-admin-user-auth` with `index.ts` and `permissions.ts`, keeping JWT verification enabled. Test User, Admin and Superadmin actions with dedicated test accounts. A target with a Superadmin role must return 403 for every administrative action.
3. Deploy the two compatibility functions (`dealzy-admin-users`, `dealzy-admin-user-action`) with JWT verification enabled. They now forward the caller token to the checked endpoints.
4. Deploy the web branch to a Vercel preview, test `/admin` and the reset link, then promote the tested revision to production.

Do not give the browser a service-role key. The only permitted browser writes to staff roles are through `dealzy_superadmin_set_staff`; all other user and account mutations go through the checked Edge Function. The Superadmin can maintain their own email and password through the authenticated My Dealzy account flow or password recovery, outside the administrative target actions.
