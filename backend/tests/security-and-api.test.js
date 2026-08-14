'use strict';

const assert = require('node:assert/strict');
const http = require('node:http');
const test = require('node:test');

const { normalizeHttpUrl, isPublicIp } = require('../utils/urlSafety');
const { fetchPage, analyzeWebsite } = require('../services/websiteAudit.service');
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

test('health stays public while protected routes fail closed and OAuth rejects invalid requests', async () => {
  const authConfigured = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY);
  const protectedStatus = authConfigured ? 401 : 503;
  const oauthStatus = authConfigured ? 404 : 503;
  const sessionStatus = authConfigured ? 400 : 503;
  await withServer(async base => {
    const health = await fetch(`${base}/health`);
    assert.equal(health.status, 200);
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
