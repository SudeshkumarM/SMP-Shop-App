const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL?.trim();
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY?.trim();

const missingVariables = [];
if (!supabaseUrl) missingVariables.push('SUPABASE_URL');
if (!supabaseSecretKey) missingVariables.push('SUPABASE_SECRET_KEY');

if (missingVariables.length > 0) {
  throw new Error(
    `[Supabase] Missing required environment variable(s): ${missingVariables.join(', ')}.`
  );
}

let parsedUrl;
try {
  parsedUrl = new URL(supabaseUrl);
} catch {
  throw new Error('[Supabase] SUPABASE_URL must be a valid absolute HTTP(S) URL.');
}

if (!['http:', 'https:'].includes(parsedUrl.protocol) || !parsedUrl.hostname) {
  throw new Error('[Supabase] SUPABASE_URL must be a valid absolute HTTP(S) URL.');
}

const isNewSecretKey = /^sb_secret_[A-Za-z0-9_-]+$/.test(supabaseSecretKey);
const isLegacyServiceRoleKey =
  /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(supabaseSecretKey);

if (
  supabaseSecretKey.startsWith('sb_publishable_') ||
  supabaseSecretKey.startsWith('YOUR_') ||
  (!isNewSecretKey && !isLegacyServiceRoleKey)
) {
  throw new Error(
    '[Supabase] SUPABASE_SECRET_KEY must contain a Supabase secret or legacy service-role key.'
  );
}

module.exports = createClient(supabaseUrl, supabaseSecretKey, {
  auth: {
    autoRefreshToken: false,
    detectSessionInUrl: false,
    persistSession: false
  }
});
