// Public client configuration only. Never put service_role or sb_secret_* keys here.
const VAULT_CONFIG = Object.freeze({
  supabaseUrl: 'https://umccpdbopcgluwsnhlwj.supabase.co',
  supabaseAnonKey: 'sb_publishable_tU-8sRzR5tqlOO31Oqa_Ow_QD06lH6L',
  storageVersion: 1,
  guestStartingBalance: 1000000,
  localDebounceMs: 300,
  syncDebounceMs: 900,
  maxPendingEvents: 250,
  maxLocalRounds: 100,
  sdkUrl: 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.49.8/dist/umd/supabase.js',
});
