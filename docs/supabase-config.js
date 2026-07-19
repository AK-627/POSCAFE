/* ═══════════════════════════════════════════════════════════════
   Sky Nether — Supabase Configuration
   ═══════════════════════════════════════════════════════════════
   
   ⚠️  REPLACE the values below with your actual Supabase keys.
       Find them at: Supabase Dashboard → Settings → API
   
   These keys are PUBLIC (anon key). RLS policies protect your data.
   ═══════════════════════════════════════════════════════════════ */

const SUPABASE_URL  = 'https://YOUR-PROJECT-ID.supabase.co';
const SUPABASE_ANON = 'YOUR-ANON-KEY-HERE';

// Initialize Supabase client
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);
