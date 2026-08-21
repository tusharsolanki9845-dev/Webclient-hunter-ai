'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const http = require('node:http');
const path = require('node:path');
const test = require('node:test');

const { normalizeHttpUrl, isPublicIp } = require('../utils/urlSafety');
const { fetchPage, analyzeWebsite } = require('../services/websiteAudit.service');
const { normalisePageSpeedPayload } = require('../services/pagespeed.service');
const { DISCOVERY_CATEGORIES, NOMINATIM_MIN_INTERVAL_MS, boundedBox, overpassQuery, normalizeElement, extractPublicBusinessEmails } = require('../controllers/discovery.controller');
const { app } = require('../server');

async function withServer(run) {
  const server = http.createServer(app);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  try {
    await run(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
}

test('normalizes only HTTP(S) website URLs', () => {
  assert.equal(normalizeHttpUrl('example.com').href, 'https://example.com/');
  assert.equal(normalizeHttpUrl('http://example.com/path').protocol, 'http:');
  assert.throws(() => normalizeHttpUrl('ftp://example.com'));
  assert.throws(() => normalizeHttpUrl('https://user:password@example.com'));
});

test('blocks loopback, private, reserved, and mapped IPv6 addresses', () => {
  ['127.0.0.1', '10.0.0.1', '172.16.0.1', '192.168.0.1', '169.254.1.1', '0.0.0.0', '::1', '::ffff:127.0.0.1', '::ffff:7f00:1', '::7f00:1', 'fc00::1'].forEach(address => {
    assert.equal(isPublicIp(address), false, `${address} must be rejected`);
  });
  assert.equal(isPublicIp('8.8.8.8'), true);
});

test('audit fetch rejects an internal URL before any connection', async () => {
  await assert.rejects(() => fetchPage('http://127.0.0.1:9999'), /Private, loopback, and reserved/);
});

test('audit analysis accepts description attributes in either order and external stylesheets', () => {
  const html = `<!doctype html><html><head>
    <title>A sufficiently descriptive business title</title>
    <meta content="A sufficiently descriptive page summary for customers and search engines." name="description">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta property="og:title" content="Business">
    <link rel="stylesheet" href="/assets/site.css">
    <script type="application/ld+json">{}</script>
  </head><body><h1>Business</h1><img src="hero.jpg" alt="Business hero"></body></html>`;
  const result = analyzeWebsite(html, 120, {
    'content-encoding': 'br',
    'cache-control': 'public, max-age=60',
    'strict-transport-security': 'max-age=100',
    'x-content-type-options': 'nosniff',
  }, 'https://example.com/');
  assert.equal(result.scores.seo, 100);
  assert.equal(result.scores.mobile, 100);
  assert.equal(result.scores.security, 100);
});

test('free discovery uses bounded category queries and returns only safe public website candidates', () => {
  const category = DISCOVERY_CATEGORIES.restaurant;
  const query = overpassQuery(category, { south: 28.3, west: 77.3, north: 28.4, east: 77.4 });
  assert.match(query, /amenity"="restaurant/);
  assert.match(query, /\["website"\]/);
  assert.match(query, /out center 25/);
  assert.equal(normalizeElement({ type: 'node', id: 1, lat: 28.3, lon: 77.3, tags: { name: 'Cafe Example', website: 'example.com' } }, category, 'Test area').url, 'https://example.com/');
  assert.equal(normalizeElement({ type: 'node', id: 2, tags: { name: 'Unsafe Example', website: 'ftp://example.com' } }, category, 'Test area'), null);
  const box = boundedBox({ lat: '28.5', lon: '77.4', boundingbox: ['27.0', '30.0', '76.0', '79.0'] });
  assert.ok(box.north - box.south <= 0.18);
  assert.ok(box.east - box.west <= 0.22);
  assert.ok(NOMINATIM_MIN_INTERVAL_MS >= 1000);
});

test('PageSpeed output stays source-labelled and separates Lighthouse evidence from a business verdict', () => {
  const report = normalisePageSpeedPayload({ lighthouseResult: {
    finalUrl: 'https://example.com/',
    configSettings: { formFactor: 'mobile' },
    categories: { performance: { score: 0.91 }, accessibility: { score: 0.78 }, seo: { score: 0.63 } },
    audits: { 'first-contentful-paint': { displayValue: '1.2 s' }, 'largest-contentful-paint': { displayValue: '2.5 s' }, 'total-blocking-time': { displayValue: '120 ms' }, 'cumulative-layout-shift': { displayValue: '0.04' } },
  } }, 'https://example.com/');
  assert.deepEqual(report.categories, { performance: 91, accessibility: 78, seo: 63 });
  assert.equal(report.source, 'Google PageSpeed Insights');
  assert.match(report.limitation, /point-in-time Lighthouse lab report/);
  assert.match(report.sourceUrl, /pagespeed\.web\.dev/);
});

test('evidence-first report screen has no fabricated default audit, quota, or business-impact claim', async () => {
  const [reportMarkup, dashboardMarkup, runtime] = await Promise.all([
    fs.readFile(path.resolve(__dirname, '../../frontend/reports.html'), 'utf8'),
    fs.readFile(path.resolve(__dirname, '../../frontend/dashboard.html'), 'utf8'),
    fs.readFile(path.resolve(__dirname, '../../frontend/js/main.js'), 'utf8'),
  ]);
  assert.match(reportMarkup, /id="run-pagespeed-btn"/);
  assert.match(reportMarkup, /id="pagespeed-panel"/);
  assert.match(runtime, /API\.post\('\/audit\/pagespeed'/);
  assert.match(runtime, /Heuristic website checks/);
  assert.match(runtime, /text\(\$\('audit-date'\), 'No report yet'\)/);
  assert.doesNotMatch(reportMarkup, /Example Restaurant|87 \/ 200 audits used|AI Audit Report|losing ~53%|8\.4s load time/);
  assert.match(dashboardMarkup, /id="demo-disclosure"/);
  assert.match(dashboardMarkup, /Demo workspace:/);
  assert.doesNotMatch(dashboardMarkup, /87 \/ 200 audits used|Alex Johnson|↑ 12 this week|↑ 18% this month/);
});

test('public contact enrichment keeps generic business inboxes and excludes person-named emails', () => {
  const emails = extractPublicBusinessEmails('<a href="mailto:Info@Example.com">Contact</a> jane.doe@example.com sales@example.com billing@example.com hello@example.com');
  assert.deepEqual(emails, ['info@example.com', 'sales@example.com', 'hello@example.com']);
});

test('health stays public while protected routes fail closed and OAuth rejects invalid requests', async () => {
  const authConfigured = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY);
  const protectedStatus = authConfigured ? 401 : 503;
  const oauthStatus = authConfigured ? 404 : 503;
  const sessionStatus = authConfigured ? 400 : 503;
  await withServer(async base => {
    const health = await fetch(`${base}/health`);
    assert.equal(health.status, 200);
    const healthPayload = await health.json();
    assert.equal(healthPayload.status, 'ok');
    assert.equal(Object.prototype.hasOwnProperty.call(healthPayload, 'environment'), false);
    const leads = await fetch(`${base}/api/leads`);
    assert.equal(leads.status, protectedStatus);
    const audit = await fetch(`${base}/api/audit`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: 'https://example.com' }) });
    assert.equal(audit.status, protectedStatus);
    const outreach = await fetch(`${base}/api/outreach/generate`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
    assert.equal(outreach.status, protectedStatus);
    const oauth = await fetch(`${base}/api/auth/oauth/unsupported?redirectTo=https://app.example.com/auth/callback`);
    assert.equal(oauth.status, oauthStatus);
    const oauthSession = await fetch(`${base}/api/auth/session`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ accessToken: 'invalid' }) });
    assert.equal(oauthSession.status, sessionStatus);
  });
});
