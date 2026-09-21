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

/**
 * Returns the redirect URL for Supabase Auth OAuth and Magic Link callbacks.
 * Accepts an optional path (e.g. authRedirectTo('/auth/callback')).
 */
export function authRedirectTo(path: string = ''): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  if (!path) return origin;
  return `${origin}${path.startsWith('/') ? path : `/${path}`}`;
}

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