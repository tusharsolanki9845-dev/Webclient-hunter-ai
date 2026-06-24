/* =================================================================
   WebClient Hunter AI — main.js
   All JS for every page. No dependencies.
================================================================= */

'use strict';

/* ── THEME ─────────────────────────────────────────────────────── */
const Theme = {
  init() {
    this.apply(localStorage.getItem('wcha-theme') || 'light');
  },
  apply(t) {
    document.documentElement.setAttribute('data-theme', t);
    localStorage.setItem('wcha-theme', t);
    document.querySelectorAll('.dark-toggle').forEach(b => {
      b.textContent = t === 'dark' ? '☀️' : '🌙';
      b.setAttribute('aria-label', t === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
    });
  },
  toggle() { this.apply(localStorage.getItem('wcha-theme') === 'dark' ? 'light' : 'dark'); }
};

/* ── TOAST ──────────────────────────────────────────────────────── */
const Toast = {
  _wrap: null,
  _ensure() {
    if (!this._wrap) {
      this._wrap = document.querySelector('.toast-container');
      if (!this._wrap) {
        this._wrap = document.createElement('div');
        this._wrap.className = 'toast-container';
        document.body.appendChild(this._wrap);
      }
    }
  },
  _icons: { success:'✅', error:'❌', info:'ℹ️', warning:'⚠️' },
  show(type, title, msg = '', ms = 4000) {
    this._ensure();
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.innerHTML = `<span class="toast-icon">${this._icons[type]||'ℹ️'}</span>
      <div class="toast-body"><div class="toast-title">${title}</div>${msg?`<div class="toast-msg">${msg}</div>`:''}</div>
      <button class="toast-close" aria-label="Dismiss">✕</button>`;
    el.querySelector('.toast-close').onclick = () => this._dismiss(el);
    this._wrap.appendChild(el);
    if (ms > 0) setTimeout(() => this._dismiss(el), ms);
  },
  _dismiss(el) {
    el.style.cssText = 'opacity:0;transform:translateX(110%);transition:.25s ease';
    setTimeout(() => el.remove(), 260);
  },
  success(t, m) { this.show('success', t, m); },
  error(t, m)   { this.show('error',   t, m); },
  info(t, m)    { this.show('info',    t, m); },
  warning(t, m) { this.show('warning', t, m); }
};

/* ── LOCAL STORAGE ─────────────────────────────────────────────── */
const Store = {
  _key: 'wcha-leads',
  getAll() { try { return JSON.parse(localStorage.getItem(this._key)) || []; } catch { return []; } },
  save(arr) { localStorage.setItem(this._key, JSON.stringify(arr)); },
  add(lead) {
    const all = this.getAll();
    if (all.find(l => l.id === lead.id)) return false;
    all.unshift({ ...lead, savedAt: Date.now() });
    this.save(all); return true;
  },
  update(id, patch) {
    const all = this.getAll();
    const i = all.findIndex(l => l.id === id);
    if (i === -1) return false;
    all[i] = { ...all[i], ...patch }; this.save(all); return true;
  },
  remove(id) { this.save(this.getAll().filter(l => l.id !== id)); }
};

/* ── DEMO DATA ──────────────────────────────────────────────────── */
const LEADS = [
  { id:1,  name:"Murphy's Plumbing & Heating",  niche:"Plumbing",    location:"Chicago, IL",   url:"murphysplumbing.com",     seoScore:32, speedScore:28, mobileScore:45, status:"new",       notes:"No SSL, slow load time, missing Google Business" },
  { id:2,  name:"Bella Vista Italian Restaurant",niche:"Restaurant",  location:"Austin, TX",    url:"bellavistaaustin.com",    seoScore:41, speedScore:55, mobileScore:38, status:"contacted",  notes:"Menu not mobile-friendly, missing schema markup" },
  { id:3,  name:"Greenleaf Landscaping Co.",     niche:"Landscaping", location:"Denver, CO",    url:"greenleaflandscaping.co", seoScore:22, speedScore:35, mobileScore:30, status:"interested", notes:"No contact form, poor image optimization" },
  { id:4,  name:"Dr. Sarah Chen, DDS",           niche:"Dentistry",   location:"Seattle, WA",   url:"sarahchendds.com",        seoScore:58, speedScore:62, mobileScore:71, status:"proposal",   notes:"Decent site but no online booking or reviews" },
  { id:5,  name:"Peak Performance Gym",          niche:"Fitness",     location:"Miami, FL",     url:"peakperformancegym.io",   seoScore:18, speedScore:22, mobileScore:25, status:"new",       notes:"Terrible performance, no booking system" },
  { id:6,  name:"Harbor View Legal Group",       niche:"Law Firm",    location:"Boston, MA",    url:"harborviewlegal.com",     seoScore:45, speedScore:48, mobileScore:52, status:"won",        notes:"Outdated design, complete overhaul done" },
  { id:7,  name:"The Cozy Candle Shop",          niche:"E-commerce",  location:"Nashville, TN", url:"cozycandles.shop",        seoScore:29, speedScore:31, mobileScore:40, status:"contacted",  notes:"No product schema, slow checkout" },
  { id:8,  name:"Sunrise Chiropractic Center",   niche:"Healthcare",  location:"Phoenix, AZ",   url:"sunrisechiro.care",       seoScore:36, speedScore:44, mobileScore:55, status:"lost",       notes:"Missing local SEO, no online booking" },
  { id:9,  name:"Ace Auto Repair & Tires",       niche:"Auto Repair", location:"Dallas, TX",    url:"aceautorepair.com",       seoScore:19, speedScore:27, mobileScore:22, status:"new",       notes:"No SSL, broken links, zero local SEO" },
  { id:10, name:"Bloom & Blossom Florist",       niche:"Florist",     location:"Portland, OR",  url:"bloomflorist.com",        seoScore:44, speedScore:50, mobileScore:60, status:"interested", notes:"Nice design but poor SEO structure" },
];

const scoreClass = s => s >= 70 ? 'good' : s >= 40 ? 'avg' : 'poor';
const scoreColor = s => s >= 70 ? '#10B981' : s >= 40 ? '#F59E0B' : '#EF4444';
const statusBadge = {
  new:'badge-blue', contacted:'badge-yellow', interested:'badge-blue',
  proposal:'badge-yellow', won:'badge-green', lost:'badge-gray'
};

/* ── NAVBAR & MOBILE MENU ───────────────────────────────────────── */
function initNavbar() {
  const navbar = document.querySelector('.navbar');
  if (navbar) {
    window.addEventListener('scroll', () => navbar.classList.toggle('scrolled', scrollY > 30), { passive:true });
  }
  const ham = document.getElementById('hamburger');
  const mobileNav = document.getElementById('mobile-nav');
  if (ham && mobileNav) {
    ham.addEventListener('click', () => {
      mobileNav.classList.toggle('open');
      ham.setAttribute('aria-expanded', mobileNav.classList.contains('open'));
    });
    // close button inside mobile nav
    const closeBtn = mobileNav.querySelector('.mobile-nav-close');
    if (closeBtn) closeBtn.addEventListener('click', () => mobileNav.classList.remove('open'));
  }
}

/* ── SIDEBAR (app pages) ────────────────────────────────────────── */
function initSidebar() {
  const toggle = document.querySelector('.sidebar-toggle');
  const sidebar = document.querySelector('.sidebar');
  const overlay = document.querySelector('.sidebar-overlay');
  if (!toggle || !sidebar) return;
  const close = () => { sidebar.classList.remove('open'); overlay?.classList.remove('show'); document.body.style.overflow=''; };
  toggle.addEventListener('click', () => { sidebar.classList.add('open'); overlay?.classList.add('show'); document.body.style.overflow='hidden'; });
  overlay?.addEventListener('click', close);
}

/* ── PROGRESS BARS (animated on load) ──────────────────────────── */
function animateProgressBars() {
  document.querySelectorAll('.progress-fill[data-score]').forEach(el => {
    const score = parseInt(el.dataset.score) || 0;
    el.style.width = '0%';
    el.style.background = scoreColor(score);
    requestAnimationFrame(() => setTimeout(() => { el.style.width = score + '%'; }, 80));
  });
}

/* ── DASHBOARD PAGE ─────────────────────────────────────────────── */
function initDashboard() {
  const el = document.getElementById('stat-leads');
  if (!el) return;

  const leads = Store.getAll().length > 0 ? Store.getAll() : LEADS;
  document.getElementById('stat-leads').textContent    = leads.length;
  document.getElementById('stat-contacted').textContent = leads.filter(l => l.status === 'contacted' || l.status === 'interested').length;
  document.getElementById('stat-audits').textContent   = Math.floor(leads.length * 1.4);
  document.getElementById('stat-revenue').textContent  = '$' + (leads.filter(l=>l.status==='won').length * 2800).toLocaleString();

  const tbody = document.getElementById('recent-leads-list');
  if (!tbody) return;
  tbody.innerHTML = leads.slice(0,6).map(l => `
    <tr>
      <td><strong style="color:var(--gray-900)">${l.name}</strong></td>
      <td>${l.niche}</td>
      <td>${l.location}</td>
      <td><span class="badge ${statusBadge[l.status]||'badge-gray'}">${l.status}</span></td>
      <td style="color:var(--gray-400);font-size:.78rem">Just now</td>
    </tr>`).join('');
}

/* ── SEARCH PAGE ────────────────────────────────────────────────── */
const SearchPage = {
  filteredLeads: [...LEADS],
  init() {
    if (!document.getElementById('leads-container')) return;
    this.render(LEADS);

    const form = document.getElementById('search-form');
    form?.addEventListener('submit', e => { e.preventDefault(); this.doSearch(); });

    document.getElementById('sort-select')?.addEventListener('change', e => {
      const v = e.target.value;
      const sorted = [...this.filteredLeads].sort((a,b) =>
        v==='worst-seo' ? a.seoScore-b.seoScore :
        v==='worst-speed' ? a.speedScore-b.speedScore :
        v==='worst-mobile' ? a.mobileScore-b.mobileScore : 0);
      this.render(sorted);
    });
  },
  doSearch() {
    const niche = (document.getElementById('niche-input')?.value || '').trim().toLowerCase();
    const loc   = (document.getElementById('location-input')?.value || '').trim().toLowerCase();
    const btn   = document.getElementById('search-btn');
    if (btn) { btn.disabled=true; btn.innerHTML='<span class="spinner"></span> Searching…'; }

    setTimeout(() => {
      this.filteredLeads = LEADS.filter(l =>
        (!niche || l.niche.toLowerCase().includes(niche) || l.name.toLowerCase().includes(niche)) &&
        (!loc   || l.location.toLowerCase().includes(loc))
      );
      this.render(this.filteredLeads);
      if (btn) { btn.disabled=false; btn.textContent='🔍 Search'; }
      Toast.success(`${this.filteredLeads.length} leads found`);
    }, 700);
  },
  render(leads) {
    const c = document.getElementById('leads-container');
    const countEl = document.getElementById('results-count');
    if (!c) return;
    if (countEl) countEl.textContent = leads.length + ' results';

    if (!leads.length) {
      c.innerHTML = `<div class="empty-state" style="grid-column:1/-1">
        <div class="empty-icon">🔍</div><h3>No leads found</h3>
        <p>Try a different niche or location</p></div>`;
      return;
    }

    const saved = Store.getAll();
    c.innerHTML = leads.map(l => {
      const isSaved = saved.find(s => s.id === l.id);
      return `<div class="glass-card lead-card fade-in">
        <div class="lead-card-top">
          <div><div class="lead-name">${l.name}</div><div class="lead-meta">${l.niche} · ${l.location}</div></div>
          <span class="badge ${l.seoScore<40?'badge-red':l.seoScore<60?'badge-yellow':'badge-green'}">${Math.round((l.seoScore+l.speedScore+l.mobileScore)/3)}</span>
        </div>
        <div class="lead-url">🌐 ${l.url}</div>
        <div class="lead-scores">
          <span class="score-pill"><span class="score-dot ${scoreClass(l.seoScore)}"></span>SEO ${l.seoScore}</span>
          <span class="score-pill"><span class="score-dot ${scoreClass(l.speedScore)}"></span>Speed ${l.speedScore}</span>
          <span class="score-pill"><span class="score-dot ${scoreClass(l.mobileScore)}"></span>Mobile ${l.mobileScore}</span>
        </div>
        <div class="lead-actions">
          <button class="btn btn-primary btn-sm save-btn" data-id="${l.id}" ${isSaved?'disabled':''}>
            ${isSaved?'✓ Saved':'💾 Save Lead'}
          </button>
          <a href="reports.html?id=${l.id}" class="btn btn-secondary btn-sm">📊 Audit</a>
        </div>
      </div>`;
    }).join('');

    c.querySelectorAll('.save-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const lead = LEADS.find(l => l.id === parseInt(btn.dataset.id));
        if (lead && Store.add(lead)) {
          btn.disabled = true; btn.textContent = '✓ Saved';
          Toast.success('Lead saved!', lead.name + ' added to CRM');
        } else {
          Toast.info('Already saved', 'This lead is in your CRM');
        }
      });
    });
  }
};

/* expose for inline onclick */
window.quickSearch = function(niche, loc) {
  const n = document.getElementById('niche-input');
  const l = document.getElementById('location-input');
  if (n) n.value = niche;
  if (l) l.value = loc;
  SearchPage.doSearch();
};

/* ── REPORTS PAGE ───────────────────────────────────────────────── */
function initReports() {
  if (!document.getElementById('report-section')) return;

  // Set audit date
  const dateEl = document.getElementById('audit-date');
  if (dateEl) dateEl.textContent = new Date().toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'});

  // If a lead id is passed, override scores
  const params = new URLSearchParams(location.search);
  const id = parseInt(params.get('id'));
  if (id) {
    const lead = LEADS.find(l => l.id === id);
    if (lead) {
      document.querySelectorAll('.audit-business-name').forEach(el => el.textContent = lead.name);
      document.querySelectorAll('.audit-url').forEach(el => el.textContent = '🌐 ' + lead.url);
      const scores = { seo: lead.seoScore, speed: lead.speedScore, mobile: lead.mobileScore };
      ['seo','speed','mobile'].forEach(k => {
        const el = document.getElementById('score-' + k);
        if (el) {
          el.textContent = scores[k];
          const circle = el.closest('.score-circle');
          if (circle) { circle.className = 'score-circle ' + scoreClass(scores[k]); }
        }
      });
      // Update progress bars
      document.querySelectorAll('.progress-fill[data-score]').forEach(bar => {
        const key = bar.dataset.key;
        if (key && scores[key] !== undefined) {
          bar.dataset.score = scores[key];
          bar.closest('div').previousElementSibling?.querySelector('span:last-child')?.textContent
          bar.closest('.score-row')?.querySelector('.score-label-val')?.textContent;
        }
      });
    }
  }
  animateProgressBars();
}

window.generateOutreach = function() {
  document.getElementById('outreach-modal')?.classList.add('open');
};

window.copyOutreach = function() {
  const text = document.getElementById('outreach-text')?.textContent || '';
  navigator.clipboard.writeText(text.trim())
    .then(() => Toast.success('Copied!', 'Email copied to clipboard'))
    .catch(() => Toast.error('Copy failed', 'Please select and copy manually'));
};

window.loadDemoReport = function() {
  animateProgressBars();
  Toast.success('Demo report loaded!');
};

/* ── CRM PAGE ───────────────────────────────────────────────────── */
const CRM = {
  filter: 'all',
  editId: null,

  getLeads() {
    const stored = Store.getAll();
    return stored.length ? stored : LEADS;
  },

  init() {
    if (!document.getElementById('crm-table-body')) return;
    this.render();
    this.bindEvents();
    this.updateStats();
  },

  bindEvents() {
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.filter = btn.dataset.filter;
        this.render();
      });
    });

    document.getElementById('crm-search-input')?.addEventListener('input', e => {
      const q = e.target.value.toLowerCase();
      document.querySelectorAll('#crm-table-body tr').forEach(row => {
        row.style.display = row.textContent.toLowerCase().includes(q) ? '' : 'none';
      });
    });

    document.getElementById('modal-save-btn')?.addEventListener('click', () => this.saveEdit());
    document.getElementById('modal-cancel-btn')?.addEventListener('click', () => this.closeModal());
    document.getElementById('edit-modal')?.addEventListener('click', e => {
      if (e.target === e.currentTarget) this.closeModal();
    });
  },

  updateStats() {
    const leads = this.getLeads();
    const set = (id, v) => { const el = document.getElementById(id); if(el) el.textContent = v; };
    set('crm-stat-total', leads.length);
    set('crm-stat-contacted', leads.filter(l=>l.status==='contacted').length);
    set('crm-stat-proposal', leads.filter(l=>l.status==='proposal').length);
    set('crm-stat-won', leads.filter(l=>l.status==='won').length);
  },

  render() {
    const tbody = document.getElementById('crm-table-body');
    if (!tbody) return;
    let leads = this.getLeads();
    if (this.filter !== 'all') leads = leads.filter(l => l.status === this.filter);

    if (!leads.length) {
      tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state">
        <div class="empty-icon">📋</div><h3>No leads</h3>
        <p>No leads match this filter. <a href="search.html">Find leads →</a></p></div></td></tr>`;
      return;
    }

    tbody.innerHTML = leads.map(l => `<tr>
      <td>
        <div style="font-weight:600;color:var(--gray-900)">${l.name}</div>
        <div style="font-size:.72rem;color:var(--gray-400)">${l.url}</div>
      </td>
      <td>${l.niche}</td>
      <td>${l.location}</td>
      <td>
        <select class="form-select" style="padding:5px 8px;font-size:.78rem;width:auto"
          onchange="CRM.changeStatus(${l.id}, this.value)">
          ${['new','contacted','interested','proposal','won','lost']
            .map(s=>`<option value="${s}" ${l.status===s?'selected':''}>${s.charAt(0).toUpperCase()+s.slice(1)}</option>`).join('')}
        </select>
      </td>
      <td style="max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:.8rem"
        title="${l.notes||''}">${l.notes||'—'}</td>
      <td>
        <span class="badge ${l.seoScore<40?'badge-red':l.seoScore<60?'badge-yellow':'badge-green'}">${l.seoScore}/100</span>
      </td>
      <td>
        <div class="action-btns">
          <button class="btn btn-sm btn-secondary" onclick="CRM.openEdit(${l.id})" title="Edit">✏️</button>
          <a href="reports.html?id=${l.id}" class="btn btn-sm btn-secondary" title="Audit">📊</a>
          <button class="btn btn-sm btn-danger" onclick="CRM.deleteLead(${l.id})" title="Delete">🗑️</button>
        </div>
      </td>
    </tr>`).join('');
  },

  changeStatus(id, status) {
    if (!Store.update(id, { status })) {
      const lead = LEADS.find(l => l.id === id);
      if (lead) Store.add({ ...lead, status });
    }
    this.updateStats();
    Toast.success('Status updated', 'Changed to ' + status);
  },

  openEdit(id) {
    const all = [...Store.getAll(), ...LEADS];
    const lead = all.find(l => l.id === id);
    if (!lead) return;
    this.editId = id;
    document.getElementById('edit-name').value  = lead.name;
    document.getElementById('edit-status').value = lead.status;
    document.getElementById('edit-notes').value  = lead.notes || '';
    document.getElementById('edit-modal')?.classList.add('open');
  },

  closeModal() {
    document.getElementById('edit-modal')?.classList.remove('open');
    this.editId = null;
  },

  saveEdit() {
    if (!this.editId) return;
    const patch = {
      name:   document.getElementById('edit-name')?.value.trim(),
      status: document.getElementById('edit-status')?.value,
      notes:  document.getElementById('edit-notes')?.value.trim(),
    };
    if (!patch.name) { Toast.warning('Name required'); return; }
    if (!Store.update(this.editId, patch)) {
      const lead = LEADS.find(l => l.id === this.editId);
      if (lead) Store.add({ ...lead, ...patch });
    }
    this.closeModal(); this.render(); this.updateStats();
    Toast.success('Lead updated');
  },

  deleteLead(id) {
    if (!confirm('Delete this lead permanently?')) return;
    Store.remove(id);
    this.render(); this.updateStats();
    Toast.success('Lead deleted');
  }
};

/* ── SETTINGS PAGE ──────────────────────────────────────────────── */
function initSettings() {
  if (!document.getElementById('settings-content')) return;

  // Load saved profile
  const p = JSON.parse(localStorage.getItem('wcha-profile') || '{}');
  ['name','email','company','website'].forEach(f => {
    const el = document.getElementById('s-' + f);
    if (el && p[f]) el.value = p[f];
  });

  // Dark mode toggle sync
  const dt = document.getElementById('dark-mode-toggle');
  if (dt) { dt.checked = localStorage.getItem('wcha-theme') === 'dark';
    dt.addEventListener('change', e => Theme.apply(e.target.checked ? 'dark' : 'light')); }

  // Settings nav tabs
  document.querySelectorAll('.settings-nav-item').forEach(item => {
    item.addEventListener('click', () => {
      document.querySelectorAll('.settings-nav-item').forEach(i => i.classList.remove('active'));
      document.querySelectorAll('.settings-panel').forEach(p => p.classList.remove('active'));
      item.classList.add('active');
      document.getElementById(item.dataset.panel)?.classList.add('active');
    });
  });

  // Save profile
  document.getElementById('save-profile-btn')?.addEventListener('click', () => {
    const data = {};
    ['name','email','company','website'].forEach(f => {
      data[f] = document.getElementById('s-' + f)?.value || '';
    });
    localStorage.setItem('wcha-profile', JSON.stringify(data));
    Toast.success('Profile saved!');
  });

  // API key show/hide
  document.querySelectorAll('.api-key-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const inp = btn.closest('.api-key-field')?.querySelector('.form-input');
      if (!inp) return;
      inp.type = inp.type === 'password' ? 'text' : 'password';
      btn.textContent = inp.type === 'password' ? '👁️' : '🙈';
    });
  });

  document.getElementById('save-api-btn')?.addEventListener('click', () => Toast.success('API settings saved'));
  document.getElementById('test-api-btn')?.addEventListener('click', () => {
    Toast.info('Testing…', 'Checking connections');
    setTimeout(() => Toast.success('All APIs connected!'), 1600);
  });
}

/* ── INIT ───────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  Theme.init();
  initNavbar();
  initSidebar();

  document.querySelectorAll('.dark-toggle').forEach(b => b.addEventListener('click', () => Theme.toggle()));

  initDashboard();
  SearchPage.init();
  initReports();
  CRM.init();
  initSettings();
  animateProgressBars();
});
