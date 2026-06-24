/**
 * websiteAudit.service.js
 * Performs a website audit by fetching the URL and analyzing its content.
 * In production, pair this with a real headless browser or PageSpeed API.
 */

const https = require('https');
const http = require('http');
const { URL } = require('url');

/**
 * Fetch website HTML with a timeout.
 */
function fetchPage(urlStr, timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    let url;
    try { url = new URL(urlStr.startsWith('http') ? urlStr : `https://${urlStr}`); }
    catch { return reject(new Error('Invalid URL')); }

    const lib = url.protocol === 'https:' ? https : http;
    const start = Date.now();

    const req = lib.get(url.href, { timeout: timeoutMs, headers: { 'User-Agent': 'WebClientHunterBot/1.0' } }, (res) => {
      const loadTime = Date.now() - start;
      let html = '';
      res.setEncoding('utf8');
      res.on('data', chunk => { html += chunk; if (html.length > 500000) req.destroy(); });
      res.on('end', () => resolve({ html, loadTime, statusCode: res.statusCode, headers: res.headers }));
    });

    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Request timed out')); });
  });
}

/**
 * Analyze HTML and response data to produce audit scores + issues.
 */
function analyzeWebsite(html, loadTime, statusCode, headers, url) {
  const issues = [];
  let seoScore = 100;
  let speedScore = 100;
  let mobileScore = 100;
  let securityScore = 100;

  // --- SECURITY ---
  const isHttps = url.startsWith('https');
  if (!isHttps) {
    securityScore -= 40;
    issues.push({ severity: 'high', title: 'No SSL Certificate (HTTP)', desc: 'Site uses HTTP instead of HTTPS. Browsers show "Not Secure" warning, hurting trust and SEO.' });
  }
  if (!headers['strict-transport-security']) {
    securityScore -= 15;
    issues.push({ severity: 'medium', title: 'Missing HSTS Header', desc: 'HTTP Strict Transport Security header not set. Leaves users vulnerable to downgrade attacks.' });
  }
  if (!headers['x-content-type-options']) {
    securityScore -= 10;
    issues.push({ severity: 'low', title: 'Missing Security Headers', desc: 'X-Content-Type-Options and other security headers are absent.' });
  }

  // --- SPEED ---
  if (loadTime > 5000) {
    speedScore -= 50;
    issues.push({ severity: 'high', title: `Slow Load Time (${(loadTime/1000).toFixed(1)}s)`, desc: `Page took ${(loadTime/1000).toFixed(1)} seconds to respond. Google recommends under 2.5s for Core Web Vitals.` });
  } else if (loadTime > 2500) {
    speedScore -= 25;
    issues.push({ severity: 'medium', title: `Above-Average Load Time (${(loadTime/1000).toFixed(1)}s)`, desc: 'Page load is slower than Google recommends. Optimizing images and enabling caching could help.' });
  }

  const hasGzip = (headers['content-encoding'] || '').includes('gzip') || (headers['content-encoding'] || '').includes('br');
  if (!hasGzip) {
    speedScore -= 15;
    issues.push({ severity: 'medium', title: 'No Compression (gzip/brotli)', desc: 'Server does not compress responses. Enabling gzip/brotli can reduce transfer size by 60-80%.' });
  }

  const hasCacheControl = !!headers['cache-control'];
  if (!hasCacheControl) {
    speedScore -= 10;
    issues.push({ severity: 'low', title: 'No Cache-Control Header', desc: 'Assets are not cached. Returning visitors must re-download everything on each visit.' });
  }

  // --- SEO ---
  const hasTitle = /<title[^>]*>[^<]{10,}/i.test(html);
  if (!hasTitle) {
    seoScore -= 20;
    issues.push({ severity: 'high', title: 'Missing or Short Page Title', desc: 'Title tag is missing or too short. This is one of the most important on-page SEO elements.' });
  }

  const hasDescription = /meta[^>]+name=["']description["'][^>]+content=["'][^"']{50,}/i.test(html);
  if (!hasDescription) {
    seoScore -= 15;
    issues.push({ severity: 'high', title: 'Missing Meta Description', desc: 'No meta description found. Search engines use this for snippets, affecting click-through rates.' });
  }

  const hasH1 = /<h1[\s>]/i.test(html);
  if (!hasH1) {
    seoScore -= 15;
    issues.push({ severity: 'medium', title: 'No H1 Heading', desc: 'Page has no H1 tag. Every page should have exactly one H1 describing its main topic.' });
  }

  const hasSchema = /application\/ld\+json/i.test(html);
  if (!hasSchema) {
    seoScore -= 10;
    issues.push({ severity: 'medium', title: 'No Structured Data (Schema.org)', desc: 'No JSON-LD schema markup found. Adding LocalBusiness schema improves local search visibility.' });
  }

  const hasOpenGraph = /og:title/i.test(html);
  if (!hasOpenGraph) {
    seoScore -= 8;
    issues.push({ severity: 'low', title: 'Missing Open Graph Tags', desc: 'No Open Graph meta tags. Links shared on social media will display poorly.' });
  }

  const imgTags = (html.match(/<img[^>]+>/gi) || []);
  const imgsWithoutAlt = imgTags.filter(t => !/alt=["'][^"']{3}/i.test(t));
  if (imgsWithoutAlt.length > 0) {
    seoScore -= Math.min(12, imgsWithoutAlt.length * 2);
    issues.push({ severity: 'low', title: `${imgsWithoutAlt.length} Images Missing Alt Text`, desc: 'Images without alt text hurt SEO and accessibility (WCAG compliance).' });
  }

  // --- MOBILE ---
  const hasViewport = /name=["']viewport["']/i.test(html);
  if (!hasViewport) {
    mobileScore -= 40;
    issues.push({ severity: 'high', title: 'No Viewport Meta Tag', desc: 'Missing viewport tag means the site is not optimized for mobile. 60%+ of traffic is mobile.' });
  }

  const hasMobileCSS = /max-width|@media|responsive/i.test(html);
  if (!hasMobileCSS) {
    mobileScore -= 25;
    issues.push({ severity: 'high', title: 'No Responsive CSS Detected', desc: 'No media queries or responsive framework found. Site likely breaks on smaller screens.' });
  }

  // Clamp scores
  const clamp = (n) => Math.max(0, Math.min(100, n));
  return {
    url,
    scores: {
      seo: clamp(seoScore),
      speed: clamp(speedScore),
      mobile: clamp(mobileScore),
      security: clamp(securityScore),
      overall: clamp(Math.round((seoScore + speedScore + mobileScore + securityScore) / 4)),
    },
    loadTime,
    issues: issues.sort((a, b) => {
      const order = { high: 0, medium: 1, low: 2 };
      return order[a.severity] - order[b.severity];
    }),
    auditedAt: new Date().toISOString(),
  };
}

/**
 * Main audit function. Returns full report object.
 */
async function auditWebsite(url) {
  const normalizedUrl = url.startsWith('http') ? url : `https://${url}`;

  try {
    const { html, loadTime, statusCode, headers } = await fetchPage(normalizedUrl);
    return analyzeWebsite(html, loadTime, statusCode, headers, normalizedUrl);
  } catch (err) {
    // Return a partial result with the error noted
    return {
      url: normalizedUrl,
      error: err.message,
      scores: { seo: 0, speed: 0, mobile: 0, security: 0, overall: 0 },
      issues: [{ severity: 'high', title: 'Site Unreachable', desc: `Could not connect to ${normalizedUrl}: ${err.message}` }],
      auditedAt: new Date().toISOString(),
    };
  }
}

module.exports = { auditWebsite };
