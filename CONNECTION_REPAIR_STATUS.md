# Connection Repair Status

## Completed Connection Work

The disconnected-preview failure was traced to two placeholders in the local API runtime: the frontend had an empty `apiBase`, and the backend was pointed at `example.supabase.co`. The preview now uses the active Supabase project at `https://hyfkiejoacyythtsemgt.supabase.co` and the public project key. The temporary development endpoint is intentionally omitted because it is session-scoped and not a release target.

The backend no longer depends on the invalid `SUPABASE_SERVICE_ROLE_KEY` placeholder. It validates each bearer token through Supabase Auth and creates a request-specific Supabase client carrying that user’s token. The database’s row-level-security policies enforce ownership of profiles, leads, audits, and outreach messages.

| Connection item | Final state |
|---|---|
| Frontend runtime API base | Connected to the current preview API endpoint. |
| API health endpoint | Responds successfully from the browser. |
| CORS | Allows only the current preview frontend origin. |
| Protected data endpoints | Require a valid bearer token and reject anonymous calls with `401`. |
| Google OAuth start | Returns a secured Supabase provider URL. |
| Static callback route | Loads and rejects missing OAuth sessions safely. |
| Backend regression suite | Passed **5/5** after the refactor. |
| Browser regression suite | Passed **12/12** after the connection repair. |

## Current Signup Condition

Supabase Email Auth is enabled and email confirmation is enabled. The provider is currently enforcing a temporary email-send quota after repeated verification attempts during testing. The application now displays the accurate message:

> Too many confirmation emails were requested. Please wait a few minutes and try again.

This is a Supabase Auth rate limit, not a frontend, backend, database, CORS, or API-connection failure. Wait for the quota window to reset, then create the account once using a real email address and complete the confirmation email.

## Permanent Deployment Values

The temporary preview API endpoint above is session-scoped. For a permanent public launch, deploy `backend/` using the updated `render.yaml`, then use the resulting HTTPS API URL in `frontend/runtime-config.js`.

| Variable | Required value |
|---|---|
| `NODE_ENV` | `production` |
| `TRUST_PROXY` | `true` on Render |
| `SUPABASE_URL` | `https://hyfkiejoacyythtsemgt.supabase.co` |
| `SUPABASE_ANON_KEY` | The active Supabase public anon/publishable key |
| `ALLOWED_ORIGINS` | The exact Vercel production origin |
| `OPENAI_API_KEY` | Required only to generate live AI outreach content |

No Supabase service-role key is required for this repaired API architecture. Never put any private key into frontend files or Vercel public environment variables.
