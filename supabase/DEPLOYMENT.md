# Supabase Production Deployment Runbook

This project uses Supabase for account identity and persistent user-owned application data. The API uses the project URL and public `SUPABASE_ANON_KEY` to verify each bearer token and create a user-scoped database client. Supabase Auth and the existing row-level-security policies enforce identity and ownership for every protected operation. Never put any private Supabase key in the browser, static-site configuration, or repository.

## Apply the Database

Open the target Supabase project, navigate to **SQL Editor**, and run `schema.sql` as a single query. This creates the `profiles`, `leads`, `audits`, and `outreach_messages` tables; timestamp triggers; user/lead ownership enforcement; supporting indexes; and row-level-security policies. It does not create sample leads or application users.

Immediately run `verify.sql`. It returns the expected tables, index definitions, policies, triggers, and row counts. On a new project, the row counts should all be zero.

| Database object | Role |
|---|---|
| `profiles` | Non-sensitive application profile metadata for each Supabase Auth user. |
| `leads` | User-scoped CRM leads with status and score data. |
| `audits` | Historical website-audit snapshots and finding arrays. |
| `outreach_messages` | AI-generated outreach drafts and lifecycle status. |

## Configure Supabase Auth

In **Authentication → URL Configuration**, set the Site URL to the final Vercel origin. Add the Vercel production origin and any approved staging origin to the redirect allow-list. Configure email confirmation, SMTP, password policy, and CAPTCHA according to the organization’s account-access policy before opening sign-up to end users.

## Configure the API Host

Set these values in the encrypted environment configuration of the Render API service:

| Variable | Required | Notes |
|---|---:|---|
| `SUPABASE_URL` | Yes | Exact project URL. |
| `SUPABASE_ANON_KEY` | Yes | Public Supabase Auth key used by the API for Auth verification and per-user RLS requests. |
| `ALLOWED_ORIGINS` | Yes | Exact Vercel frontend origin, without a trailing slash. |
| `NODE_ENV` | Yes | `production`. |
| `TRUST_PROXY` | Yes on Render | `true`. |
| `OPENAI_API_KEY` | Optional | Required only for outreach generation. |

Deploy the API after setting the variables. Confirm `GET /health` responds with `status: "ok"`. Update `frontend/runtime-config.js` with the deployed Render origin, deploy the frontend, and then test account creation with a real email address.

## Recovery and Operations

Use Supabase-managed backups and point-in-time recovery appropriate to the service plan. Before applying future schema changes, export the schema and test migrations against a staging project. Do not seed production with demo data; the application’s explicit demo workspace is browser-only.
