const { verifyToken } = require('../services/supabase.service');

/**
 * Middleware: require a valid Supabase JWT.
 * Attaches req.user if valid; returns 401 otherwise.
 */
async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization header missing or malformed.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    req.user = await verifyToken(token);
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token. Please sign in again.' });
  }
}

/**
 * Optional auth — attaches user if token is present, but doesn't block the request.
 */
async function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      req.user = await verifyToken(authHeader.split(' ')[1]);
    } catch { /* ignore */ }
  }
  next();
}

module.exports = { requireAuth, optionalAuth };
