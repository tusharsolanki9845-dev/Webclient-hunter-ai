# Clean-URL and Authentication-Tab Fix

The application now recognizes protected routes in both extensionless form, such as `/dashboard`, and file form, such as `/dashboard.html`. Unauthenticated visitors are sent to the matching login route, and logout follows the same clean-URL-aware behavior.

The sign-in and create-account tab controls now target the actual `login-form` and `signup-form` elements. The account tab therefore reveals the signup panel and preserves the existing 12-character password validation.

## Verification

The patched client passed JavaScript syntax validation. Browser automation against the live preview also passed these focused checks:

| Scenario | Result |
|---|---:|
| Opening clean `/dashboard` without a session redirects to sign in | Passed |
| Opening `/dashboard.html` without a session redirects to sign in | Passed |
| Selecting **Create Account** reveals the signup form | Passed |
| Submitting a password shorter than 12 characters shows the validation message | Passed |

The updated source is included in the accompanying release archive. Other known preview issues, including the query-dropping demo link and unwired Settings-panel navigation, were intentionally not changed in this targeted repair.
