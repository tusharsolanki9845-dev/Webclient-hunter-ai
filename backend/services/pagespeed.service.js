'use strict';

const { validatePublicWebsiteUrl } = require('../utils/urlSafety');

const PAGESPEED_ENDPOINT = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed';
const CACHE_TTL_MS = 10 * 60 * 1000;
const cache = new Map();

class PageSpeedError extends Error {
  constructor(message, statusCode = 503) {
    super(message);
    this.name = 'PageSpeedError';
    this.statusCode = statusCode;
  }
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

function score(value) {
  return Number.isFinite(value) ? Math.max(0, Math.min(100, Math.round(value * 100))) : null;
}

function displayAudit(audits, id) {
  return typeof audits?.[id]?.displayValue === 'string' ? audits[id].displayValue : null;
}

function normalisePageSpeedPayload(payload, requestedUrl) {
  const result = payload?.lighthouseResult;
  const categories = result?.categories;
  if (!categories || !result?.finalUrl) throw new PageSpeedError('PageSpeed did not return a Lighthouse report for this website.', 502);

  return {
    source: 'Google PageSpeed Insights',
    sourceUrl: `https://pagespeed.web.dev/analysis?url=${encodeURIComponent(result.finalUrl)}`,
    url: result.finalUrl,
    requestedUrl,
    strategy: result?.configSettings?.formFactor || 'mobile',
    categories: {
      performance: score(categories.performance?.score),
      accessibility: score(categories.accessibility?.score),
      seo: score(categories.seo?.score),
    },
    metrics: {
      firstContentfulPaint: displayAudit(result.audits, 'first-contentful-paint'),
      largestContentfulPaint: displayAudit(result.audits, 'largest-contentful-paint'),
      totalBlockingTime: displayAudit(result.audits, 'total-blocking-time'),
      cumulativeLayoutShift: displayAudit(result.audits, 'cumulative-layout-shift'),
    },
    analyzedAt: new Date().toISOString(),
    limitation: 'This is a point-in-time Lighthouse lab report for the selected URL. Scores are diagnostic signals, not a measure of a business or a guarantee of user experience.',
  };
}

async function fetchPageSpeedReport(urlInput, options = {}) {
  const target = await validatePublicWebsiteUrl(urlInput);
  const key = target.toString();
  const cached = cacheGet(key);
  if (cached) return { ...cached, cached: true };

  const endpoint = new URL(PAGESPEED_ENDPOINT);
  endpoint.searchParams.set('url', key);
  endpoint.searchParams.set('strategy', 'mobile');
  ['performance', 'accessibility', 'seo'].forEach(category => endpoint.searchParams.append('category', category));

  let response;
  try {
    response = await (options.fetchImpl || fetch)(endpoint, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(30000) });
  } catch {
    throw new PageSpeedError('Google PageSpeed Insights is temporarily unavailable. Please try again later.');
  }
  if (response.status === 429) throw new PageSpeedError('Google PageSpeed Insights is busy. Please wait before running another report.', 429);
  if (!response.ok) throw new PageSpeedError('Google PageSpeed Insights could not analyze this website. Try the public homepage URL.', 502);

  let payload;
  try { payload = await response.json(); } catch { throw new PageSpeedError('Google PageSpeed Insights returned an unreadable report.', 502); }
  return cacheSet(key, normalisePageSpeedPayload(payload, key));
}

module.exports = { PageSpeedError, normalisePageSpeedPayload, fetchPageSpeedReport };
