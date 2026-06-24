const OpenAI = require('openai');

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

/**
 * Generate a personalized cold outreach email based on audit findings.
 */
async function generateOutreachEmail({ businessName, url, issues, scores, senderName, senderCompany }) {
  if (!openai) {
    return generateDemoEmail({ businessName, url, issues, scores, senderName, senderCompany });
  }

  const topIssues = (issues || []).slice(0, 3).map(i => `- ${i.title}: ${i.desc}`).join('\n');

  const prompt = `You are an expert web development agency salesperson. Write a short, personalized cold outreach email to a business owner.

Business: ${businessName}
Website: ${url}
SEO Score: ${scores.seo}/100
Speed Score: ${scores.speed}/100
Mobile Score: ${scores.mobile}/100

Top Issues Found:
${topIssues}

Sender: ${senderName} from ${senderCompany || 'a web agency'}

Rules:
- Keep it under 150 words
- Lead with ONE specific problem that costs them money
- Don't be pushy or salesy
- End with a soft CTA (free audit call or report)
- Sound human, not like a template
- Subject line included at top as "Subject: ..."`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 400,
    temperature: 0.7,
  });

  return response.choices[0].message.content.trim();
}

function generateDemoEmail({ businessName, url, issues, scores, senderName, senderCompany }) {
  const worstIssue = issues?.[0]?.title || 'website performance issues';
  const name = senderName || 'Alex';
  const company = senderCompany || 'my agency';

  return `Subject: Quick question about ${url}

Hi ${businessName} team,

I was searching for ${businessName} online and ran a quick audit of your website — it flagged some concerns that might be costing you customers.

The biggest issue: ${worstIssue}. Your site is currently scoring ${scores?.speed || 28}/100 for speed, which means potential customers are likely leaving before the page even loads.

I help local businesses fix exactly these kinds of issues. I've put together a free detailed report showing what's hurting your rankings and what we can do about it.

Would you be open to a quick 15-minute call to go over the findings?

Best,
${name}
${company}`;
}

module.exports = { generateOutreachEmail };
