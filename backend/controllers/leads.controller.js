const { supabase } = require('../services/supabase.service');

// Demo data for when Supabase is not configured
const DEMO_LEADS = [
  { id: '1', name: "Murphy's Plumbing & Heating", niche: 'Plumbing', location: 'Chicago, IL', url: 'murphysplumbing.com', seo_score: 32, speed_score: 28, mobile_score: 45, status: 'new', notes: 'No SSL, slow load time', created_at: new Date().toISOString() },
  { id: '2', name: 'Bella Vista Italian Restaurant', niche: 'Restaurant', location: 'Austin, TX', url: 'bellavistaaustin.com', seo_score: 41, speed_score: 55, mobile_score: 38, status: 'contacted', notes: 'Menu not mobile-friendly', created_at: new Date().toISOString() },
  { id: '3', name: 'Greenleaf Landscaping Co.', niche: 'Landscaping', location: 'Denver, CO', url: 'greenleaflandscaping.co', seo_score: 22, speed_score: 35, mobile_score: 30, status: 'interested', notes: 'No contact form', created_at: new Date().toISOString() },
  { id: '4', name: 'Peak Performance Gym', niche: 'Fitness', location: 'Miami, FL', url: 'peakperformancegym.io', seo_score: 18, speed_score: 22, mobile_score: 25, status: 'new', notes: 'Terrible performance scores', created_at: new Date().toISOString() },
];

/**
 * GET /api/leads/search?niche=&location=&keyword=&minScore=&limit=&offset=
 */
async function searchLeads(req, res) {
  const { niche, location, keyword, minScore = 0, maxScore = 100, limit = 20, offset = 0 } = req.query;

  if (!supabase) {
    // Filter demo data
    let results = DEMO_LEADS.filter(l => {
      if (niche && niche !== 'All Niches' && l.niche !== niche) return false;
      if (location && location !== 'All Locations' && l.location !== location) return false;
      if (keyword && !l.name.toLowerCase().includes(keyword.toLowerCase())) return false;
      if (l.seo_score < minScore || l.seo_score > maxScore) return false;
      return true;
    });
    return res.json({ data: results.slice(Number(offset), Number(offset) + Number(limit)), total: results.length, demo: true });
  }

  let query = supabase
    .from('leads')
    .select('*', { count: 'exact' })
    .eq('user_id', req.user.id)
    .gte('seo_score', minScore)
    .lte('seo_score', maxScore)
    .order('created_at', { ascending: false })
    .range(Number(offset), Number(offset) + Number(limit) - 1);

  if (niche) query = query.eq('niche', niche);
  if (location) query = query.ilike('location', `%${location}%`);
  if (keyword) query = query.or(`name.ilike.%${keyword}%,url.ilike.%${keyword}%`);

  const { data, error, count } = await query;
  if (error) throw error;

  res.json({ data, total: count });
}

/**
 * GET /api/leads
 */
async function getLeads(req, res) {
  if (!supabase) {
    return res.json({ data: DEMO_LEADS, total: DEMO_LEADS.length, demo: true });
  }

  const { data, error, count } = await supabase
    .from('leads')
    .select('*', { count: 'exact' })
    .eq('user_id', req.user.id)
    .order('created_at', { ascending: false });

  if (error) throw error;
  res.json({ data, total: count });
}

/**
 * POST /api/leads
 */
async function createLead(req, res) {
  const { name, url, niche, location, status = 'new', notes, seo_score, speed_score, mobile_score } = req.body;

  if (!supabase) {
    const newLead = { id: Date.now().toString(), name, url, niche, location, status, notes, seo_score, speed_score, mobile_score, created_at: new Date().toISOString(), demo: true };
    return res.status(201).json({ data: newLead });
  }

  const { data, error } = await supabase
    .from('leads')
    .insert({ user_id: req.user.id, name, url, niche, location, status, notes, seo_score, speed_score, mobile_score })
    .select()
    .single();

  if (error) throw error;
  res.status(201).json({ data });
}

/**
 * PATCH /api/leads/:id
 */
async function updateLead(req, res) {
  const { id } = req.params;
  const updates = {};
  ['name', 'status', 'notes', 'niche', 'location'].forEach(f => {
    if (req.body[f] !== undefined) updates[f] = req.body[f];
  });
  updates.updated_at = new Date().toISOString();

  if (!supabase) {
    return res.json({ data: { id, ...updates, demo: true } });
  }

  const { data, error } = await supabase
    .from('leads')
    .update(updates)
    .eq('id', id)
    .eq('user_id', req.user.id)
    .select()
    .single();

  if (error) throw error;
  if (!data) return res.status(404).json({ error: 'Lead not found' });
  res.json({ data });
}

/**
 * DELETE /api/leads/:id
 */
async function deleteLead(req, res) {
  const { id } = req.params;

  if (!supabase) {
    return res.status(204).send();
  }

  const { error } = await supabase
    .from('leads')
    .delete()
    .eq('id', id)
    .eq('user_id', req.user.id);

  if (error) throw error;
  res.status(204).send();
}

module.exports = { searchLeads, getLeads, createLead, updateLead, deleteLead };
