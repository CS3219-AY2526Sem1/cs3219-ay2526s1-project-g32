/* AI Assistance Disclosure:
Scope: Setup Supabase Client metadata.
Author Review: Validated for style and accuracy.
*/

import { createClient } from '@supabase/supabase-js';

import { config } from '../config';

export const supabaseAdminClient = createClient(
  config.supabase.url,
  config.supabase.serviceRoleKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: {
        'X-Client-Info': 'peerprep-user-service-admin',
      },
    },
  },
);

export const supabaseAnonClient = createClient(
  config.supabase.url,
  config.supabase.anonKey,
  {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
  global: {
    headers: {
      'X-Client-Info': 'peerprep-user-service-anon',
    },
  },
});
