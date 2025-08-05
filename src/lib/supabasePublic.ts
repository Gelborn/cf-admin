// lib/supabasePublic.ts
import { createClient } from '@supabase/supabase-js';

export const supabasePublic = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  {
    auth: { persistSession: false, autoRefreshToken: false }, // nunca terá JWT
    global: { headers: { /* nada de Authorization */ } },
  },
);
