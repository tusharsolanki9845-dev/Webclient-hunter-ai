# Production Deployment Verification

## Completed Release Checks

| Area | Result | Evidence |
|---|---|---|
| Backend installation | Passed | Clean dependency installation with `npm ci --ignore-scripts`. |
| Backend regression suite | Passed | **5 of 5** tests passed. |
| Dependency audit | Passed | **0** reported production vulnerabilities. |
| Client syntax | Passed | `node --check frontend/js/main.js`. |
| Browser end-to-end suite | Passed | **11 of 11** preview scenarios passed. |
| Render and Vercel manifests | Passed | Root Render Blueprint, runtime configuration, and Vercel cache rule were checked. |
| Supabase project | Active | `Webclient-hunter-ai` in `ap-southeast-2`. |
| Database migration | Applied | Empty incompatible legacy tables were removed, then the production schema and hardening migrations were applied. |
| Database structure | Passed | `profiles`, `leads`, `audits`, and `outreach_messages` exist with primary keys, foreign keys, checks, timestamps, and RLS enabled. |
| Database security advisor | Passed | No remaining security lints. |
| Database performance advisor | Passed with expected informational notices | Only unused-index observations remain because the new production database has no traffic yet. |

## Supabase Database State

The production database now uses the application model in `supabase/schema.sql`. The former business-centric tables were incompatible with this application and had zero rows; they were removed before creating the current model. The new database contains no seeded application data.

Each application table has user-scoped row-level-security policies. The ownership expression is optimized as `(select auth.uid())`, and the trusted backend additionally enforces that any audit or outreach record can only reference a lead belonging to the same user.

## Required Final Host Configuration

The database itself is ready. Complete these encrypted API-host environment values before making the service public:

| Variable | Status | Source |
|---|---|---|
| `SUPABASE_URL` | Required | `https://hyfkiejoacyythtsemgt.supabase.co` |
| `SUPABASE_ANON_KEY` | Required | Supabase Project Settings → API → publishable or legacy anon key. |
| `SUPABASE_SERVICE_ROLE_KEY` | Required | Supabase Project Settings → API. Keep server-only. |
| `ALLOWED_ORIGINS` | Required | Exact final Vercel origin. |
| `OPENAI_API_KEY` | Optional | Required only for AI outreach. |

After the Render API has a public HTTPS URL, set `frontend/runtime-config.js` to that URL, deploy the static frontend, set the exact Vercel URL as `ALLOWED_ORIGINS`, and redeploy the API. See `README.md` and `supabase/DEPLOYMENT.md` for the full sequence.
