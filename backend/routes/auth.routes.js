'use strict';

const express = require('express');
const { validate, signupRules, loginRules, profileRules } = require('../utils/validators');
const { supabaseAuth, supabaseOAuth, createUserClient } = require('../services/supabase.service');
const { requireAuth } = require('../middleware/auth.middleware');
const { asyncHandler } = require('../middleware/error.middleware');

const router = express.Router();
const OAUTH_PROVIDERS = new Set(['google', 'github']);
const OAUTH_CALLBACK_PATH = '/auth/callback';

function requirePublicAuth(res) {
  if (!supabaseAuth) {
    res.status(503).json({ error: 'Account access is unavailable because Supabase Auth is not configured.' });
    return false;
  }
  return true;
}

function allowedOrigins() {
  return String(process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map(value => value.trim().replace(/\/$/, ''))
    .filter(Boolean);
}

function resolveOAuthRedirect(value) {
  const origins = allowedOrigins();
  if (!origins.length) throw new Error('OAuth is not available until an allowed frontend origin is configured.');

  const target = new URL(value || `${origins[0]}${OAUTH_CALLBACK_PATH}`);
  if (!['https:', 'http:'].includes(target.protocol)) throw new Error('OAuth requires an HTTP(S) callback URL.');
  if (target.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(target.hostname)) {
    throw new Error('OAuth requires an HTTPS callback URL outside local development.');
  }
  if (!origins.includes(target.origin)) throw new Error('The requested OAuth callback origin is not allowed.');
  if (target.pathname !== OAUTH_CALLBACK_PATH || target.search || target.hash) {
    throw new Error(`OAuth callbacks must use ${OAUTH_CALLBACK_PATH}.`);
  }
  return target.toString();
}

async function sessionPayload(accessToken, user) {
  const client = createUserClient(accessToken);
  const { data: profile, error: profileError } = await client
    .from('profiles')
    .select('full_name, company, website')
    .eq('id', user.id)
    .maybeSingle();
  if (profileError) throw profileError;

  return {
    token: accessToken,
    user: {
      id: user.id,
      email: user.email,
      name: profile?.full_name || user.user_metadata?.full_name || user.user_metadata?.name || user.email,
      company: profile?.company || user.user_metadata?.company || '',
      website: profile?.website || user.user_metadata?.website || '',
    },
  };
}

router.post('/signup', signupRules, validate, asyncHandler(async (req, res) => {
  if (!requirePublicAuth(res)) return;

  const { email, password, name } = req.body;
  const { data, error } = await supabaseAuth.auth.signUp({
    email,
    password,
    options: { data: { full_name: name } },
  });

  if (error || !data.user) {
    if (error?.status === 429 || error?.code === 'over_email_send_rate_limit') {
      return res.status(429).json({ error: 'Too many confirmation emails were requested. Please wait a few minutes and try again.' });
    }
    return res.status(400).json({ error: 'Unable to create the account. Check your details and try again.' });
  }
  return res.status(201).json({
    message: 'Account created. Please confirm your email before signing in.',
    userId: data.user.id,
  });
}));

router.post('/login', loginRules, validate, asyncHandler(async (req, res) => {
  if (!requirePublicAuth(res)) return;

  const { email, password } = req.body;
  const { data, error } = await supabaseAuth.auth.signInWithPassword({ email, password });
  if (error || !data.session || !data.user) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  return res.json(await sessionPayload(data.session.access_token, data.user));
}));

router.get('/oauth/:provider', asyncHandler(async (req, res) => {
  if (!requirePublicAuth(res) || !supabaseOAuth) return;
  const provider = String(req.params.provider || '').toLowerCase();
  if (!OAUTH_PROVIDERS.has(provider)) return res.status(404).json({ error: 'Unsupported OAuth provider.' });

  let redirectTo;
  try {
    redirectTo = resolveOAuthRedirect(req.query.redirectTo);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }

  const { data, error } = await supabaseOAuth.auth.signInWithOAuth({
    provider,
    options: { redirectTo },
  });
  if (error || !data?.url) return res.status(400).json({ error: 'Unable to start provider sign-in.' });
  return res.json({ url: data.url });
}));

router.post('/session', asyncHandler(async (req, res) => {
  if (!requirePublicAuth(res)) return;
  const accessToken = req.body?.accessToken;
  if (typeof accessToken !== 'string' || accessToken.length < 20 || accessToken.length > 10000) {
    return res.status(400).json({ error: 'A valid OAuth access token is required.' });
  }

  const { data, error } = await supabaseAuth.auth.getUser(accessToken);
  if (error || !data.user) return res.status(401).json({ error: 'The OAuth session is invalid or expired.' });
  return res.json(await sessionPayload(accessToken, data.user));
}));

router.patch('/profile', requireAuth, profileRules, validate, asyncHandler(async (req, res) => {
  const { name, company = '', website = '' } = req.body;
  const { data, error } = await req.supabase.auth.updateUser({
    data: { ...req.user.user_metadata, full_name: name, company, website },
  });
  if (error || !data.user) return res.status(400).json({ error: 'Unable to update the profile.' });

  const { data: profile, error: profileError } = await req.supabase
    .from('profiles')
    .update({ full_name: name, company, website })
    .eq('id', req.user.id)
    .select('id')
    .maybeSingle();
  if (profileError || !profile) return res.status(400).json({ error: 'Unable to update the profile.' });

  return res.json({ data: { id: data.user.id, email: data.user.email, name, company, website } });
}));

router.post('/logout', requireAuth, asyncHandler(async (req, res) => {
  const { error } = await req.supabase.auth.signOut();
  if (error) return res.status(400).json({ error: 'Unable to sign out.' });
  return res.status(204).send();
}));

module.exports = router;
