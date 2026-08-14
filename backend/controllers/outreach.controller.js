'use strict';

const { generateOutreachEmail } = require('../services/openai.service');

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

function extractSubject(email) {
  const match = String(email).match(/^Subject:\s*(.+)$/mi);
  return match?.[1]?.trim().slice(0, 250) || 'Website audit follow-up';
}

async function generateOutreach(req, res) {
  const { businessName, url, scores, issues = [], senderName, senderCompany, leadId } = req.body;
  const ownedLeadId = await verifyLeadOwnership(req.supabase, leadId, req.user.id);
  const email = await generateOutreachEmail({ businessName, url, scores, issues, senderName, senderCompany });

  const { data, error } = await req.supabase.from('outreach_messages').insert({
    user_id: req.user.id,
    lead_id: ownedLeadId,
    subject: extractSubject(email),
    body: email,
    status: 'draft',
  }).select().single();
  if (error) throw error;

  return res.json({ data: { email, messageId: data.id, generatedAt: new Date().toISOString() } });
}

module.exports = { generateOutreach };
