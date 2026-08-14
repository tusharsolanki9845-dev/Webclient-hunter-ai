'use strict';

const { randomUUID } = require('crypto');
const { normalizeHttpUrl } = require('../utils/urlSafety');

const DEMO_LEADS = [
  { id: 'a1202e9f-6a5c-4d1f-8a0e-000000000001', name: "Murphy's Plumbing & Heating", niche: 'Plumbing', location: 'Chicago, IL', url: 'https://murphysplumbing.example', seo_score: 32, speed_score: 28, mobile_score: 45, status: 'new', notes: 'No SSL, slow load time', created_at: '2026-01-10T12:00:00.000Z' },
  { id: 'a1202e9f-6a5c-4d1f-8a0e-000000000002', name: 'Bella Vista Italian Restaurant', niche: 'Restaurant', location: 'Austin, TX', url: 'https://bellavista.example', seo_score: 41, speed_score: 55, mobile_score: 38, status: 'contacted', notes: 'Menu not mobile-friendly', created_at: '2026-01-11T12:00:00.000Z' },
  { id: 'a1202e9f-6a5c-4d1f-8a0e-000000000003', name: 'Greenleaf Landscaping Co.', niche: 'Landscaping', location: 'Denver, CO', url: 'https://greenleaf.example', seo_score: 22, speed_score: 35, mobile_score: 30, status: 'interested', notes: 'No contact form', created_at: '2026-01-12T12:00:00.000Z' },
  { id: 'a1202e9f-6a5c-4d1f-8a0e-000000000004', name: 'Peak Performance Gym', niche: 'Fitness', location: 'Miami, FL', url: 'https://peakperformance.example', seo_score: 18, speed_score: 22, mobile_score: 25, status: 'new', notes: 'Slow page and no booking flow', created_at: '2026-01-13T12:00:00.000Z' },
];

let demoLeads = DEMO_LEADS.map(lead => ({ ...lead }));

function demoResponse(res, body, status = 200) {
  return res.status(status).json({ ...body, demo: true });
}

function isDemoRequest(req) {
  return req.demoMode === true;
}

function requireDatabase(req) {
  if (!req.supabase) {
    const error = new Error('Database service is not configured.');
    error.statusCode = 503;
    throw error;
  }
}

function escapeLike(value) {
  return String(value).replace(/[\\%_]/g, '\\$&');
}

function demoFilter(leads, { niche, location, keyword, minScore, maxScore }) {
  const needle = String(keyword || '').toLowerCase();
  const hasScoreFilter = minScore !== undefined || maxScore !== undefined;
  const lowerScore = Number(minScore ?? 0), upperScore = Number(maxScore ?? 100);
  return leads.filter(lead => {
    const score = Number(lead.seo_score || 0);
    return (!niche || lead.niche.toLowerCase() === String(niche).toLowerCase()) &&
      (!location || lead.location.toLowerCase().includes(String(location).toLowerCase())) &&
      (!needle || `${lead.name} ${lead.url}`.toLowerCase().includes(needle)) &&
      (!hasScoreFilter || (score >= lowerScore && score <= upperScore));
  });
}

async function searchLeads(req, res) {
  const { niche, location, keyword, minScore, maxScore, limit = 20, offset = 0 } = req.query;
  if (isDemoRequest(req)) {
    const data = demoFilter(demoLeads, { niche, location, keyword, minScore, maxScore });
    return demoResponse(res, { data: data.slice(Number(offset), Number(offset) + Number(limit)), total: data.length });
  }

  requireDatabase(req);
  let query = req.supabase
    .from('leads')
    .select('*', { count: 'exact' })
    .eq('user_id', req.user.id)
    .order('created_at', { ascending: false })
    .range(Number(offset), Number(offset) + Number(limit) - 1);
  if (minScore !== undefined) query = query.gte('seo_score', minScore);
  if (maxScore !== undefined) query = query.lte('seo_score', maxScore);

  if (niche) query = query.eq('niche', niche);
  if (location) query = query.ilike('location', `%${escapeLike(location)}%`);
  if (keyword) query = query.ilike('name', `%${escapeLike(keyword)}%`);

  const { data, error, count } = await query;
  if (error) throw error;
  return res.json({ data: data || [], total: count || 0 });
}

async function getLeads(req, res) {
  if (isDemoRequest(req)) return demoResponse(res, { data: demoLeads, total: demoLeads.length });

  requireDatabase(req);
  const { data, error, count } = await req.supabase
    .from('leads')
    .select('*', { count: 'exact' })
    .eq('user_id', req.user.id)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return res.json({ data: data || [], total: count || 0 });
}

async function getLead(req, res) {
  const { id } = req.params;
  if (isDemoRequest(req)) {
    const lead = demoLeads.find(item => item.id === id);
    return lead ? demoResponse(res, { data: lead }) : res.status(404).json({ error: 'Lead not found.' });
  }

  requireDatabase(req);
  const { data, error } = await req.supabase
    .from('leads')
    .select('*')
    .eq('id', id)
    .eq('user_id', req.user.id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return res.status(404).json({ error: 'Lead not found.' });
  return res.json({ data });
}

async function createLead(req, res) {
  const { name, url, niche, location = '', status = 'new', notes = '', seo_score, speed_score, mobile_score } = req.body;
  if (isDemoRequest(req)) {
    const lead = {
      id: randomUUID(), name, url, niche, location, status, notes, seo_score, speed_score, mobile_score,
      created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    };
    demoLeads.unshift(lead);
    return demoResponse(res, { data: lead }, 201);
  }

  requireDatabase(req);
  const { data, error } = await req.supabase
    .from('leads')
    .insert({ user_id: req.user.id, name, url, niche, location, status, notes, seo_score, speed_score, mobile_score })
    .select()
    .single();
  if (error) throw error;
  return res.status(201).json({ data });
}

function canonicalWebsiteUrl(value) {
  const parsed = normalizeHttpUrl(value);
  parsed.hash = '';
  parsed.search = '';
  if (parsed.pathname.length > 1) parsed.pathname = parsed.pathname.replace(/\/+$/, '');
  return `${parsed.protocol}//${parsed.host}${parsed.pathname === '/' ? '' : parsed.pathname}`.toLowerCase();
}

function prepareImportedLead(entry) {
  const url = normalizeHttpUrl(entry.url).toString();
  return {
    name: String(entry.name).trim(),
    url,
    niche: String(entry.niche || 'Uncategorised').trim() || 'Uncategorised',
    location: String(entry.location || '').trim(),
    notes: String(entry.notes || 'Imported from a free lead source.').trim(),
    status: 'new',
  };
}

async function importLeads(req, res) {
  const candidates = [];
  const skipped = [];
  const batchUrls = new Set();

  for (const entry of req.body.leads) {
    const lead = prepareImportedLead(entry);
    const key = canonicalWebsiteUrl(lead.url);
    if (batchUrls.has(key)) {
      skipped.push({ name: lead.name, url: lead.url, reason: 'duplicate in this import' });
      continue;
    }
    batchUrls.add(key);
    candidates.push({ ...lead, key });
  }

  if (isDemoRequest(req)) {
    const known = new Set(demoLeads.map(lead => {
      try { return canonicalWebsiteUrl(lead.url); } catch { return String(lead.url).toLowerCase(); }
    }));
    const created = [];
    for (const candidate of candidates) {
      if (known.has(candidate.key)) {
        skipped.push({ name: candidate.name, url: candidate.url, reason: 'already in CRM' });
        continue;
      }
      const lead = {
        id: randomUUID(), ...candidate,
        seo_score: null, speed_score: null, mobile_score: null,
        created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      };
      delete lead.key;
      demoLeads.unshift(lead);
      known.add(candidate.key);
      created.push(lead);
    }
    return demoResponse(res, { data: { created, skipped, createdCount: created.length, skippedCount: skipped.length } }, created.length ? 201 : 200);
  }

  requireDatabase(req);
  const { data: existing, error: existingError } = await req.supabase
    .from('leads')
    .select('id, url')
    .eq('user_id', req.user.id)
    .limit(1000);
  if (existingError) throw existingError;

  const known = new Set((existing || []).map(lead => {
    try { return canonicalWebsiteUrl(lead.url); } catch { return String(lead.url).toLowerCase(); }
  }));
  const rows = [];
  for (const candidate of candidates) {
    if (known.has(candidate.key)) {
      skipped.push({ name: candidate.name, url: candidate.url, reason: 'already in CRM' });
      continue;
    }
    rows.push({ user_id: req.user.id, ...candidate });
    known.add(candidate.key);
  }
  const insertRows = rows.map(({ key, ...row }) => row);
  if (!insertRows.length) {
    return res.json({ data: { created: [], skipped, createdCount: 0, skippedCount: skipped.length } });
  }

  const { data: created, error } = await req.supabase
    .from('leads')
    .insert(insertRows)
    .select();
  if (error) throw error;
  return res.status(201).json({ data: { created: created || [], skipped, createdCount: created?.length || 0, skippedCount: skipped.length } });
}

async function updateLead(req, res) {
  const { id } = req.params;
  const updates = {};
  ['name', 'status', 'notes', 'niche', 'location'].forEach(field => {
    if (req.body[field] !== undefined) updates[field] = req.body[field];
  });
  updates.updated_at = new Date().toISOString();

  if (isDemoRequest(req)) {
    const index = demoLeads.findIndex(item => item.id === id);
    if (index === -1) return res.status(404).json({ error: 'Lead not found.' });
    demoLeads[index] = { ...demoLeads[index], ...updates };
    return demoResponse(res, { data: demoLeads[index] });
  }

  requireDatabase(req);
  const { data, error } = await req.supabase
    .from('leads')
    .update(updates)
    .eq('id', id)
    .eq('user_id', req.user.id)
    .select()
    .maybeSingle();
  if (error) throw error;
  if (!data) return res.status(404).json({ error: 'Lead not found.' });
  return res.json({ data });
}

async function deleteLead(req, res) {
  const { id } = req.params;
  if (isDemoRequest(req)) {
    const previousLength = demoLeads.length;
    demoLeads = demoLeads.filter(item => item.id !== id);
    return previousLength === demoLeads.length
      ? res.status(404).json({ error: 'Lead not found.' })
      : res.status(204).send();
  }

  requireDatabase(req);
  const { data, error } = await req.supabase
    .from('leads')
    .delete()
    .eq('id', id)
    .eq('user_id', req.user.id)
    .select('id');
  if (error) throw error;
  if (!data?.length) return res.status(404).json({ error: 'Lead not found.' });
  return res.status(204).send();
}

module.exports = { searchLeads, getLeads, getLead, createLead, importLeads, updateLead, deleteLead };
