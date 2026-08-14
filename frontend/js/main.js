/* WebClient Hunter AI — secure client application. */
'use strict';

const DEFAULT_API_BASE = window.WCHA_RUNTIME_CONFIG?.apiBase || '';
const SESSION_KEY = 'wcha-session';
const DEMO_KEY = 'wcha-demo-mode';
const API_URL_KEY = 'wcha-api-url';
const PROFILE_KEY = 'wcha-profile';
const $ = id => document.getElementById(id);
const text = (node, value = '') => { if (node) node.textContent = String(value); };
const busyLabels = new WeakMap();
function setBusy(button, busy, label = 'Working…') {
  if (!button) return;
  if (busy) {
    if (!busyLabels.has(button)) busyLabels.set(button, button.innerHTML);
    button.disabled = true;
    button.setAttribute('aria-busy', 'true');
    button.classList.add('is-loading');
    button.innerHTML = `<span class="spinner" aria-hidden="true"></span><span>${label}</span>`;
    return;
  }
  button.disabled = false;
  button.removeAttribute('aria-busy');
  button.classList.remove('is-loading');
  if (busyLabels.has(button)) button.innerHTML = busyLabels.get(button);
}
const scoreClass = score => Number(score) >= 70 ? 'good' : Number(score) >= 40 ? 'avg' : 'poor';
const scoreColor = score => Number(score) >= 70 ? '#10B981' : Number(score) >= 40 ? '#F59E0B' : '#EF4444';
const statusClass = { new: 'badge-blue', contacted: 'badge-yellow', interested: 'badge-blue', proposal: 'badge-yellow', won: 'badge-green', lost: 'badge-gray' };

function apiBase(value = localStorage.getItem(API_URL_KEY) || DEFAULT_API_BASE) {
  try {
    const url = new URL(value.trim());
    const local = ['localhost', '127.0.0.1'].includes(url.hostname);
    if (!['http:', 'https:'].includes(url.protocol) || (!local && url.protocol !== 'https:')) throw new Error('invalid');
    return url.origin;
  } catch { return DEFAULT_API_BASE; }
}

const Toast = {
  wrap: null,
  ensure() {
    if (this.wrap) return;
    this.wrap = document.querySelector('.toast-container') || document.body.appendChild(Object.assign(document.createElement('div'), { className: 'toast-container' }));
    this.wrap.setAttribute('aria-live', 'polite');
  },
  show(type, title, message = '') {
    this.ensure();
    const toast = document.createElement('div'); toast.className = `toast ${type}`; toast.setAttribute('role', 'alert');
    const icon = document.createElement('span'); icon.className = 'toast-icon'; icon.setAttribute('aria-hidden', 'true'); icon.textContent = ({ success: '✓', error: '×', info: 'i', warning: '!' })[type] || 'i';
    const body = document.createElement('div'); body.className = 'toast-body';
    const heading = document.createElement('div'); heading.className = 'toast-title'; heading.textContent = title; body.appendChild(heading);
    if (message) { const detail = document.createElement('div'); detail.className = 'toast-msg'; detail.textContent = message; body.appendChild(detail); }
    const close = document.createElement('button'); close.type = 'button'; close.className = 'toast-close'; close.textContent = '×'; close.setAttribute('aria-label', 'Dismiss notification'); close.onclick = () => toast.remove();
    toast.append(icon, body, close); this.wrap.appendChild(toast); window.setTimeout(() => toast.remove(), 4500);
  },
  success(title, message) { this.show('success', title, message); }, error(title, message) { this.show('error', title, message); },
  info(title, message) { this.show('info', title, message); }, warning(title, message) { this.show('warning', title, message); },
};
window.Toast = Toast;

const Theme = {
  init() { this.apply(localStorage.getItem('wcha-theme') || 'light'); },
  apply(theme) { const next = theme === 'dark' ? 'dark' : 'light'; document.documentElement.dataset.theme = next; localStorage.setItem('wcha-theme', next); },
  toggle() { this.apply(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'); },
};

const Auth = {
  session() { try { return JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null'); } catch { return null; } },
  token() { return this.session()?.token || null; }, user() { return this.session()?.user || null; }, loggedIn() { return Boolean(this.token()); },
  set(session) { sessionStorage.setItem(SESSION_KEY, JSON.stringify(session)); }, clear() { sessionStorage.removeItem(SESSION_KEY); },
  demo() { return sessionStorage.getItem(DEMO_KEY) === 'true'; }, enableDemo() { sessionStorage.setItem(DEMO_KEY, 'true'); }, clearDemo() { sessionStorage.removeItem(DEMO_KEY); },
};

const API = {
  async request(method, path, body) {
    const base = apiBase();
    if (!base) return { ok: false, status: 0, data: null, error: 'The backend is not configured. Set the public API URL in Settings or runtime-config.js.' };
    const headers = { Accept: 'application/json' };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (Auth.token()) headers.Authorization = `Bearer ${Auth.token()}`;
    try {
      const response = await fetch(`${base}/api${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
      const isJson = (response.headers.get('content-type') || '').includes('application/json');
      const payload = response.status === 204 ? null : (isJson ? await response.json() : null);
      if (response.status === 401) { Auth.clear(); Auth.clearDemo(); if (routeName() !== 'login') location.assign(loginTarget()); }
      return { ok: response.ok, status: response.status, data: payload, error: payload?.error || (response.ok ? '' : `Request failed (${response.status})`) };
    } catch { return { ok: false, status: 0, data: null, error: 'The backend could not be reached.' }; }
  },
  get(path) { return this.request('GET', path); }, post(path, data) { return this.request('POST', path, data); },
  patch(path, data) { return this.request('PATCH', path, data); }, delete(path) { return this.request('DELETE', path); },
};

const DEMO_LEADS = [
  { id: 'a1202e9f-6a5c-4d1f-8a0e-000000000001', name: "Murphy's Plumbing & Heating", niche: 'Plumbing', location: 'Chicago, IL', url: 'https://murphysplumbing.example', seo_score: 32, speed_score: 28, mobile_score: 45, status: 'new', notes: 'No SSL, slow load time' },
  { id: 'a1202e9f-6a5c-4d1f-8a0e-000000000002', name: 'Bella Vista Italian Restaurant', niche: 'Restaurant', location: 'Austin, TX', url: 'https://bellavista.example', seo_score: 41, speed_score: 55, mobile_score: 38, status: 'contacted', notes: 'Menu not mobile-friendly' },
  { id: 'a1202e9f-6a5c-4d1f-8a0e-000000000003', name: 'Greenleaf Landscaping Co.', niche: 'Landscaping', location: 'Denver, CO', url: 'https://greenleaf.example', seo_score: 22, speed_score: 35, mobile_score: 30, status: 'interested', notes: 'No contact form' },
];
const normaliseLead = lead => ({ ...lead, seoScore: Number(lead.seo_score ?? lead.seoScore ?? 0), speedScore: Number(lead.speed_score ?? lead.speedScore ?? 0), mobileScore: Number(lead.mobile_score ?? lead.mobileScore ?? 0), status: lead.status || 'new' });
let demoLeads = DEMO_LEADS.map(normaliseLead);

function demoApi(method, suffix = '', body) {
  const [route, query = ''] = suffix.split('?');
  if (method === 'GET' && route === '/search') {
    const params = new URLSearchParams(query); const niche = (params.get('niche') || '').toLowerCase(); const location = (params.get('location') || '').toLowerCase();
    const data = demoLeads.filter(lead => (!niche || lead.niche.toLowerCase().includes(niche)) && (!location || lead.location.toLowerCase().includes(location)));
    return { ok: true, status: 200, data: { data, total: data.length, demo: true }, error: '' };
  }
  if (method === 'GET' && (!route || route === '/')) return { ok: true, status: 200, data: { data: demoLeads, total: demoLeads.length, demo: true }, error: '' };
  const id = route.replace(/^\//, ''); const index = demoLeads.findIndex(lead => lead.id === id);
  if (method === 'GET') return index === -1 ? { ok: false, status: 404, data: null, error: 'Lead not found.' } : { ok: true, status: 200, data: { data: demoLeads[index], demo: true }, error: '' };
  if (method === 'POST' && (!route || route === '/')) { const lead = normaliseLead({ ...body, id: crypto.randomUUID(), created_at: new Date().toISOString() }); demoLeads.unshift(lead); return { ok: true, status: 201, data: { data: lead, demo: true }, error: '' }; }
  if (index === -1) return { ok: false, status: 404, data: null, error: 'Lead not found.' };
  if (method === 'PATCH') { demoLeads[index] = normaliseLead({ ...demoLeads[index], ...body }); return { ok: true, status: 200, data: { data: demoLeads[index], demo: true }, error: '' }; }
  if (method === 'DELETE') { demoLeads.splice(index, 1); return { ok: true, status: 204, data: null, error: '' }; }
  return { ok: false, status: 405, data: null, error: 'Unsupported demo operation.' };
}

async function leadApi(method, suffix = '', body) {
  if (Auth.demo()) return demoApi(method, suffix, body);
  return API.request(method, `/leads${suffix}`, body);
}
async function getLeads(suffix = '') {
  const result = await leadApi('GET', suffix);
  if (result.ok) return (result.data?.data || []).map(normaliseLead);
  throw new Error(result.error);
}

const PROTECTED_ROUTE_NAMES = new Set(['dashboard', 'search', 'reports', 'crm', 'settings']);
function routeName(pathname = location.pathname) {
  const segments = pathname.split('/').filter(Boolean);
  return (segments.at(-1) || 'index').replace(/\.html$/i, '').toLowerCase();
}
function protectedPage() { return PROTECTED_ROUTE_NAMES.has(routeName()); }
function loginTarget() { return location.pathname.toLowerCase().endsWith('.html') ? 'login.html' : '/login'; }
function ensureAccess() {
  if (!protectedPage()) return true;
  const query = new URLSearchParams(location.search);
  const hash = new URLSearchParams(location.hash.replace(/^#/, ''));
  if (query.get('demo') === '1' || hash.get('demo') === '1') Auth.enableDemo();
  if (!Auth.loggedIn() && !Auth.demo()) { location.replace(loginTarget()); return false; }
  return true;
}
function tag(name, className, content) { const node = document.createElement(name); if (className) node.className = className; if (content !== undefined) node.textContent = content; return node; }
function action(label, className, handler) { const node = tag('button', className, label); node.type = 'button'; node.addEventListener('click', handler); return node; }
function empty(title, detail) { const node = tag('div', 'empty-state'); node.append(tag('h3', '', title), tag('p', '', detail)); return node; }
function date(value) { return new Date(value || Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }

function initShell() {
  Theme.init();
  document.querySelectorAll('.dark-toggle').forEach(node => node.addEventListener('click', () => Theme.toggle()));
  const toggle = document.querySelector('.sidebar-toggle'), sidebar = document.querySelector('.sidebar'), overlay = document.querySelector('.sidebar-overlay');
  const close = () => { sidebar?.classList.remove('open'); overlay?.classList.remove('show'); document.body.style.overflow = ''; };
  toggle?.addEventListener('click', () => { sidebar?.classList.add('open'); overlay?.classList.add('show'); document.body.style.overflow = 'hidden'; }); overlay?.addEventListener('click', close);
  const hamburger = $('hamburger'), mobile = $('mobile-nav'); hamburger?.addEventListener('click', () => hamburger.setAttribute('aria-expanded', String(mobile?.classList.toggle('open'))));
  const user = Auth.user(); const name = Auth.demo() ? 'Demo workspace' : (user?.name || user?.email || 'Account');
  text(document.querySelector('.sidebar-user-name'), name); text(document.querySelector('.avatar'), name.slice(0, 2).toUpperCase());
  $('logout-btn')?.addEventListener('click', async () => { if (Auth.loggedIn()) await API.post('/auth/logout', {}); Auth.clear(); Auth.clearDemo(); location.assign(loginTarget()); });
}

function oauthCallbackUrl() { return new URL('/auth/callback', location.origin).toString(); }

async function startOAuth(provider, button) {
  const base = apiBase();
  if (!base) return Toast.error('Provider sign-in is unavailable', 'Configure the public API URL before using Google or GitHub sign-in.');
  setBusy(button, true, `Connecting to ${provider === 'google' ? 'Google' : 'GitHub'}…`);
  try {
    const url = new URL(`${base}/api/auth/oauth/${encodeURIComponent(provider)}`);
    url.searchParams.set('redirectTo', oauthCallbackUrl());
    const response = await fetch(url, { headers: { Accept: 'application/json' } });
    const payload = (response.headers.get('content-type') || '').includes('application/json') ? await response.json() : null;
    if (!response.ok || !payload?.url) return Toast.error('Provider sign-in is unavailable', payload?.error || 'Check that this provider is enabled in Supabase.');
    location.assign(payload.url);
  } catch {
    Toast.error('Provider sign-in could not start', 'Check your internet connection and public API URL.');
  } finally {
    setBusy(button, false);
  }
}

function initOAuthCallback() {
  if (routeName() !== 'callback') return;
  const title = $('oauth-callback-title'), message = $('oauth-callback-message'), actions = $('oauth-callback-actions');
  const complete = (heading, detail) => { text(title, heading); text(message, detail); actions?.removeAttribute('hidden'); };
  const params = new URLSearchParams(location.hash.replace(/^#/, ''));
  const providerError = params.get('error_description') || params.get('error');
  const accessToken = params.get('access_token');
  if (providerError) return complete('Sign-in was not completed', providerError);
  if (!accessToken) return complete('Sign-in link is invalid', 'No provider session was returned. Start sign-in again from the login page.');

  (async () => {
    const result = await API.post('/auth/session', { accessToken });
    if (!result.ok || !result.data?.token || !result.data?.user) {
      return complete('Sign-in could not be verified', result.error || 'Start sign-in again from the login page.');
    }
    Auth.clearDemo();
    Auth.set({ token: result.data.token, user: result.data.user });
    history.replaceState({}, document.title, location.pathname);
    text(title, 'Sign-in complete');
    text(message, 'Taking you to your dashboard…');
    setTimeout(() => location.replace('/dashboard'), 180);
  })().catch(() => complete('Sign-in could not be verified', 'Start sign-in again from the login page.'));
}

function initLogin() {
  const form = $('login-form'); if (!form) return;
  if (Auth.loggedIn() || Auth.demo()) return location.assign(location.pathname.toLowerCase().endsWith('.html') ? 'dashboard.html' : '/dashboard');
  document.querySelectorAll('.auth-tab').forEach(tab => tab.addEventListener('click', () => { document.querySelectorAll('.auth-tab').forEach(node => node.classList.remove('active')); document.querySelectorAll('.auth-panel').forEach(node => node.classList.remove('active')); tab.classList.add('active'); $(tab.dataset.panel)?.classList.add('active'); }));
  document.querySelectorAll('[data-oauth-provider]').forEach(button => button.addEventListener('click', () => startOAuth(button.dataset.oauthProvider, button)));
  form.addEventListener('submit', async event => {
    event.preventDefault(); const email = $('login-email')?.value.trim(), password = $('login-password')?.value || '';
    if (!email || !password) return Toast.warning('Enter your email and password.');
    const submit = form.querySelector('button[type="submit"]'); setBusy(submit, true, 'Signing in…');
    try {
      const result = await API.post('/auth/login', { email, password });
      if (!result.ok || !result.data?.token) return Toast.error('Sign-in failed', result.error);
      Auth.set({ token: result.data.token, user: result.data.user }); Toast.success('Signed in.'); setTimeout(() => location.assign('dashboard.html'), 300);
    } finally { setBusy(submit, false); }
  });
  $('signup-form')?.addEventListener('submit', async event => {
    event.preventDefault(); const name = $('signup-name')?.value.trim(), email = $('signup-email')?.value.trim(), password = $('signup-password')?.value || '';
    if (!name || !email || !password) return Toast.warning('Complete every required field.'); if (password.length < 12) return Toast.warning('Use at least 12 password characters.');
    const submit = $('signup-form')?.querySelector('button[type="submit"]'); setBusy(submit, true, 'Creating account…');
    try {
      const result = await API.post('/auth/signup', { name, email, password }); if (!result.ok) return Toast.error('Account creation failed', result.error); Toast.success('Account created', result.data?.message || 'Check your email before signing in.');
    } finally { setBusy(submit, false); }
  });
}

async function initDashboard() {
  if (!$('stat-leads')) return;
  try {
    const leads = await getLeads(); text($('stat-leads'), leads.length); text($('stat-contacted'), leads.filter(lead => ['contacted', 'interested'].includes(lead.status)).length); text($('stat-audits'), leads.length); text($('stat-revenue'), `$${(leads.filter(lead => lead.status === 'won').length * 2800).toLocaleString()}`);
    const table = $('recent-leads-list'); if (!table) return; table.replaceChildren();
    if (!leads.length) { const row = document.createElement('tr'), cell = document.createElement('td'); cell.colSpan = 5; cell.appendChild(empty('No leads yet', 'Run an audit to begin building your pipeline.')); row.appendChild(cell); return table.appendChild(row); }
    leads.slice(0, 6).forEach(lead => { const row = document.createElement('tr'); const business = document.createElement('td'); business.append(tag('strong', '', lead.name), tag('div', '', lead.url)); business.lastChild.style.cssText = 'font-size:.72rem;color:var(--gray-400)'; row.appendChild(business); [lead.niche || '—', lead.location || '—'].forEach(value => row.appendChild(tag('td', '', value))); const status = tag('td'); status.appendChild(tag('span', `badge ${statusClass[lead.status] || 'badge-gray'}`, lead.status)); row.appendChild(status); row.appendChild(tag('td', '', date(lead.created_at))); table.appendChild(row); });
  } catch (error) { Toast.error('Could not load dashboard', error.message); }
}

const SearchPage = {
  leads: [],
  async init() { if (!$('leads-container')) return; $('search-form')?.addEventListener('submit', event => { event.preventDefault(); this.search(); }); $('sort-select')?.addEventListener('change', () => this.render(this.sort(this.leads))); await this.search(); },
  sort(leads) { const order = $('sort-select')?.value; return [...leads].sort((a, b) => order === 'worst-seo' ? a.seoScore - b.seoScore : order === 'worst-speed' ? a.speedScore - b.speedScore : order === 'worst-mobile' ? a.mobileScore - b.mobileScore : 0); },
  async search() { const params = new URLSearchParams(); const niche = $('niche-input')?.value.trim(), location = $('location-input')?.value.trim(); const button = $('search-btn'); const container = $('leads-container'); if (niche) params.set('niche', niche); if (location) params.set('location', location); setBusy(button, true, 'Searching…'); container?.setAttribute('aria-busy', 'true'); try { const result = await leadApi('GET', `/search${params.size ? `?${params}` : ''}`); if (!result.ok) return Toast.error('Could not search leads', result.error); this.leads = (result.data?.data || []).map(normaliseLead); this.render(this.sort(this.leads)); } finally { setBusy(button, false); container?.removeAttribute('aria-busy'); } },
  render(leads) { const container = $('leads-container'); if (!container) return; text($('results-count'), `${leads.length} lead${leads.length === 1 ? '' : 's'}`); container.replaceChildren(); if (!leads.length) return container.appendChild(empty('No saved leads match', 'Run an audit and save a lead to build your pipeline.')); leads.forEach(lead => { const card = tag('article', 'glass-card lead-card fade-in'); const top = tag('div', 'lead-card-top'), info = tag('div'); info.append(tag('div', 'lead-name', lead.name), tag('div', 'lead-meta', `${lead.niche || 'Uncategorised'} · ${lead.location || 'No location'}`)); const overall = Math.round((lead.seoScore + lead.speedScore + lead.mobileScore) / 3); top.append(info, tag('span', `badge ${overall < 40 ? 'badge-red' : overall < 60 ? 'badge-yellow' : 'badge-green'}`, `${overall}/100`)); const scores = tag('div', 'lead-scores'); [['SEO', lead.seoScore], ['Speed', lead.speedScore], ['Mobile', lead.mobileScore]].forEach(([label, value]) => { const pill = tag('span', 'score-pill'); pill.append(tag('span', `score-dot ${scoreClass(value)}`), document.createTextNode(`${label} ${value}`)); scores.appendChild(pill); }); const audit = tag('a', 'btn btn-primary btn-sm', 'Run Audit'); audit.href = `reports.html?id=${encodeURIComponent(lead.id)}`; card.append(top, tag('div', 'lead-url', `Website: ${lead.url}`), scores, audit); container.appendChild(card); }); },
};
window.quickSearch = (niche, location = '') => { if ($('niche-input')) $('niche-input').value = niche; if ($('location-input')) $('location-input').value = location; SearchPage.search(); };

let report = null, selectedLead = null;
function scores(seo, speed, mobile) { [['score-seo', seo], ['score-speed', speed], ['score-mobile', mobile]].forEach(([id, value]) => { const node = $(id); if (!node) return; node.textContent = value; const circle = node.closest('.score-circle'); if (circle) circle.className = `score-circle ${scoreClass(value)}`; }); document.querySelectorAll('.progress-fill[data-key]').forEach(node => { const value = { seo, speed, mobile }[node.dataset.key]; if (value !== undefined) { node.dataset.score = value; node.style.width = `${value}%`; node.style.background = scoreColor(value); } }); }
function renderIssues(issues) { const list = $('dynamic-issues'); if (!list) return; list.replaceChildren(); if (!issues.length) return list.appendChild(empty('No issues detected', 'The audit returned no findings.')); issues.forEach(issue => { const item = tag('div', 'issue-item'), content = tag('div'); content.append(tag('div', 'issue-title', issue.title), tag('div', 'issue-desc', issue.desc), tag('span', `badge ${issue.severity === 'high' ? 'badge-red' : issue.severity === 'medium' ? 'badge-yellow' : 'badge-gray'}`, issue.severity)); item.append(tag('div', 'issue-icon', issue.severity === 'high' ? '!' : 'i'), content); list.appendChild(item); }); }
function demoReport(url) { return { url, scores: { seo: 42, speed: 38, mobile: 54, security: 45 }, issues: [{ severity: 'high', title: 'Demo finding: slow response', desc: 'This sample result is shown only in explicit demo mode.' }, { severity: 'medium', title: 'Demo finding: missing structured data', desc: 'Run a real audit for live results.' }] }; }
async function initReports() {
  if (!$('report-section')) return; text($('audit-date'), new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }));
  const id = new URLSearchParams(location.search).get('id'); if (id) { const result = await leadApi('GET', `/${encodeURIComponent(id)}`); if (result.ok && result.data?.data) { selectedLead = normaliseLead(result.data.data); $('audit-url-input').value = selectedLead.url; document.querySelectorAll('.audit-business-name').forEach(node => text(node, selectedLead.name)); document.querySelectorAll('.audit-url').forEach(node => text(node, selectedLead.url)); scores(selectedLead.seoScore, selectedLead.speedScore, selectedLead.mobileScore); } }
  $('audit-form')?.addEventListener('submit', async event => { event.preventDefault(); const url = $('audit-url-input')?.value.trim(); if (!url) return Toast.warning('Enter a website URL.'); const button = $('run-audit-btn'); setBusy(button, true, 'Auditing…'); try { if (Auth.demo()) report = demoReport(url); else { const result = await API.post('/audit', { url, ...(selectedLead ? { leadId: selectedLead.id } : {}) }); if (!result.ok) return Toast.error('Audit failed', result.error); report = result.data?.data; } document.querySelectorAll('.audit-business-name').forEach(node => text(node, selectedLead?.name || report.url)); document.querySelectorAll('.audit-url').forEach(node => text(node, report.url)); scores(report.scores.seo, report.scores.speed, report.scores.mobile); renderIssues(report.issues || []); Toast.success('Audit complete.'); } finally { setBusy(button, false); } });
}
window.loadDemoReport = () => { if (!Auth.demo()) return Toast.info('Open the explicit demo to view a sample report.'); report = demoReport($('audit-url-input')?.value.trim() || 'https://example.com'); scores(report.scores.seo, report.scores.speed, report.scores.mobile); renderIssues(report.issues); Toast.success('Demo report loaded.'); };
window.generateOutreach = async () => { const modal = $('outreach-modal'), output = $('outreach-text'); if (!report) return Toast.warning('Run an audit first.'); if (!modal || !output) return; modal.classList.add('open'); output.textContent = 'Generating outreach…'; if (Auth.demo()) { output.textContent = `Subject: A quick website observation\n\nHi ${selectedLead?.name || 'there'},\n\nI reviewed ${report.url} and noticed ${report.issues[0]?.title?.toLowerCase() || 'an issue worth improving'}. I can share a concise breakdown and practical next steps.\n\nWould a 15-minute call be useful?\n\nBest,\nYour Agency`; return; } const user = Auth.user(); const result = await API.post('/outreach/generate', { businessName: selectedLead?.name || new URL(report.url).hostname, url: report.url, senderName: user?.name || user?.email || 'Your Name', senderCompany: user?.company || '', scores: { seo: report.scores.seo, speed: report.scores.speed, mobile: report.scores.mobile }, issues: report.issues || [], ...(selectedLead ? { leadId: selectedLead.id } : {}) }); if (!result.ok) { output.textContent = ''; return Toast.error('Could not generate outreach', result.error); } output.textContent = result.data?.data?.email || ''; };
window.copyOutreach = () => { const value = $('outreach-text')?.textContent.trim(); if (!value) return Toast.warning('There is no email to copy.'); navigator.clipboard.writeText(value).then(() => Toast.success('Email copied.')).catch(() => Toast.error('Copy failed', 'Select the text and copy it manually.')); };

const CRM = {
  filter: 'all', editId: null,
  async init() { if (!$('crm-table-body')) return; $('modal-save-btn')?.addEventListener('click', () => this.save()); $('modal-cancel-btn')?.addEventListener('click', () => this.close()); $('modal-cancel-btn2')?.addEventListener('click', () => this.close()); $('crm-search-input')?.addEventListener('input', event => document.querySelectorAll('#crm-table-body tr').forEach(row => { row.hidden = !row.textContent.toLowerCase().includes(event.target.value.toLowerCase()); })); document.querySelectorAll('.filter-btn').forEach(node => node.addEventListener('click', async () => { this.filter = node.dataset.filter || 'all'; document.querySelectorAll('.filter-btn').forEach(item => item.classList.remove('active')); node.classList.add('active'); await this.render(); })); await this.render(); await this.updateStats(); },
  async list() { return getLeads(); },
  async updateStats() { try { const leads = await this.list(); text($('crm-stat-total'), leads.length); text($('crm-stat-contacted'), leads.filter(lead => lead.status === 'contacted').length); text($('crm-stat-proposal'), leads.filter(lead => lead.status === 'proposal').length); text($('crm-stat-won'), leads.filter(lead => lead.status === 'won').length); } catch {} },
  async render() { const body = $('crm-table-body'); if (!body) return; body.replaceChildren(); try { let leads = await this.list(); if (this.filter !== 'all') leads = leads.filter(lead => lead.status === this.filter); if (!leads.length) { const row = document.createElement('tr'), cell = document.createElement('td'); cell.colSpan = 7; cell.appendChild(empty('No leads', 'Run an audit and save a lead to start your pipeline.')); row.appendChild(cell); return body.appendChild(row); } leads.forEach(lead => body.appendChild(this.row(lead))); } catch (error) { const row = document.createElement('tr'), cell = document.createElement('td'); cell.colSpan = 7; cell.appendChild(empty('Could not load leads', error.message)); row.appendChild(cell); body.appendChild(row); } },
  row(lead) { const row = document.createElement('tr'), business = tag('td'); business.append(tag('div', '', lead.name), tag('div', '', lead.url)); business.firstChild.style.cssText = 'font-weight:600;color:var(--gray-900)'; business.lastChild.style.cssText = 'font-size:.72rem;color:var(--gray-400)'; row.appendChild(business); row.append(tag('td', '', lead.niche || '—'), tag('td', '', lead.location || '—')); const status = document.createElement('select'); status.className = 'form-select'; ['new', 'contacted', 'interested', 'proposal', 'won', 'lost'].forEach(value => { const option = tag('option', '', value[0].toUpperCase() + value.slice(1)); option.value = value; option.selected = value === lead.status; status.appendChild(option); }); status.addEventListener('change', () => this.change(lead.id, { status: status.value })); const statusCell = tag('td'); statusCell.appendChild(status); row.appendChild(statusCell); const note = tag('td', '', lead.notes || '—'); note.title = lead.notes || ''; row.appendChild(note); const score = tag('td'); score.appendChild(tag('span', `badge ${lead.seoScore < 40 ? 'badge-red' : lead.seoScore < 60 ? 'badge-yellow' : 'badge-green'}`, `${lead.seoScore}/100`)); row.appendChild(score); const actions = tag('td'), wrap = tag('div', 'action-btns'); const edit = action('Edit', 'btn btn-sm btn-secondary', () => this.open(lead)); const audit = tag('a', 'btn btn-sm btn-secondary', 'Audit'); audit.href = `reports.html?id=${encodeURIComponent(lead.id)}`; const remove = action('Delete', 'btn btn-sm btn-danger', () => this.remove(lead.id)); wrap.append(edit, audit, remove); actions.appendChild(wrap); row.appendChild(actions); return row; },
  async change(id, patch) { const result = await leadApi('PATCH', `/${id}`, patch); if (!result.ok) return Toast.error('Could not update lead', result.error); await this.updateStats(); Toast.success('Lead updated.'); },
  open(lead) { this.editId = lead.id; $('edit-name').value = lead.name; $('edit-status').value = lead.status; $('edit-notes').value = lead.notes || ''; $('edit-modal')?.classList.add('open'); }, close() { $('edit-modal')?.classList.remove('open'); this.editId = null; },
  async save() { if (!this.editId) return; const name = $('edit-name')?.value.trim(); if (!name) return Toast.warning('A lead name is required.'); const result = await leadApi('PATCH', `/${this.editId}`, { name, status: $('edit-status')?.value, notes: $('edit-notes')?.value.trim() || '' }); if (!result.ok) return Toast.error('Could not save lead', result.error); this.close(); await this.render(); await this.updateStats(); Toast.success('Lead saved.'); },
  async remove(id) { if (!confirm('Delete this lead permanently?')) return; const result = await leadApi('DELETE', `/${id}`); if (!result.ok) return Toast.error('Could not delete lead', result.error); await this.render(); await this.updateStats(); Toast.success('Lead deleted.'); },
};
window.CRM = CRM;

function initSettings() {
  if (!$('settings-content')) return;
  const activatePanel = panelId => {
    document.querySelectorAll('.settings-nav-item').forEach(item => item.classList.toggle('active', item.dataset.panel === panelId));
    document.querySelectorAll('.settings-panel').forEach(panel => panel.classList.toggle('active', panel.id === panelId));
  };
  document.querySelectorAll('.settings-nav-item[data-panel]').forEach(item => item.addEventListener('click', () => activatePanel(item.dataset.panel)));
  let profile = {}; try { profile = JSON.parse(localStorage.getItem(PROFILE_KEY) || '{}'); } catch {}
  const user = Auth.user() || {}; ['name', 'email', 'company', 'website'].forEach(field => { if ($(`s-${field}`)) $(`s-${field}`).value = profile[field] || user[field] || ''; });
  $('save-profile-btn')?.addEventListener('click', async () => {
    const next = {}; ['name', 'email', 'company', 'website'].forEach(field => { next[field] = $(`s-${field}`)?.value.trim() || ''; });
    if (!next.name) return Toast.warning('A profile name is required.');
    if (Auth.demo()) { localStorage.setItem(PROFILE_KEY, JSON.stringify(next)); return Toast.success('Demo profile saved locally.'); }
    const result = await API.patch('/auth/profile', { name: next.name, company: next.company, website: next.website });
    if (!result.ok) return Toast.error('Could not save profile', result.error);
    const session = Auth.session(); if (session) { session.user = { ...session.user, ...result.data.data }; Auth.set(session); }
    localStorage.setItem(PROFILE_KEY, JSON.stringify(next)); Toast.success('Profile saved.');
  });
  $('save-api-btn')?.addEventListener('click', () => { const entered = $('backend-url')?.value.trim() || ''; const next = apiBase(entered); if (entered && next === DEFAULT_API_BASE && entered.replace(/\/$/, '') !== DEFAULT_API_BASE) return Toast.error('Invalid backend URL', 'Use HTTPS, or HTTP only for localhost.'); localStorage.setItem(API_URL_KEY, next); Toast.success('Backend URL saved', 'Reload to use the new backend.'); });
  $('test-api-btn')?.addEventListener('click', async () => { const base = apiBase(); if (!base) return Toast.error('Backend not configured', 'Set the HTTPS API URL before testing the connection.'); try { const response = await fetch(`${base}/health`); const data = await response.json(); if (response.ok && data.status === 'ok') Toast.success('Backend connected', `Version ${data.version}`); else Toast.error('Backend unavailable.'); } catch { Toast.error('Backend unavailable', 'Check the configured URL.'); } });
  $('clear-leads-btn')?.addEventListener('click', async () => {
    if (!confirm('Delete every lead in this workspace? This cannot be undone.')) return;
    try {
      const leads = await getLeads();
      const results = await Promise.all(leads.map(lead => leadApi('DELETE', `/${lead.id}`)));
      const failed = results.find(result => !result.ok);
      if (failed) return Toast.error('Could not clear all leads', failed.error);
      Toast.success('All leads cleared.');
    } catch (error) { Toast.error('Could not clear all leads', error.message); }
  });
  if ($('backend-url')) $('backend-url').value = apiBase(); const dark = $('dark-mode-toggle'); if (dark) { dark.checked = document.documentElement.dataset.theme === 'dark'; dark.addEventListener('change', event => Theme.apply(event.target.checked ? 'dark' : 'light')); }
}

document.addEventListener('DOMContentLoaded', () => { initShell(); initOAuthCallback(); initLogin(); if (!ensureAccess()) return; initDashboard(); SearchPage.init(); initReports(); CRM.init(); initSettings(); });
