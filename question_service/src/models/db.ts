import { createClient } from '@supabase/supabase-js';
import { config } from '../config';

// Create Supabase client with service role key for server-side operations
const supabase = createClient(config.supabase.url, config.supabase.serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

export default supabase;
