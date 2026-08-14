'use strict';

const { auditWebsite } = require('../services/websiteAudit.service');

async function verifyLeadOwnership(client, leadId, userId) {
  if (!leadId) return null;
  const { data, error } = await client
    .from('leads')
    .select('id')
    .eq('id', leadId)
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) {
    const notFound = new Error('Lead not found.');
    notFound.statusCode = 404;
    throw notFound;
  }
  return data.id;
}

async function runAudit(req, res) {
  const { url, leadId } = req.body;
  const ownedLeadId = await verifyLeadOwnership(req.supabase, leadId, req.user.id);
  const report = await auditWebsite(url);

  const { error } = await req.supabase.from('audits').insert({
    user_id: req.user.id,
    lead_id: ownedLeadId,
    url: report.url,
    seo_score: report.scores.seo,
    speed_score: report.scores.speed,
    mobile_score: report.scores.mobile,
    security_score: report.scores.security,
    overall_score: report.scores.overall,
    issues: report.issues,
    load_time_ms: report.responseTimeMs || null,
  });
  if (error) throw error;

  return res.json({ data: report });
}

module.exports = { runAudit };
