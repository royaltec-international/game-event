// ============================================================
//  supabaseClient.js — single Supabase client, shared by all pages
// ============================================================

const SUPABASE_URL = "REPLACE_WITH_YOUR_PROJECT_URL";       // Settings → API → Project URL
const SUPABASE_ANON_KEY = "REPLACE_WITH_YOUR_ANON_KEY";     // Settings → API → anon public key

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
