# OpenStreetMap Discovery Design Constraints

## Selected product behavior

WebClient Hunter AI will offer a user-triggered **OpenStreetMap business search**. The user selects a supported category and enters a city or area. The backend geocodes that one location, queries a small bounding box for matching OpenStreetMap records that include a public `website` tag, and returns at most 25 normalized candidates. The client displays a visible OpenStreetMap attribution and allows the user to run an audit or save a selected candidate to the CRM.

## Compliance and reliability controls

| Control | Product decision |
|---|---|
| Geocoding traffic | One location request per explicit user search; never autocomplete or background/polling requests. |
| Nominatim limits | Use the backend as a proxy with a descriptive User-Agent, request timeout, per-user rate limit, and short-lived result cache. |
| Overpass workload | Only small category + city-area queries; cap output at 25 website-bearing businesses; no tiled, bulk, or periodic collection. |
| Attribution | Display `© OpenStreetMap contributors` with a link to the OpenStreetMap copyright page in the results area. |
| Source selection | Version one exposes only `OpenStreetMap — free public map data`; manual import remains available. It does not scrape Google Maps, Yelp, or another directory. |
| Abuse protection | Require signed-in user (and separate explicit demo response), strict category enum, bounded location length, response size cap, fetch timeouts, no user-controlled remote URLs, and endpoint rate limiting. |
| Data quality | Results are candidates, not guarantees. Search returns only entries with an HTTP(S) public website tag and labels source coverage as variable. |
| Contact enrichment | A user must request enrichment for one selected business. The backend retrieves only the business website’s homepage through the existing SSRF-protected fetcher. It does not crawl directories, social profiles, inboxes, or multiple pages. |
| Email handling | Display at most three publicly exposed generic business inboxes (for example `info@`, `contact@`, `hello@`, or `sales@`). Do not surface person-named addresses or other personal email addresses. When a lead is saved, an available generic inbox is stored only in that lead’s private notes. |
| Outreach | Generate a reviewable draft from a completed audit. The application never auto-sends, bulk-sends, or posts outreach. Any future send action must remain user-confirmed. |

## Public-contact and outreach use

This feature is designed for public business contact details and user-reviewed sales outreach, not bulk harvesting. Each contact lookup is initiated by the user for a business selected from the search results. The result card shows whether a generic website contact email was found, together with the website’s audit rating and issues. Users can save a qualified business to their CRM and open the existing full-audit and outreach-draft flow. The user remains responsible for verifying the contact channel and complying with applicable marketing, privacy, and anti-spam requirements before sending a message.

## Supported launch categories

- Restaurant
- Café
- Dentist
- Plumber
- Electrician
- Gym / fitness
- Beauty salon
- Hairdresser
- Lawyer / law firm
- Real-estate agency
- Car repair
- Hotel

## Verified source constraints

The public Nominatim service allows moderate, end-user-triggered website searches but requires no more than one request per second, a valid identifying User-Agent or Referer, suitable OpenStreetMap attribution, caching, and no autocomplete or systematic/bulk queries. Its policy also notes that commercial applications must accommodate a source switch if requested. [1]

The public Overpass documentation describes manually initiated, modest queries as the intended usage pattern and warns against treating public instances as a backend for a broad application. It gives an approximate safety guideline of 10,000 requests per day and 1 GB daily download volume, with load shedding possible. [2]

## References

[1]: https://operations.osmfoundation.org/policies/nominatim/ "Nominatim Usage Policy"
[2]: https://dev.overpass-api.de/overpass-doc/en/preface/commons.html "Overpass API Commons"
