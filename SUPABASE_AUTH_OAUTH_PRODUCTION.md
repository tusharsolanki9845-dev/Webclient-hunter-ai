# Supabase Auth and OAuth Production Setup

This guide configures **Supabase Auth** for the deployed WebClient Hunter AI application. It separates two different URL types that are often confused: the **provider callback URL**, which sends Google or GitHub back to Supabase, and the **application redirect URL**, which sends the authenticated user from Supabase back to the Vercel frontend.

> **Current application scope:** The release includes Google and GitHub entry controls, an API endpoint that starts only approved provider redirects, a dedicated `/auth/callback` route, server-side token verification, and the existing user-scoped API bearer session. Provider login becomes active after valid Google and/or GitHub client credentials are entered in the Supabase provider settings and the Render API is deployed with its required Supabase environment values.

## 1. Configure Supabase URL Settings

Open the **Webclient-hunter-ai** Supabase project, select **Authentication → URL Configuration**, and use the production frontend origin below. Replace `YOUR-VERCEL-ORIGIN` with the exact stable Vercel production origin, for example `https://webclient-hunter-ai.vercel.app`. Do not use the temporary preview URL, a Render API URL, a path with a trailing slash, or an open wildcard as the production Site URL.

| Supabase setting | Value | Purpose |
|---|---|---|
| **Site URL** | `https://YOUR-VERCEL-ORIGIN` | Default destination for email confirmation, recovery, and OAuth when code does not supply `redirectTo`. |
| **Redirect URLs** | `https://YOUR-VERCEL-ORIGIN/login` | Allows a post-confirmation or sign-in return to the login screen. |
| **Redirect URLs** | `https://YOUR-VERCEL-ORIGIN/dashboard` | Allows a post-login return to the authenticated workspace. |
| **Redirect URLs** | `https://YOUR-VERCEL-ORIGIN/auth/callback` | Reserve this exact path for the OAuth callback page that should be added with social sign-in. |
| **Redirect URLs** | `http://localhost:4173/**` | Optional development-only entry if the local static server uses port 4173. Remove unneeded localhost entries before launch. |

Supabase requires each client-supplied `redirectTo` URL to match the Redirect URLs allow-list. The Site URL is the fallback when no `redirectTo` value is supplied. For production, use exact URLs; a Vercel preview wildcard should be temporary and restricted to the organization’s own preview domain, such as `https://*-YOUR-TEAM.vercel.app/**`. [1]

If email templates are customized and the application begins supplying `redirectTo`, change confirmation and recovery templates to use `{{ .RedirectTo }}` rather than `{{ .SiteURL }}`. This preserves the intended post-email destination. [1]

## 2. Configure Email and Password Authentication

Open **Authentication → Providers → Email** and enable Email. Keep **Confirm email** enabled for public production registration unless an explicitly managed, invitation-only workflow is desired. The released UI already enforces a 12-character client-side password minimum; align Supabase’s password policy to at least the same standard.

Configure production SMTP in **Authentication → SMTP Settings** before public launch. The default service is suitable for limited testing but is not a production email-delivery strategy. Use a verified sending domain, provide real Terms and Privacy Policy pages, and test confirmation and password-recovery emails in a private browser session.

## 3. Record the Provider Callback URL

Both Google and GitHub need the Supabase Auth callback, not the Vercel application callback. For this project, the provider callback URL is:

```text
https://hyfkiejoacyythtsemgt.supabase.co/auth/v1/callback
```

This callback is entered into the external provider’s dashboard. Supabase then redirects the browser to the approved Vercel application URL. The provider callback can be copied directly from **Authentication → Providers** in the Supabase dashboard. [2] [3]

## 4. Enable Google OAuth

Google is usually the highest-value first social provider for a B2B lead-management product.

1. In [Google Cloud Console](https://console.cloud.google.com/), create or choose a project, then configure the Google Auth Platform **Branding**, **Audience**, and **Data Access** settings.
2. On Data Access, ensure `openid`, email, and profile scopes are enabled. Do not request additional sensitive scopes unless the product actually needs them.
3. Create an OAuth client with application type **Web application**.
4. Under **Authorized JavaScript origins**, enter the production frontend origin only, for example `https://webclient-hunter-ai.vercel.app`. Add a custom domain too if it is the public entry point.
5. Under **Authorized redirect URIs**, enter exactly:

   ```text
   https://hyfkiejoacyythtsemgt.supabase.co/auth/v1/callback
   ```

6. Copy the Google Client ID and Client Secret.
7. Return to **Supabase → Authentication → Providers → Google**, enable Google, paste the Client ID and Client Secret, and save.
8. Test in an incognito browser after the application OAuth button and callback path are implemented.

Google recommends configuring consent-screen branding and, where appropriate, a custom domain so users see a recognizable identity during sign-in. [2]

## 5. Enable GitHub OAuth

GitHub is useful if the product targets independent developers, technical agencies, or software consultancies.

1. Go to [GitHub Developer Settings](https://github.com/settings/developers) and create an **OAuth App**.
2. Set **Application name** to `WebClient Hunter AI`.
3. Set **Homepage URL** to the final Vercel frontend origin.
4. Set **Authorization callback URL** to:

   ```text
   https://hyfkiejoacyythtsemgt.supabase.co/auth/v1/callback
   ```

5. Leave Device Flow disabled unless the product will support a device-login flow.
6. Generate and securely store the GitHub Client Secret.
7. In **Supabase → Authentication → Providers → GitHub**, enable GitHub and enter the GitHub Client ID and Client Secret.
8. Save and test only after provider sign-in is added to the frontend.

GitHub’s OAuth app callback must be the Supabase callback URL; the Vercel URL belongs in Supabase’s Site URL and redirect allow-list. [3]

## 6. Completed Application Integration

The release implements the provider integration without exposing privileged credentials.

| Release component | Implemented behavior |
|---|---|
| Provider controls | `frontend/login.html` presents **Google** and **GitHub** sign-in controls alongside email/password access. |
| OAuth start endpoint | `GET /api/auth/oauth/:provider` accepts only `google` and `github`, enforces the exact `/auth/callback` path, and restricts callback origins to `ALLOWED_ORIGINS`. |
| Callback page | `frontend/auth/callback.html` accepts the Supabase callback fragment, treats errors safely, clears the URL fragment after verification, and routes valid sessions to `/dashboard`. |
| Server verification | `POST /api/auth/session` validates the returned access token through the server-side Supabase client before creating the browser’s API bearer session. |
| Route hosting | `frontend/vercel.json` maps the clean production URL `/auth/callback` to the callback page. |
| Regression coverage | Backend and browser tests verify unavailable-provider and missing-token flows fail closed without creating a session. |

Do not place Google or GitHub client secrets in Render code, Vercel environment variables, static JavaScript, or this repository. They belong only in the Supabase provider configuration. Do not place `SUPABASE_SERVICE_ROLE_KEY` anywhere except the Render API’s encrypted environment.

## 7. Production Test Matrix

After implementation, test each enabled provider in a private browser window.

| Test | Expected result |
|---|---|
| Google sign-in | Google redirects to Supabase, Supabase returns to `/auth/callback`, and the user lands on `/dashboard`. |
| GitHub sign-in | GitHub redirects to Supabase, Supabase returns to `/auth/callback`, and the user lands on `/dashboard`. |
| Rejected consent | Callback displays an understandable error and never creates a fake session. |
| Unknown redirect | Supabase rejects any redirect not in the explicit allow-list. |
| Second account | Data remains isolated by the authenticated Supabase user ID. |
| Email confirmation | The confirmation link returns to the approved Vercel origin and permits subsequent login. |

## References

[1]: https://supabase.com/docs/guides/auth/redirect-urls "Supabase Auth Redirect URLs"
[2]: https://supabase.com/docs/guides/auth/social-login/auth-google "Supabase Auth: Google Login"
[3]: https://supabase.com/docs/guides/auth/social-login/auth-github "Supabase Auth: GitHub Login"
