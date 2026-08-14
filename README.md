# WebClient Hunter AI

WebClient Hunter AI is a secure lead-management workflow for freelancers and agencies. It combines a static browser application, an Express API, Supabase-backed account and lead data, bounded website audits, and optional AI outreach drafting.

> **Deployment model:** Deploy the API and all secrets to Render, then deploy the static frontend to Vercel. The browser receives only the public API origin through `frontend/runtime-config.js`; it never receives Supabase service-role credentials or an OpenAI key.

## Release Status

The project is ready for deployment with clean-URL-aware access protection, explicit browser-only demo mode, production CORS controls, health checks, rate limits, deterministic API installation, and a non-secret frontend runtime configuration file.

| Layer | Deployment artifact | Purpose |
|---|---|---|
| API | `render.yaml` at repository root | Render Blueprint for the `backend/` Node service. |
| API configuration | `backend/.env.example` | Local and production variable contract. |
| Browser client | `frontend/` | Static site to deploy to Vercel. |
| Browser configuration | `frontend/runtime-config.js` | Public API origin only; edit this after the Render service is live. |
| Static host configuration | `frontend/vercel.json` | Clean URL rewrites, security headers, and safe cache policy for runtime configuration. |
| Database | `supabase/schema.sql` | Supabase schema and row-level security policies. |

## Prerequisites

Use Node.js 18 or later, a Supabase project, a Render account, and a Vercel account. An OpenAI API key is needed only when the outreach-generation feature is enabled.

## 1. Provision Supabase

Create a new Supabase project. In its SQL Editor, run `supabase/schema.sql`, then run `supabase/verify.sql` to confirm tables, indexes, triggers, and row-level security. In the Authentication settings, configure the production frontend URL and the required redirect URLs. Enable email confirmation if that matches your account-verification policy.

| Value | Source | Where it is used |
|---|---|---|
| `SUPABASE_URL` | Supabase Project Settings → API | Render API environment. |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Project Settings → API | Render API environment only. Never place this in the frontend. |
| Auth redirect URL | Final Vercel domain, e.g. `https://app.example.com` | Supabase Authentication settings. |

## 2. Deploy the API to Render

Connect this repository in Render and create a Blueprint deployment from the root `render.yaml`. The Blueprint uses `backend/` as its root directory, runs `npm ci`, starts `node server.js`, and exposes `GET /health` for health checks. Do **not** set `PORT`: Render provides it automatically and the server reads it from the runtime environment.

Set the following encrypted environment variables in Render before the first production deploy.

| Variable | Required | Production value |
|---|---:|---|
| `NODE_ENV` | Yes | `production` |
| `TRUST_PROXY` | Yes on Render | `true` |
| `SUPABASE_URL` | Yes | Your Supabase project URL. |
| `SUPABASE_ANON_KEY` | Yes | Supabase public Auth key used by the API for normal sign-up and sign-in. |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Server-only Supabase service-role key. |
| `OPENAI_API_KEY` | Only for outreach | Server-only OpenAI key. |
| `OPENAI_OUTREACH_MODEL` | No | `gpt-4o-mini` is the supplied default. |
| `ALLOWED_ORIGINS` | Yes | The exact Vercel frontend origin, without a trailing slash. |
| `DEMO_MODE_ENABLED` | No | Keep `false`; demo data is browser-only. |
| `RATE_LIMIT_WINDOW_MS` | No | `900000` by default. |
| `RATE_LIMIT_MAX_REQUESTS` | No | `100` by default. |
| `AUTH_RATE_LIMIT_MAX` | No | `20` by default. |
| `AUDIT_RATE_LIMIT_MAX` | No | `20` by default. |
| `OUTREACH_RATE_LIMIT_MAX` | No | `10` by default. |

After deployment, open `https://<your-render-service>/health`. It must return JSON with `status: "ok"` and `environment: "production"`.

## 3. Deploy the Frontend to Vercel

Import the same repository into Vercel and set the **Root Directory** to `frontend`. This is a static deployment; no server-side Vercel environment variables or secret keys are needed. The included `vercel.json` provides clean routes such as `/dashboard` and `/search`, security headers, and a no-cache policy for the public runtime configuration file.

After Vercel assigns a stable URL, edit `frontend/runtime-config.js` before deployment (or edit it through your deployment process) to point at the exact Render API origin:

```js
window.WCHA_RUNTIME_CONFIG = Object.freeze({
  apiBase: 'https://your-render-service.onrender.com',
});
```

The value must be an HTTPS origin and must not include `/api`, a path, a trailing slash, or any secret. Redeploy the frontend after changing it.

Then set Render’s `ALLOWED_ORIGINS` to the exact final Vercel origin, for example:

```text
https://your-project.vercel.app
```

If you use a custom domain, add that domain to both Vercel and `ALLOWED_ORIGINS`, then redeploy the API. Multiple permitted frontend origins may be supplied as comma-separated exact origins.

## 4. Production Acceptance Check

Perform the following checks after both services are live.

| Check | Expected result |
|---|---|
| `GET https://<api>/health` | JSON response with `status: "ok"`. |
| Open `/dashboard` in a private browser window | Redirects to `/login`. |
| Open `/dashboard.html` in a private browser window | Redirects to the login page. |
| Click **Create Account** | Signup form becomes visible. |
| Open `/search#demo=1` | Browser-only demo workspace loads without API authentication. |
| Sign in with a real confirmed Supabase account | Dashboard data is scoped to that user. |
| Run an audit | The API accepts public HTTP(S) sites only; private network targets are rejected. |
| Generate outreach | Available only to an authenticated user with the API key configured. |

## Local Development

Create the schema, copy the backend environment template, install exact dependencies, then start the API.

```bash
cd backend
cp .env.example .env
# Fill SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY if outreach is enabled,
# and ALLOWED_ORIGINS for your local frontend origin.
npm ci
npm test
npm start
```

Serve `frontend/` with any static server. For local development, either edit `frontend/runtime-config.js` to `http://localhost:3001` or set a browser-local API URL using the Settings connection panel. Do not commit real credentials into `.env`, `runtime-config.js`, or any frontend file.

## Interaction Improvements Included

The frontend now provides busy labels and disabled states during lead searches and audits, clearer live-region notifications, non-blocking panel transitions, visibly active Settings navigation, keyboard focus rings, and reduced-motion support. These changes are browser-only and do not alter API authorization or data scope.

## Operational Notes

The website audit is an HTML-response audit. It is deliberately bounded and does not claim to be a browser-rendered Lighthouse, PageSpeed, or Core Web Vitals measurement. For browser-grade performance data, integrate a trusted provider behind the same user-authorization and quota controls.
