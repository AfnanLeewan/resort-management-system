import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const isDemoMode = import.meta.env.VITE_DEMO_MODE === 'true';

// Check if Supabase is configured
export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey && supabaseUrl !== 'https://your-project-id.supabase.co');

// Create Supabase client (with fallback for demo mode)
export const supabase = isSupabaseConfigured
  ? createClient<Database>(supabaseUrl, supabaseAnonKey)
  : null;

// Export demo mode flag
export const isInDemoMode = isDemoMode || !isSupabaseConfigured;

// Log configuration status
if (import.meta.env.DEV) {
  if (isSupabaseConfigured) {
    console.log('✅ Supabase connected:', supabaseUrl);
  } else {
    console.log('⚠️ Supabase not configured. Running in demo mode with LocalStorage.');
    console.log('   To connect Supabase, create a .env file with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
  }
}
