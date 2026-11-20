const { createClient } = require('@supabase/supabase-js');

const configuredSupabaseUrl = process.env.SUPABASE_URL?.trim();
const supabaseSecretKey = (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)?.trim();

const missingVariables = [];
if (!configuredSupabaseUrl) missingVariables.push('SUPABASE_URL');
if (!supabaseSecretKey) missingVariables.push('SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY');

if (missingVariables.length > 0) {
  throw new Error(
    `[Supabase] Missing required environment variable(s): ${missingVariables.join(', ')}.`
  );
}

let parsedUrl;
try {
  parsedUrl = new URL(configuredSupabaseUrl);
} catch {
  throw new Error('[Supabase] SUPABASE_URL must be a valid absolute HTTP(S) URL.');
}

if (!['http:', 'https:'].includes(parsedUrl.protocol) || !parsedUrl.hostname) {
  throw new Error('[Supabase] SUPABASE_URL must be a valid absolute HTTP(S) URL.');
}

const configuredPath = parsedUrl.pathname.replace(/\/+$/, '');
if (configuredPath && configuredPath !== '/rest/v1') {
  throw new Error('[Supabase] SUPABASE_URL must be a project root URL; custom paths are not supported.');
}
if (parsedUrl.search || parsedUrl.hash) {
  throw new Error('[Supabase] SUPABASE_URL must not include a query string or fragment.');
}

const supabaseUrl = parsedUrl.origin;

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

const createSupabaseClient = () => createClient(supabaseUrl, supabaseSecretKey, {
  auth: {
    autoRefreshToken: false,
    detectSessionInUrl: false,
    persistSession: false
  }
});

module.exports = {
  supabase: createSupabaseClient(),
  createSupabaseClient
};
