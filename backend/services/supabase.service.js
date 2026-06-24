const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn('⚠️  Supabase credentials not set. Running in demo mode.');
}

// Service-role client for backend operations (bypasses RLS)
const supabase = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  : null;

/**
 * Verify a Supabase JWT from the Authorization header.
 * Returns the user object or throws.
 */
async function verifyToken(token) {
  if (!supabase) throw new Error('Supabase not configured');
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) throw new Error('Invalid or expired token');
  return data.user;
}

module.exports = { supabase, verifyToken };
