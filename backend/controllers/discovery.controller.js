'use strict';

const { normalizeHttpUrl } = require('../utils/urlSafety');
const { fetchPage, analyzeWebsite, WebsiteAuditError } = require('../services/websiteAudit.service');
const { DISCOVERY_CATEGORIES } = require('../utils/discoveryCategories');

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';
const ATTRIBUTION = '© OpenStreetMap contributors';
const ATTRIBUTION_URL = 'https://www.openstreetmap.org/copyright';
const CACHE_TTL_MS = 5 * 60 * 1000;
const MAX_RESULTS = 25;
const MAX_HALF_LATITUDE = 0.09;
const MAX_HALF_LONGITUDE = 0.11;
const MAX_PUBLIC_EMAILS = 3;
const NOMINATIM_MIN_INTERVAL_MS = 1100;
const GENERIC_EMAIL_PREFIXES = new Set(['admin', 'booking', 'bookings', 'business', 'careers', 'contact', 'enquiries', 'enquiry', 'hello', 'info', 'marketing', 'office', 'reservations', 'sales', 'service', 'support', 'team']);
const cache = new Map();
let nextNominatimRequestAt = 0;

const DEMO_DISCOVERY = Object.freeze([
  { id: 'osm-demo-restaurant-1', name: 'Willow & Stone Kitchen', url: 'https://willowandstone.example', niche: 'Restaurant', location: 'Selected area', source: 'OpenStreetMap demo data' },
  { id: 'osm-demo-dentist-1', name: 'Brightside Dental Studio', url: 'https://brightsidedental.example', niche: 'Dentist', location: 'Selected area', source: 'OpenStreetMap demo data' },
  { id: 'osm-demo-plumber-1', name: 'Northline Plumbing Co.', url: 'https://northlineplumbing.example', niche: 'Plumber', location: 'Selected area', source: 'OpenStreetMap demo data' },
]);

function appUserAgent() {
  const appUrl = process.env.PUBLIC_APP_URL || 'https://webclient-hunter-ai.vercel.app';
  return `WebClientHunterAI/2.1 (${appUrl})`;
}

function upstreamError(message, statusCode = 503) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 20000) {
  let response;
  try {
    response = await fetch(url, { ...options, signal: AbortSignal.timeout(timeoutMs) });
  } catch {
    throw upstreamError('The free map data source is temporarily unavailable. Please try again in a minute.');
  }
  if (!response.ok) throw upstreamError('The free map data source is busy. Please try again in a minute.');
  return response;
}

function cacheGet(key) {
  const entry = cache.get(key);
  if (!entry || entry.expiresAt < Date.now()) { cache.delete(key); return null; }
  return entry.value;
}

function cacheSet(key, value) {
  cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
  if (cache.size > 100) cache.delete(cache.keys().next().value);
  return value;
}

async function waitForNominatimSlot() {
  const now = Date.now();
  const scheduledAt = Math.max(now, nextNominatimRequestAt);
  nextNominatimRequestAt = scheduledAt + NOMINATIM_MIN_INTERVAL_MS;
  const waitMs = scheduledAt - now;
  if (waitMs > 0) await new Promise(resolve => setTimeout(resolve, waitMs));
}

function boundedBox(result) {
  const latitude = Number(result.lat), longitude = Number(result.lon);
  const sourceBox = Array.isArray(result.boundingbox) ? result.boundingbox.map(Number) : [];
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || sourceBox.length !== 4) {
    throw upstreamError('The selected location could not be mapped. Try a more specific city or area.', 422);
  }
  const [south, north, west, east] = sourceBox;
  const minLat = Math.max(-90, Math.max(south, latitude - MAX_HALF_LATITUDE));
  const maxLat = Math.min(90, Math.min(north, latitude + MAX_HALF_LATITUDE));
  const minLon = Math.max(-180, Math.max(west, longitude - MAX_HALF_LONGITUDE));
  const maxLon = Math.min(180, Math.min(east, longitude + MAX_HALF_LONGITUDE));
  if (![minLat, minLon, maxLat, maxLon].every(Number.isFinite) || minLat >= maxLat || minLon >= maxLon) {
    throw upstreamError('The selected location search area is invalid. Try a different city or area.', 422);
  }
  return { latitude, longitude, south: minLat, west: minLon, north: maxLat, east: maxLon };
}

function overpassQuery(category, box) {
  const clauses = category.tags.map(([key, value]) => `nwr["${key}"="${value}"]["website"](${box.south.toFixed(6)},${box.west.toFixed(6)},${box.north.toFixed(6)},${box.east.toFixed(6)});`);
  return `[out:json][timeout:15];\n(\n  ${clauses.join('\n  ')}\n);\nout center ${MAX_RESULTS};`;
}

function canonicalUrl(value) {
  const url = normalizeHttpUrl(value);
  url.hash = '';
  url.search = '';
  if (url.pathname.length > 1) url.pathname = url.pathname.replace(/\/+$/, '');
  return url.toString();
}

function locationLabel(tags, fallback) {
  const pieces = [tags['addr:street'], tags['addr:suburb'], tags['addr:city'], tags['addr:district'], tags['addr:state'], tags['addr:country']]
    .filter(Boolean)
    .map(value => String(value).trim());
  return [...new Set(pieces)].join(', ') || fallback;
}

function normalizeElement(element, category, fallbackLocation) {
  const tags = element && typeof element.tags === 'object' ? element.tags : {};
  const name = typeof tags.name === 'string' ? tags.name.trim() : '';
  const website = typeof tags.website === 'string' ? tags.website.trim() : '';
  if (!name || name.length > 200 || !website || website.length > 500) return null;
  let url;
  try { url = canonicalUrl(website); } catch { return null; }
  const latitude = Number(element.lat ?? element.center?.lat);
  const longitude = Number(element.lon ?? element.center?.lon);
  return {
    id: `osm-${element.type}-${element.id}`,
    name,
    url,
    niche: category.label,
    location: locationLabel(tags, fallbackLocation),
    source: 'OpenStreetMap',
    sourceUrl: `https://www.openstreetmap.org/${encodeURIComponent(element.type)}/${encodeURIComponent(element.id)}`,
    latitude: Number.isFinite(latitude) ? latitude : null,
    longitude: Number.isFinite(longitude) ? longitude : null,
  };
}

function extractPublicBusinessEmails(html) {
  const text = String(html || '').replace(/&#64;|&#x40;|&commat;/gi, '@').replace(/&#46;|&#x2e;/gi, '.');
  const matches = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,63}/gi) || [];
  const seen = new Set(); const emails = [];
  for (const match of matches) {
    const email = match.toLowerCase().replace(/^mailto:/, '').trim();
    const [local, domain] = email.split('@'); const prefix = String(local || '').split(/[._+-]/)[0];
    if (!GENERIC_EMAIL_PREFIXES.has(prefix) || !domain || domain.length > 253 || seen.has(email)) continue;
    seen.add(email); emails.push(email);
    if (emails.length === MAX_PUBLIC_EMAILS) break;
  }
  return emails;
}

function failedAudit(url, error) {
  return {
    url,
    error: error instanceof WebsiteAuditError ? error.message : 'The website could not be audited.',
    scores: { seo: 0, speed: 0, mobile: 0, security: 0, overall: 0 },
    issues: [{ severity: 'high', title: 'Website Could Not Be Audited', desc: 'The server could not safely retrieve an HTML page from this URL.' }],
    auditedAt: new Date().toISOString(),
  };
}

async function enrichWebsite(url) {
  const normalized = normalizeHttpUrl(url).toString();
  try {
    const page = await fetchPage(normalized);
    const report = analyzeWebsite(page.html, page.responseTimeMs, page.headers, page.url);
    return { report, emails: extractPublicBusinessEmails(page.html) };
  } catch (error) {
    return { report: failedAudit(normalized, error), emails: [] };
  }
}

async function geocodeLocation(location) {
  const key = `geocode:${location.toLowerCase()}`;
  const cached = cacheGet(key);
  if (cached) return cached;
  const url = new URL(NOMINATIM_URL);
  url.searchParams.set('q', location);
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('limit', '1');
  url.searchParams.set('addressdetails', '0');
  await waitForNominatimSlot();
  const response = await fetchWithTimeout(url, { headers: { 'User-Agent': appUserAgent(), 'Accept-Language': 'en' } });
  const matches = await response.json();
  if (!Array.isArray(matches) || !matches[0]) throw upstreamError('No matching city or area was found. Try a more specific location.', 404);
  const result = matches[0];
  return cacheSet(key, { name: String(result.display_name || location), box: boundedBox(result) });
}

async function liveDiscovery(categoryId, location) {
  const cacheKey = `search:${categoryId}:${location.toLowerCase()}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;
  const category = DISCOVERY_CATEGORIES[categoryId];
  const area = await geocodeLocation(location);
  const response = await fetchWithTimeout(OVERPASS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain', 'User-Agent': appUserAgent() },
    body: overpassQuery(category, area.box),
  });
  const payload = await response.json();
  const seen = new Set();
  const prospects = (Array.isArray(payload.elements) ? payload.elements : []).map(element => normalizeElement(element, category, area.name)).filter(Boolean).filter(prospect => {
    const key = prospect.url.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, MAX_RESULTS);
  return cacheSet(cacheKey, { category: { id: categoryId, label: category.label }, location: { query: location, displayName: area.name }, prospects });
}

async function enrichBusiness(req, res) {
  const { url } = req.body;
  if (req.demoMode === true) {
    return res.json({ data: { url, emails: ['hello@example.com'], report: { url, scores: { seo: 42, speed: 38, mobile: 54, security: 45, overall: 45 }, issues: [{ severity: 'high', title: 'Demo finding: slow response', desc: 'This sample result is shown only in explicit demo mode.' }], auditedAt: new Date().toISOString() }, demo: true } });
  }
  const data = await enrichWebsite(url);
  return res.json({ data });
}

async function searchBusinesses(req, res) {
  const { category, location } = req.query;
  if (req.demoMode === true) {
    const selected = DEMO_DISCOVERY.filter(prospect => prospect.niche.toLowerCase() === DISCOVERY_CATEGORIES[category].label.toLowerCase());
    const prospects = (selected.length ? selected : DEMO_DISCOVERY).map(prospect => ({ ...prospect, location }));
    return res.json({ data: { source: 'openstreetmap', demo: true, attribution: ATTRIBUTION, attributionUrl: ATTRIBUTION_URL, category: { id: category, label: DISCOVERY_CATEGORIES[category].label }, location: { query: location, displayName: location }, prospects } });
  }
  const data = await liveDiscovery(category, location);
  return res.json({ data: { source: 'openstreetmap', attribution: ATTRIBUTION, attributionUrl: ATTRIBUTION_URL, ...data } });
}

module.exports = { DISCOVERY_CATEGORIES, NOMINATIM_MIN_INTERVAL_MS, boundedBox, overpassQuery, normalizeElement, extractPublicBusinessEmails, enrichWebsite, enrichBusiness, searchBusinesses };
