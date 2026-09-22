import { isSupabaseConfigured, supabase } from '../lib/supabase';

const API_BASE_URL =
  import.meta.env.VITE_API_URL ??
  (import.meta.env.DEV ? 'http://127.0.0.1:8000/api' : '/api');

const TOKEN_STORAGE_KEY = 'yca_token';

/** Local fallback token (only used when Supabase is not configured). */
export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function setStoredToken(token: string | null): void {
  if (token) {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  }
}

/**
 * Resolve the bearer token for the next request.
 *
 * With Supabase configured the session is the source of truth (and may have been
 * silently refreshed in the background); otherwise we use the locally issued
 * fallback token.
 */
async function getAccessToken(): Promise<string | null> {
  if (isSupabaseConfigured && supabase) {
    const { data } = await supabase.auth.getSession();
    if (data.session?.access_token) {
      return data.session.access_token;
    }
  }
  return getStoredToken();
}

function send(
  path: string,
  options: RequestInit,
  token: string | null
): Promise<Response> {
  return fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  let token = await getAccessToken();
  let response = await send(path, options, token);

  // Supabase access tokens are short-lived: refresh once and retry on a 401 so a
  // long-idle tab does not get spurious failures.
  if (response.status === 401 && isSupabaseConfigured && supabase) {
    const { data } = await supabase.auth.refreshSession();
    const refreshed = data.session?.access_token ?? null;
    if (refreshed) {
      token = refreshed;
      response = await send(path, options, token);
    }
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Request failed');
  }

  // Some endpoints (like logout) may return an empty body.
  const text = await response.text();
  return text ? (JSON.parse(text) as T) : ({} as T);
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface CommentAnalysis {
  text: string;
  processed_text: string;
  emotion_model: string;
  emotions: string[];
  sarcasm_label: number;
  sarcasm_probability: number;
}

export interface YouTubeAnalyzeResponse {
  video_id: string;
  total_comments: number;
  analyzed_comments: number;
  emotion_distribution: Record<string, number>;
  sarcasm_rate: number;
  model_usage: Record<string, number>;
  comments: CommentAnalysis[];
  video_url?: string | null;
  video_title?: string | null;
  thumbnail_url?: string | null;
}

export interface AuthUser {
  id: string;
  email: string;
  full_name?: string | null;
  avatar_url?: string | null;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user: AuthUser;
}

export interface AnalysisSummary {
  id: string;
  video_id: string;
  video_url?: string | null;
  video_title?: string | null;
  thumbnail_url?: string | null;
  total_comments: number;
  analyzed_comments: number;
  sarcasm_rate: number;
  status: string;
  created_at: string;
}

export interface AnalysisDetail extends AnalysisSummary {
  emotion_distribution: Record<string, number>;
  model_usage: Record<string, number>;
  comments: CommentAnalysis[];
}

/** What `GET /` reports about the running backend. */
export interface BackendHealth {
  status: string;
  /** Which database the backend persists into. */
  database: 'sqlite' | 'postgres' | string;
  auth_mode?: string;
  ignored_placeholders?: string[];
  hint?: string;
}



/**
 * Origin of the API (without the trailing `/api`), used for non-`/api` routes
 * such as the health check.
 */
export const API_ORIGIN = API_BASE_URL.replace(/\/api\/?$/, '');

/**
 * Ask the backend which database it is using.
 *
 * The frontend writes analyses straight into Supabase; when the backend is
 * already persisting into a Postgres/Supabase database the same row would be
 * inserted twice, so the caller uses this to decide who owns the write.
 * Returns null when the backend is unreachable (solo-browser mode).
 */
export async function fetchBackendHealth(): Promise<BackendHealth | null> {
  try {
    const response = await fetch(`${API_ORIGIN}/`);
    if (!response.ok) return null;
    return (await response.json()) as BackendHealth;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// API surface
// ---------------------------------------------------------------------------
export const api = {
  // --- Auth ---
  async signup(email: string, password: string): Promise<TokenResponse> {
    return request<TokenResponse>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  async login(email: string, password: string): Promise<TokenResponse> {
    return request<TokenResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  async me(): Promise<AuthUser> {
    return request<AuthUser>('/auth/me');
  },

  async logout(): Promise<void> {
    await request('/auth/logout', { method: 'POST' });
  },

  // --- Analysis ---
  async analyzeYouTubeVideo(url: string): Promise<YouTubeAnalyzeResponse> {
    return request<YouTubeAnalyzeResponse>('/analyze/youtube', {
      method: 'POST',
      body: JSON.stringify({ url }),
    });
  },

  async listAnalyses(): Promise<AnalysisSummary[]> {
    return request<AnalysisSummary[]>('/analyses');
  },

  async getAnalysis(id: string): Promise<AnalysisDetail> {
    return request<AnalysisDetail>(`/analyses/${id}`);
  },

  async deleteAnalysis(id: string): Promise<void> {
    await request(`/analyses/${id}`, { method: 'DELETE' });
  },
};