const { auditWebsite } = require('../services/websiteAudit.service');
const { supabase } = require('../services/supabase.service');

/**
 * POST /api/audit
 * Body: { url: string, leadId?: string }
 */
async function runAudit(req, res) {
  const { url, leadId } = req.body;

  // Run the audit
  const report = await auditWebsite(url);

  // Save to Supabase if configured and user is authenticated
  if (supabase && req.user) {
    try {
      await supabase.from('audits').insert({
        user_id: req.user.id,
        lead_id: leadId || null,
        url: report.url,
        seo_score: report.scores.seo,
        speed_score: report.scores.speed,
        mobile_score: report.scores.mobile,
        security_score: report.scores.security,
        overall_score: report.scores.overall,
        issues: report.issues,
        load_time_ms: report.loadTime,
      });
    } catch (dbErr) {
      // Log but don't fail the request — return audit result regardless
      console.error('Failed to save audit to DB:', dbErr.message);
    }
  }

  res.json({ data: report });
}

module.exports = { runAudit };
