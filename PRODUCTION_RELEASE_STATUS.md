# Production Release Status

## Completed

The **Webclient-hunter-ai** Supabase project (`hyfkiejoacyythtsemgt`, `ap-southeast-2`) is active. Its former empty, incompatible application tables were replaced with the current CRM and audit model. The database now contains the `profiles`, `leads`, `audits`, and `outreach_messages` tables with user ownership enforcement, row-level security, checks, indexes, timestamp triggers, and a profile trigger for new Supabase Auth users.

The following migrations were applied to the active project in order:

| Migration | Purpose |
|---|---|
| `reset_empty_legacy_webclient_schema` | Removed verified empty incompatible legacy tables. |
| `webclient_hunter_ai_production_schema` | Created the production tables, constraints, indexes, triggers, and RLS model. |
| `harden_webclient_supabase_security` | Moved `pg_trgm` out of the exposed schema and revoked public trigger-function execution. |
| `optimize_webclient_rls_policies` | Optimized RLS user lookups for query planning. |

Supabase’s security advisor reports **no security findings**. Its performance advisor reports only expected informational notices that newly created indexes have not yet received production traffic.

The release also includes the completed OAuth application surface: Google and GitHub provider buttons, a provider-restricted API initiation endpoint, a clean `/auth/callback` Vercel route, server-side Supabase token verification, callback error handling, and test coverage that confirms unavailable or malformed OAuth flows fail closed. The provider client secrets are intentionally not stored in this repository.

## Required Before Public Launch

The database is provisioned. Configure the API host with the three required Supabase values and the exact frontend CORS origin:

```text
SUPABASE_URL=https://hyfkiejoacyythtsemgt.supabase.co
SUPABASE_ANON_KEY=<publishable or legacy anon key from Supabase Project Settings>
SUPABASE_SERVICE_ROLE_KEY=<server-only key from Supabase Project Settings>
ALLOWED_ORIGINS=https://your-final-vercel-domain
```

After the API is deployed, set `frontend/runtime-config.js` to the API’s final HTTPS URL, deploy the frontend, configure the final Vercel URL in Supabase Auth redirect settings, and perform the production acceptance checks in `README.md`.

To enable social sign-in, the account owner must additionally create a Google OAuth client and a GitHub OAuth App, then enter each client ID and secret in **Supabase Authentication → Providers**. The provider callback in both provider consoles must be `https://hyfkiejoacyythtsemgt.supabase.co/auth/v1/callback`. In Supabase **Authentication → URL Configuration**, set the Site URL to the final Vercel origin and allow both `https://YOUR-VERCEL-ORIGIN/auth/callback` and the relevant preview callback URL(s) used for testing. See `SUPABASE_AUTH_OAUTH_PRODUCTION.md` for the complete walkthrough.
