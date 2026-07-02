// ============================================================
//  supabaseClient.js — single Supabase client, shared by all pages
// ============================================================

const SUPABASE_URL = "https://odcorwehrxbafwpfdljv.supabase.co";       // Settings → API → Project URL
const SUPABASE_ANON_KEY = "sb_publishable_HvOrgzLTmI4jhf1nuvqTiw_yUrByBeR";     // Settings → API → anon public key

supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
