# Launch Checklist: Reaching 10/10 Production Readiness

This checklist assumes the existing **Webclient-hunter-ai** Supabase project is in use. Its database is already active and migrated. The remaining work is to deploy the API, connect the static frontend to it, configure production origins, and run the real-user acceptance test.

## 1. Set Render API Environment Variables

Create a Render Blueprint deployment from the repository-root `render.yaml`. Set its root directory to the repository root; the Blueprint already declares `backend/` as the service root. Render supplies `PORT`, so do not create a `PORT` variable.

| Variable | Exact production value | Required |
|---|---|---:|
| `NODE_ENV` | `production` | Yes |
| `TRUST_PROXY` | `true` | Yes |
| `DEMO_MODE_ENABLED` | `false` | Yes |
| `SUPABASE_URL` | `https://hyfkiejoacyythtsemgt.supabase.co` | Yes |
| `SUPABASE_ANON_KEY` | The active publishable or legacy anon key from **Supabase → Project Settings → API** | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | The service-role key from **Supabase → Project Settings → API** | Yes |
| `ALLOWED_ORIGINS` | Your exact final Vercel origin, e.g. `https://webclient-hunter-ai.vercel.app` | Yes |
| `OPENAI_API_KEY` | Your server-side OpenAI key | Only for AI outreach |
| `OPENAI_OUTREACH_MODEL` | `gpt-4o-mini` | Recommended if outreach is enabled |
| `RATE_LIMIT_WINDOW_MS` | `900000` | Recommended |
| `RATE_LIMIT_MAX_REQUESTS` | `100` | Recommended |
| `AUTH_RATE_LIMIT_MAX` | `20` | Recommended |
| `AUDIT_RATE_LIMIT_MAX` | `20` | Recommended |
| `OUTREACH_RATE_LIMIT_MAX` | `10` | Recommended |

> Never put `SUPABASE_SERVICE_ROLE_KEY` or `OPENAI_API_KEY` in Vercel, `runtime-config.js`, frontend code, or source control. The service-role key stays in Render only.

Deploy the Render service. Confirm that the following URL returns `{"status":"ok"}` and reports the production environment:

```text
https://YOUR-RENDER-SERVICE.onrender.com/health
```

## 2. Deploy the Static Frontend to Vercel

Import the same repository into Vercel. Configure these project settings:

| Vercel setting | Value |
|---|---|
| Framework preset | Other / static site |
| Root Directory | `frontend` |
| Build command | Leave empty |
| Output Directory | Leave empty |
| Vercel environment variables | None required |

Before deploying, set the public API origin in `frontend/runtime-config.js`:

```js
window.WCHA_RUNTIME_CONFIG = Object.freeze({
  apiBase: 'https://YOUR-RENDER-SERVICE.onrender.com',
});
```

The value must be the HTTPS **origin only**. Do not include `/api`, a route path, a trailing slash, a database URL, or any key. Deploy the Vercel project and copy its final stable URL.

## 3. Finish Cross-Service Configuration

Once Vercel has issued the stable URL, return to Render and make `ALLOWED_ORIGINS` exactly that URL, such as:

```text
https://webclient-hunter-ai.vercel.app
```

If both a Vercel subdomain and custom domain are used, provide comma-separated exact origins:

```text
https://webclient-hunter-ai.vercel.app,https://app.example.com
```

Redeploy the Render API after changing CORS configuration.

In **Supabase → Authentication → URL Configuration**, set the Site URL to the final Vercel origin and add the final Vercel and custom-domain origins to the redirect allow-list. In **Supabase → Authentication**, select the required email-confirmation, SMTP, password-policy, and CAPTCHA settings before public launch.

## 4. Production Acceptance Test

Perform the following in an incognito/private browser after both deployments are live.

| Test | Expected result |
|---|---|
| Open `https://YOUR-APP/dashboard` | Redirects to the login page. |
| Open `https://YOUR-APP/dashboard.html` | Also redirects to login. |
| Open `https://YOUR-APP/search#demo=1` | Browser-only demo workspace loads. |
| Create a real account using a 12+ character password | Confirmation email and profile creation follow the configured Supabase Auth policy. |
| Sign in with the confirmed account | A real session is established. |
| Save a lead | The lead appears only in that account’s CRM. |
| Run an audit on a public `https://` site | Audit saves to the account; localhost and private-network URLs are rejected. |
| Generate outreach | A draft is created only if `OPENAI_API_KEY` is configured. |
| Repeat the CRM login with a second account | The first account’s leads, audits, and drafts are not visible. |
| Call `GET /health` | The Render API returns `status: "ok"` in production. |

When these checks pass, the service has the last operational proof needed for a **10/10 launch-readiness assessment**.

## 5. Recommended First-Week Operations

Review Render logs for API errors and rejected CORS requests, Supabase Auth logs for email confirmation failures, and OpenAI usage if outreach is enabled. Keep the demo flag disabled in Render and rotate the service-role and OpenAI keys if they are ever exposed.
