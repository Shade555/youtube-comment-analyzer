import { api, fetchBackendHealth } from './api';
import type { AnalysisDetail, AnalysisSummary, YouTubeAnalyzeResponse } from './api';
import {
  deleteAnalysis as deleteInSupabase,
  getAnalysis as getFromSupabase,
  isSupabaseDataEnabled,
  listAnalyses as listFromSupabase,
  saveAnalysis as saveInSupabase,
} from './supabaseData';

/**
 * Single entry point for analysis history used across pages.
 *
 * Primary: Reads and writes to `public.analyses` via Supabase when configured.
 * Fallback: Uses FastAPI backend endpoints when running offline / without Supabase.
 */

/** Caches check result: does the backend handle Postgres persistence itself? */
let backendOnPostgres: Promise<boolean> | null = null;

function backendOwnsStorage(): Promise<boolean> {
  if (backendOnPostgres === null) {
    backendOnPostgres = fetchBackendHealth()
      .then((health) => health?.database === 'postgres')
      .catch(() => false);
  }
  return backendOnPostgres;
}

export const historyStore = {
  /** Returns true when active storage uses Supabase */
  isSupabaseBacked(): boolean {
    return isSupabaseDataEnabled();
  },

  /** Retrieves full list of analyses */
  async list(): Promise<AnalysisSummary[]> {
    if (isSupabaseDataEnabled()) return listFromSupabase();
    return api.listAnalyses();
  },

  /** Retrieves single detailed analysis */
  async get(id: string): Promise<AnalysisDetail> {
    if (isSupabaseDataEnabled()) return getFromSupabase(id);
    return api.getAnalysis(id);
  },

  /** Deletes an analysis record */
  async remove(id: string): Promise<void> {
    if (isSupabaseDataEnabled()) {
      await deleteInSupabase(id);
      return;
    }
    await api.deleteAnalysis(id);
  },

  /**
   * Persists a finished analysis from the client.
   * Skips saving if Supabase is disabled or backend is already saving to Postgres.
   */
  async save(
    userId: string,
    data: YouTubeAnalyzeResponse
  ): Promise<AnalysisSummary | null> {
    if (!isSupabaseDataEnabled()) return null;
    if (await backendOwnsStorage()) return null;
    return saveInSupabase(userId, data);
  },
};