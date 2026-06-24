const { generateOutreachEmail } = require('../services/openai.service');
const { supabase } = require('../services/supabase.service');

/**
 * POST /api/outreach/generate
 * Body: { businessName, url, scores, issues, senderName, senderCompany, leadId? }
 */
async function generateOutreach(req, res) {
  const { businessName, url, scores, issues, senderName, senderCompany, leadId } = req.body;

  const email = await generateOutreachEmail({ businessName, url, scores, issues, senderName, senderCompany });

  // Persist to Supabase if available
  if (supabase && req.user) {
    try {
      await supabase.from('outreach_messages').insert({
        user_id: req.user.id,
        lead_id: leadId || null,
        subject: email.split('\n')[0].replace('Subject: ', '').trim(),
        body: email,
        status: 'draft',
      });
    } catch (dbErr) {
      console.error('Failed to save outreach to DB:', dbErr.message);
    }
  }

  res.json({ data: { email, generatedAt: new Date().toISOString() } });
}

module.exports = { generateOutreach };
