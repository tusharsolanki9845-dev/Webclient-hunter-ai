'use strict';

const https = require('https');
const http = require('http');
const { URL } = require('url');
const { normalizeHttpUrl, validatePublicWebsiteUrl, resolvePublicAddress } = require('../utils/urlSafety');

const MAX_RESPONSE_BYTES = 500 * 1024;
const MAX_REDIRECTS = 3;
const REQUEST_TIMEOUT_MS = 8000;

class WebsiteAuditError extends Error {
  constructor(message, statusCode = 422) {
    super(message);
    this.name = 'WebsiteAuditError';
    this.statusCode = statusCode;
  }
}

function responseIsHtml(headers) {
  const contentType = String(headers['content-type'] || '').toLowerCase();
  return contentType.includes('text/html') || contentType.includes('application/xhtml+xml');
}

async function fetchPage(urlInput, options = {}) {
  const timeoutMs = options.timeoutMs || REQUEST_TIMEOUT_MS;
  const maxBytes = options.maxBytes || MAX_RESPONSE_BYTES;
  const maxRedirects = options.maxRedirects ?? MAX_REDIRECTS;
  const url = await validatePublicWebsiteUrl(urlInput);
  return fetchValidatedUrl(url, { timeoutMs, maxBytes, redirectsRemaining: maxRedirects });
}

async function fetchValidatedUrl(url, { timeoutMs, maxBytes, redirectsRemaining }) {
  const { address, family } = await resolvePublicAddress(url.hostname);
  const transport = url.protocol === 'https:' ? https : http;
  const start = Date.now();

  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (fn, value) => {
      if (settled) return;
      settled = true;
      fn(value);
    };

    const requestOptions = {
      protocol: url.protocol,
      hostname: address,
      family,
      port: url.port || undefined,
      path: `${url.pathname}${url.search}`,
      method: 'GET',
      servername: url.protocol === 'https:' ? url.hostname : undefined,
      headers: {
        Host: url.host,
        'User-Agent': 'WebClientHunterAudit/2.1',
        Accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.1',
        'Accept-Encoding': 'identity',
      },
    };

    const req = transport.request(requestOptions, res => {
      const statusCode = res.statusCode || 0;
      const location = res.headers.location;

      if ([301, 302, 303, 307, 308].includes(statusCode) && location) {
        res.resume();
        if (redirectsRemaining <= 0) {
          return finish(reject, new WebsiteAuditError('Too many redirects while loading this website.'));
        }
        let nextUrl;
        try {
          nextUrl = new URL(location, url);
          normalizeHttpUrl(nextUrl.toString());
        } catch {
          return finish(reject, new WebsiteAuditError('The website returned an invalid redirect.'));
        }
        fetchValidatedUrl(nextUrl, { timeoutMs, maxBytes, redirectsRemaining: redirectsRemaining - 1 })
          .then(result => finish(resolve, result))
          .catch(error => finish(reject, error));
        return;
      }

      if (statusCode < 200 || statusCode >= 400) {
        res.resume();
        return finish(reject, new WebsiteAuditError(`The website returned HTTP ${statusCode}.`));
      }
      if (!responseIsHtml(res.headers)) {
        res.resume();
        return finish(reject, new WebsiteAuditError('The URL did not return an HTML page.'));
      }

      let bytes = 0;
      const chunks = [];
      res.on('data', chunk => {
        bytes += Buffer.byteLength(chunk);
        if (bytes > maxBytes) {
          req.destroy(new WebsiteAuditError('The website response is too large to audit.'));
          return;
        }
        chunks.push(chunk);
      });
      res.on('error', error => finish(reject, error));
      res.on('end', () => {
        const html = Buffer.concat(chunks).toString('utf8');
        finish(resolve, {
          html,
          responseTimeMs: Date.now() - start,
          statusCode,
          headers: res.headers,
          url: url.toString(),
        });
      });
    });

    req.on('error', error => finish(reject, error));
    req.setTimeout(timeoutMs, () => req.destroy(new WebsiteAuditError('The website request timed out.')));
    req.end();
  });
}

function hasMeta(html, name, minContentLength = 0) {
  const tags = html.match(/<meta\b[^>]*>/gi) || [];
  return tags.some(tag => {
    const nameMatch = tag.match(/\b(?:name|property)\s*=\s*["']?([^\s"'>]+)/i);
    const contentMatch = tag.match(/\bcontent\s*=\s*["']([^"']*)["']/i);
    return nameMatch?.[1]?.toLowerCase() === name.toLowerCase() && (contentMatch?.[1]?.trim().length || 0) >= minContentLength;
  });
}

function clamp(value) {
  return Math.max(0, Math.min(100, value));
}

function analyzeWebsite(html, responseTimeMs, headers, auditedUrl) {
  const issues = [];
  let seoScore = 100;
  let speedScore = 100;
  let mobileScore = 100;
  let securityScore = 100;
  const url = new URL(auditedUrl);

  if (url.protocol !== 'https:') {
    securityScore -= 40;
    issues.push({ severity: 'high', title: 'No SSL Certificate (HTTP)', desc: 'The site uses HTTP rather than HTTPS, so browsers may mark it as not secure.' });
  }
  if (url.protocol === 'https:' && !headers['strict-transport-security']) {
    securityScore -= 15;
    issues.push({ severity: 'medium', title: 'Missing HSTS Header', desc: 'HTTP Strict Transport Security is not set on this HTTPS response.' });
  }
  if (!headers['x-content-type-options']) {
    securityScore -= 10;
    issues.push({ severity: 'low', title: 'Missing Security Header', desc: 'The X-Content-Type-Options header was not present.' });
  }

  if (responseTimeMs > 5000) {
    speedScore -= 50;
    issues.push({ severity: 'high', title: `Slow HTML Response (${(responseTimeMs / 1000).toFixed(1)}s)`, desc: 'The HTML response took more than five seconds to download.' });
  } else if (responseTimeMs > 2500) {
    speedScore -= 25;
    issues.push({ severity: 'medium', title: `Above-Average HTML Response (${(responseTimeMs / 1000).toFixed(1)}s)`, desc: 'The HTML response took more than 2.5 seconds to download.' });
  }
  if (!/(gzip|br|deflate)/i.test(String(headers['content-encoding'] || ''))) {
    speedScore -= 15;
    issues.push({ severity: 'medium', title: 'No HTML Compression Detected', desc: 'The audited HTML response was not compressed with gzip, Brotli, or deflate.' });
  }
  if (!headers['cache-control']) {
    speedScore -= 10;
    issues.push({ severity: 'low', title: 'No Cache-Control Header', desc: 'The HTML response did not include a Cache-Control header.' });
  }

  if (!/<title\b[^>]*>\s*[^<]{10,}/i.test(html)) {
    seoScore -= 20;
    issues.push({ severity: 'high', title: 'Missing or Short Page Title', desc: 'The page title is missing or shorter than 10 characters.' });
  }
  if (!hasMeta(html, 'description', 50)) {
    seoScore -= 15;
    issues.push({ severity: 'high', title: 'Missing Meta Description', desc: 'No sufficiently descriptive meta description was found.' });
  }
  if (!/<h1\b[^>]*>/i.test(html)) {
    seoScore -= 15;
    issues.push({ severity: 'medium', title: 'No H1 Heading', desc: 'No H1 element was found in the HTML document.' });
  }
  if (!/application\/ld\+json/i.test(html)) {
    seoScore -= 10;
    issues.push({ severity: 'medium', title: 'No Structured Data Detected', desc: 'No JSON-LD structured data was found in the page HTML.' });
  }
  if (!hasMeta(html, 'og:title', 1)) {
    seoScore -= 8;
    issues.push({ severity: 'low', title: 'Missing Open Graph Tags', desc: 'No Open Graph title meta tag was found.' });
  }

  const imageTags = html.match(/<img\b[^>]*>/gi) || [];
  const imagesWithoutAlt = imageTags.filter(tag => !/\balt\s*=/i.test(tag));
  if (imagesWithoutAlt.length) {
    seoScore -= Math.min(12, imagesWithoutAlt.length * 2);
    issues.push({ severity: 'low', title: `${imagesWithoutAlt.length} Images Missing Alt Attributes`, desc: 'Images without alt attributes can reduce accessibility and image-search quality.' });
  }

  if (!hasMeta(html, 'viewport', 1)) {
    mobileScore -= 40;
    issues.push({ severity: 'high', title: 'No Viewport Meta Tag', desc: 'The page does not declare a responsive viewport.' });
  }
  const hasResponsiveCss = /@media\s*\(|\bmax-width\s*:|\bmin-width\s*:|\bviewport\b/i.test(html);
  const hasStylesheet = /<link\b[^>]*\brel\s*=\s*["']?stylesheet/i.test(html);
  if (!hasResponsiveCss && !hasStylesheet) {
    mobileScore -= 25;
    issues.push({ severity: 'medium', title: 'No Responsive CSS Detected', desc: 'No responsive styles or external stylesheet references were detected in the HTML.' });
  }

  const severityOrder = { high: 0, medium: 1, low: 2 };
  return {
    url: auditedUrl,
    scores: {
      seo: clamp(seoScore),
      speed: clamp(speedScore),
      mobile: clamp(mobileScore),
      security: clamp(securityScore),
      overall: clamp(Math.round((seoScore + speedScore + mobileScore + securityScore) / 4)),
    },
    responseTimeMs,
    issues: issues.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]),
    auditedAt: new Date().toISOString(),
  };
}

async function auditWebsite(value) {
  const normalized = normalizeHttpUrl(value).toString();
  try {
    const result = await fetchPage(normalized);
    return analyzeWebsite(result.html, result.responseTimeMs, result.headers, result.url);
  } catch (error) {
    return {
      url: normalized,
      error: error instanceof WebsiteAuditError ? error.message : 'The website could not be audited.',
      scores: { seo: 0, speed: 0, mobile: 0, security: 0, overall: 0 },
      issues: [{ severity: 'high', title: 'Website Could Not Be Audited', desc: 'The server could not safely retrieve an HTML page from this URL.' }],
      auditedAt: new Date().toISOString(),
    };
  }
}

module.exports = {
  WebsiteAuditError,
  fetchPage,
  analyzeWebsite,
  auditWebsite,
};
