# Evidence-first implementation plan

## Product boundary

WebClient Hunter will offer a user-initiated, authenticated workspace for three distinct evidence sources rather than an undifferentiated “AI score.”

| Capability | Evidence shown | Guardrail |
| --- | --- | --- |
| Business discovery | OpenStreetMap object link, category, mapped location, and public website tag | A bounded category-and-area request only; no autocomplete, background scan, or contact harvesting. |
| Heuristic website check | Headers and HTML checks observed by the application server | Label as **heuristic checks**, not Lighthouse, a universal score, or a business-quality verdict. |
| PageSpeed report | Google PageSpeed Insights Lighthouse lab categories and selected displayed metrics | Explicit optional action, source URL, mobile strategy, timestamp, no API key, authenticated route, per-URL cache, and clear point-in-time limitation. |

## Release changes

1. The server will serialize Nominatim access to no more than one upstream request per second and extend the existing result cache. OpenStreetMap discovery remains authenticated, rate-limited, source-attributed, bounded to 25 mapped websites, and initiated by an explicit form submission.
2. The server will add an authenticated PageSpeed route. It accepts only the existing SSRF-safe public HTTP(S) URL shape, makes a single no-key request for Lighthouse categories, returns only source-labelled report fields, and caches reports per normalized URL. It will not call a hosted AI provider.
3. The report page will remove default placeholder scores, plan quotas, fake names, and prescriptive impact estimates. It will start empty, then render separately labelled heuristic and PageSpeed sections only after a user requests each source.
4. The prospect interface will replace “rating” vocabulary with “heuristic checks,” direct users to source links, and state that a missing generic email is not proof that a business has no contact method.

## Explicit exclusions

Wappalyzer’s Business-plan lookup API, BuiltWith per-domain lookup, the sunset Clearbit Logo API, Microlink as a quota-limited core feature, remote Hugging Face inference, scheduled rescans, automatic outreach, and generic place-search autocomplete are excluded from this free release.
