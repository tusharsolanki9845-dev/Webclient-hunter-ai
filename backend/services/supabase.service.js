'use strict';

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const isAuthConfigured = Boolean(supabaseUrl && supabaseAnonKey);

if (!isAuthConfigured) {
  console.warn('Supabase public Auth credentials are not configured. Sign-up, sign-in, and user-scoped data access are unavailable.');
}

const baseOptions = {
  auth: { autoRefreshToken: false, persistSession: false },
};

// The public key is safe for a server or browser client. Security is enforced by
// Supabase Auth and the RLS policies in the database, not by a placeholder key.
const supabaseAuth = isAuthConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, baseOptions)
  : null;

// OAuth only creates a provider URL; the client receives the implicit-flow token
// in the callback fragment and sends it to the API for validation.
const supabaseOAuth = isAuthConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
        flowType: 'implicit',
      },
    })
  : null;

function createUserClient(accessToken) {
  if (!isAuthConfigured) throw new Error('Supabase Auth is not configured');
  if (typeof accessToken !== 'string' || !accessToken.trim()) throw new Error('A Supabase access token is required');
  return createClient(supabaseUrl, supabaseAnonKey, {
    ...baseOptions,
    global: { headers: { Authorization: `Bearer ${accessToken.trim()}` } },
  });
}

async function verifyToken(token) {
  if (!supabaseAuth) throw new Error('Supabase Auth is not configured');
  const { data, error } = await supabaseAuth.auth.getUser(token);
  if (error || !data.user) throw new Error('Invalid or expired token');
  return data.user;
}

module.exports = {
  supabaseAuth,
  supabaseOAuth,
  createUserClient,
  verifyToken,
  isConfigured: isAuthConfigured,
  isAuthConfigured,
};
