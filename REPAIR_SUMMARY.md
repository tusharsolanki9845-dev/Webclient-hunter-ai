# Repair Summary — WebClient Hunter AI 2.1.0

## Completed Repairs

| Area | Repair completed |
|---|---|
| Authentication | All persisted lead, audit, outreach, and profile operations now require a verified Supabase bearer token. Missing Supabase configuration returns `503`; missing credentials with a configured service return `401`, rather than dereferencing an absent user. |
| Audit SSRF | The audit accepts only HTTP(S) URLs, rejects credentials and private/reserved/loopback IPv4 and IPv6 ranges, resolves DNS before connection, connects to the validated address, revalidates redirects, limits redirects, limits HTML size, and rejects non-HTML or error responses. |
| AI cost control | Outreach generation is authenticated, ownership-checked, separately rate-limited, payload-bounded, and uses structured user reference data rather than treating audit text as instructions. |
| Data correctness | Successful empty API arrays now render empty states. The application no longer substitutes fabricated leads for real empty results or backend failures. |
| CRM behavior | User-scoped list/search/read/create/update/delete paths are functional. Valid `204 No Content` deletes are handled correctly by the browser client. |
| XSS reduction | Dynamic lead, audit, notification, and CRM values are built with DOM nodes and `textContent`, replacing unescaped template interpolation and inline JavaScript emitted from data. |
| Profile flow | Account creation writes `full_name` metadata. Authenticated profile updates persist name, company, and website to Supabase user metadata. |
| Secrets | The Settings screen no longer asks users to paste OpenAI or Supabase credentials into browser storage. It configures only the backend address. |
| Demo | Demo mode is explicit (`?demo=1`) and self-contained in the browser. It does not silently appear in production accounts or require a backend configuration. |
| Deployment | The Render manifest uses deterministic `npm ci`, enables proxy trust only in the hosting environment, disables server demo mode by default, and defines narrower auth/audit/outreach rate limits. |

## Verification Completed

| Check | Result |
|---|---|
| Clean backend install | Passed using `npm ci --ignore-scripts`. |
| JavaScript parsing | Passed for backend and frontend. |
| Regression suite | Passed: 5 tests. |
| Dependency audit | Passed: no reported production dependency vulnerabilities. |
| Production API smoke test | `GET /health` returned `200`; unauthenticated `GET /api/leads` and `POST /api/audit` returned `401` with Supabase configuration present; an unapproved CORS origin did not receive an allow-origin header. |

## Required Production Setup

Before deployment, populate the backend environment with real `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`, and an exact `ALLOWED_ORIGINS` value. Run `supabase/schema.sql` in the target Supabase project. Do not expose the service-role or OpenAI key to the frontend.

## Intentional Boundary

The website audit is a bounded **HTML response audit**, not a browser-rendered performance test. It does not execute page JavaScript or claim to measure Lighthouse/Core Web Vitals. A separate controlled performance-provider integration is required for that level of analysis.
