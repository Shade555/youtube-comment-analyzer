import { isSupabaseConfigured, requireSupabase } from '../lib/supabase';
import type { AnalysisDetail, AnalysisSummary, YouTubeAnalyzeResponse } from './api';

export interface UserProfile {
  id: string;
  email?: string;
  full_name?: string | null;
  avatar_url?: string | null;
  updated_at?: string;
}

/**
 * Indicates whether Supabase storage is active based on environment configuration.
 */
export function isSupabaseDataEnabled(): boolean {
  return isSupabaseConfigured;
}

/**
 * Creates or updates a user profile record in public.profiles.
 */
export async function upsertProfile(profile: UserProfile): Promise<void> {
  const supabase = requireSupabase();

  const payload: Record<string, unknown> = {
    id: profile.id,
    ...(profile.email ? { email: profile.email } : {}),
    ...(profile.full_name !== undefined ? { full_name: profile.full_name } : {}),
    ...(profile.avatar_url !== undefined ? { avatar_url: profile.avatar_url } : {}),
  };

  const { error } = await supabase
    .from('profiles')
    .upsert(payload, { onConflict: 'id' });

  if (error) {
    console.warn(`Failed to upsert user profile: ${error.message}`);
  }
}

/**
 * Fetches the user's history list from the `analyses` table in Supabase.
 * Excludes heavy `comments` JSON for fast UI loading.
 */
export async function listAnalyses(): Promise<AnalysisSummary[]> {
  const supabase = requireSupabase();

  const { data, error } = await supabase
    .from('analyses')
    .select('id, video_id, video_url, video_title, thumbnail_url, total_comments, analyzed_comments, sarcasm_rate, status, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch history list from Supabase: ${error.message}`);
  }

  return (data || []) as AnalysisSummary[];
}

/**
 * Fetches full analysis details (including emotion distribution & comments JSON).
 */
export async function getAnalysis(id: string): Promise<AnalysisDetail> {
  const supabase = requireSupabase();

  const { data, error } = await supabase
    .from('analyses')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    throw new Error(`Failed to fetch analysis from Supabase: ${error.message}`);
  }

  return data as AnalysisDetail;
}

/**
 * Deletes an analysis row from Supabase.
 */
export async function deleteAnalysis(id: string): Promise<void> {
  const supabase = requireSupabase();

  const { error } = await supabase
    .from('analyses')
    .delete()
    .eq('id', id);

  if (error) {
    throw new Error(`Failed to delete analysis from Supabase: ${error.message}`);
  }
}

/**
 * Inserts a completed YouTube video analysis directly into public.analyses.
 */
export async function saveAnalysis(
  userId: string,
  data: YouTubeAnalyzeResponse
): Promise<AnalysisSummary> {
  const supabase = requireSupabase();

  const recordId = (data as { id?: string }).id || crypto.randomUUID();
  const videoId = data.video_id;
  const thumbnailUrl =
    data.thumbnail_url ||
    `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

  const recordToInsert = {
    id: recordId,
    user_id: userId,
    video_id: videoId,
    video_url: data.video_url || `https://www.youtube.com/watch?v=${videoId}`,
    video_title: data.video_title || `Video (${videoId})`,
    thumbnail_url: thumbnailUrl,
    total_comments: data.total_comments,
    analyzed_comments: data.analyzed_comments,
    emotion_distribution: data.emotion_distribution,
    comments: data.comments,
    sarcasm_rate: data.sarcasm_rate,
    status: 'completed',
  };

  const { data: inserted, error } = await supabase
    .from('analyses')
    .insert([recordToInsert])
    .select('id, video_id, video_url, video_title, thumbnail_url, total_comments, analyzed_comments, sarcasm_rate, status, created_at')
    .single();

  if (error) {
    throw new Error(`Failed to save analysis to Supabase: ${error.message}`);
  }

  return inserted as AnalysisSummary;
}