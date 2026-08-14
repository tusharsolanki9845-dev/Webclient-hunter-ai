'use strict';

const { createUserClient, verifyToken, isConfigured } = require('../services/supabase.service');

function getBearerToken(req) {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) return null;
  const token = header.slice('Bearer '.length).trim();
  return token || null;
}

async function requireAuth(req, res, next) {
  if (!isConfigured) {
    return res.status(503).json({ error: 'Authentication is unavailable because Supabase Auth is not configured.' });
  }

  const token = getBearerToken(req);
  if (!token) return res.status(401).json({ error: 'A bearer token is required.' });

  try {
    req.user = await verifyToken(token);
    req.supabase = createUserClient(token);
    return next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token. Please sign in again.' });
  }
}

function demoOnly(req, res, next) {
  if (process.env.DEMO_MODE_ENABLED !== 'true') {
    return res.status(404).json({ error: 'Demo mode is not enabled.' });
  }
  req.demoMode = true;
  return next();
}

module.exports = { requireAuth, demoOnly, getBearerToken };
