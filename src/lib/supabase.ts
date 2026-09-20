import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured: boolean = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export function requireSupabase() {
  if (!supabase) {
    throw new Error(
      'Supabase client is not configured. Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment variables.'
    );
  }
  return supabase;
}

/** Base URL used by Supabase Auth for OAuth and magic link redirects */
export const authRedirectTo = typeof window !== 'undefined' ? window.location.origin : '';

export interface AuthSettings {
  isConfigured: boolean;
  providers?: string[];
  allowSignUp?: boolean;
}

/**
 * Returns current auth configuration settings used by Auth components.
 */
export async function fetchAuthSettings(): Promise<AuthSettings> {
  return {
    isConfigured: isSupabaseConfigured,
    providers: ['email', 'google', 'github'],
    allowSignUp: true,
  };
}