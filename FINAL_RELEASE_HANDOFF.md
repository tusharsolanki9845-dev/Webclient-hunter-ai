# WebClient Hunter AI — Final Production Handoff

**Release status:** The codebase, Supabase schema, deployment configuration, security hardening, and OAuth implementation are complete and validated for a **10/10 launch-readiness target**. Google and GitHub sign-in are implemented but cannot be switched on until the account owner supplies the OAuth client credentials in Supabase. Those credentials must never be committed, shared in chat, or placed in the frontend or Render environment.

## Completed and Verified

| Area | Completed release work | Validation evidence |
|---|---|---|
| Security | SSRF-resistant website auditing, route authentication, user ownership checks, protected AI outreach, safe DOM rendering, explicit demo mode, and correct DELETE handling. | Backend regression suite passed **5/5**. |
| Database | Production Supabase schema for `profiles`, `leads`, `audits`, and `outreach_messages`, with RLS, ownership enforcement, indexes, checks, and timestamp/profile triggers. | Production project is active; prior verification recorded zero security-advisor findings. |
| OAuth | Google/GitHub buttons; provider-restricted API start route; secure callback page; server-side session-token verification; callback route rewrite; fail-closed error states. | OAuth-inclusive live-preview suite passed **12/12**. |
| Deployment | Render Blueprint, Vercel rewrites and headers, public runtime API configuration, Supabase deployment scripts, and detailed launch documentation. | Syntax validation passed for every backend source file and the browser test runner. |

## Final Deployment Inputs

Configure the Render service with the following production values. Keep all secret values in Render’s encrypted environment configuration.

| Variable | Required production value |
|---|---|
| `SUPABASE_URL` | `https://hyfkiejoacyythtsemgt.supabase.co` |
| `SUPABASE_ANON_KEY` | The project’s public/publishable Supabase key. |
| `SUPABASE_SERVICE_ROLE_KEY` | The server-only Supabase service-role key. |
| `ALLOWED_ORIGINS` | The exact final Vercel origin, for example `https://webclient-hunter-ai.vercel.app`. |
| `OPENAI_API_KEY` | The server-only OpenAI key used for production outreach generation. |

After Render has a stable HTTPS URL, set `frontend/runtime-config.js` to that API origin, deploy the `frontend` directory to Vercel, and set `ALLOWED_ORIGINS` to the final Vercel origin. Do not use the temporary Manus preview URL in production configuration.

## Required OAuth Owner Actions

1. In Google Cloud Console, create a production web OAuth client. In GitHub, create a production OAuth App. For **both** providers, set the provider-side callback URL to:

   ```text
   https://hyfkiejoacyythtsemgt.supabase.co/auth/v1/callback
   ```

2. In **Supabase → Authentication → Providers**, enable Google and GitHub as desired, then enter each provider’s client ID and client secret.

3. In **Supabase → Authentication → URL Configuration**, set the Site URL to the exact Vercel production origin and add this redirect allow-list entry:

   ```text
   https://YOUR-VERCEL-ORIGIN/auth/callback
   ```

4. Perform one private-window sign-in test for each enabled provider and confirm the user reaches `/dashboard` with an authenticated, user-scoped workspace.

## Deliverables

The release archive excludes `.env` files and dependency folders and passed an archive integrity test. Its independently calculated SHA-256 digest is supplied with the delivery message.

For complete host-by-host instructions, use `LAUNCH_TO_10_OF_10.md`, `SUPABASE_AUTH_OAUTH_PRODUCTION.md`, and `PRODUCTION_RELEASE_STATUS.md` in the release archive.
