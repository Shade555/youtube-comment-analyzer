import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { Provider, Session } from '@supabase/supabase-js';
import { api, getStoredToken, setStoredToken } from '../services/api';
import type { AuthUser } from '../services/api';
import { authRedirectTo, isSupabaseConfigured, requireSupabase, supabase } from '../lib/supabase';
import { describeAuthError } from '../lib/authErrors';
import { upsertProfile } from '../services/supabaseData';

export interface SignupResult {
  /** True when Supabase emailed a confirmation link instead of logging in. */
  needsEmailConfirmation: boolean;
  email: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  isGuest: boolean;
  isLoading: boolean;
  /** True when a real Supabase project backs the login. */
  isSupabaseMode: boolean;
  /** True while the user is following a password-recovery link. */
  isRecovery: boolean;
  /** Profile sync problem worth surfacing (e.g. legacy email conflict). */
  syncError: string | null;
  signup: (email: string, password: string, fullName?: string) => Promise<SignupResult>;
  login: (email: string, password: string) => Promise<void>;
  signInWithProvider: (provider: Provider) => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  resendConfirmation: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  logout: () => Promise<void>;
  continueAsGuest: () => void;
  finishRecovery: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const GUEST_STORAGE_KEY = 'yca_is_guest';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isGuest, setIsGuest] = useState<boolean>(
    () => localStorage.getItem(GUEST_STORAGE_KEY) === 'true'
  );
  // Start "loading" only when there is something to load: either Supabase has a
  // session to restore, or a local fallback token needs validating. With neither
  // (e.g. a guest visiting for the first time) we can render immediately, which
  // also avoids a state update directly inside the bootstrap effect.
  const [isLoading, setIsLoading] = useState(
    () => isSupabaseConfigured || Boolean(getStoredToken())
  );
  const [isRecovery, setIsRecovery] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  // Guards state updates from the auth callback after unmount.
  const mountedRef = useRef(true);

  /**
   * Hand a Supabase session to our API (which verifies the token and mirrors the
   * profile into Postgres) and store it for the app shell.
   *
   * If the API is unreachable we still open the app using the session's own user
   * object, so a backend hiccup never looks like "login is broken".
   */
  const applySession = useCallback(async (session: Session | null) => {
    if (!session) {
      setStoredToken(null);
      setUser(null);
      return;
    }

    setStoredToken(session.access_token);

    const metadata = session.user.user_metadata ?? {};
    const sessionUser: AuthUser = {
      id: session.user.id,
      email: session.user.email ?? '',
      full_name: (metadata.full_name as string) ?? (metadata.name as string) ?? null,
      avatar_url: (metadata.avatar_url as string) ?? (metadata.picture as string) ?? null,
    };

    // Mirror the identity into `public.profiles` so every signup / login -
    // Google included - leaves a row in the Supabase database even when the
    // FastAPI backend is not running. This is best effort: the session itself
    // is already valid, and a failure here (usually a missing table or RLS
    // policy) is reported again by the history view when it loads.
    try {
      await upsertProfile(sessionUser);
    } catch (err) {
      console.warn(
        '[auth] Could not mirror the profile into Supabase:',
        err instanceof Error ? err.message : err
      );
    }
    if (!mountedRef.current) return;

    try {
      const profile = await api.me();
      if (!mountedRef.current) return;
      setUser(profile);
      setSyncError(null);
    } catch (err) {
      if (!mountedRef.current) return;
      setUser(sessionUser);
      setSyncError(describeAuthError(err));
    }

    if (!mountedRef.current) return;
    setIsGuest(false);
    localStorage.removeItem(GUEST_STORAGE_KEY);
  }, []);

  // --- Bootstrap the session (and keep it in sync while the tab is open) ----
  useEffect(() => {
    mountedRef.current = true;

    if (isSupabaseConfigured && supabase) {
      const client = supabase;

      client.auth
        .getSession()
        .then(({ data }) => applySession(data.session))
        .catch(() => applySession(null))
        .finally(() => {
          if (mountedRef.current) setIsLoading(false);
        });

      const { data: subscription } = client.auth.onAuthStateChange(
        (event, session) => {
          if (event === 'PASSWORD_RECOVERY') setIsRecovery(true);
          // supabase-js holds an internal lock while this callback runs, so any
          // await against the client inside it would deadlock. Defer instead.
          setTimeout(() => {
            void applySession(session);
          }, 0);
        }
      );

      return () => {
        mountedRef.current = false;
        subscription.subscription.unsubscribe();
      };
    }

    // Offline fallback: validate a previously stored local token. With no stored
    // token there is nothing to restore, and `isLoading` already initialised to
    // false above - so no state update is needed here.
    const token = getStoredToken();
    if (!token) return;
    api
      .me()
      .then((profile) => {
        if (!mountedRef.current) return;
        setUser(profile);
        setIsGuest(false);
        localStorage.removeItem(GUEST_STORAGE_KEY);
      })
      .catch(() => {
        if (!mountedRef.current) return;
        setStoredToken(null);
        setUser(null);
      })
      .finally(() => {
        if (mountedRef.current) setIsLoading(false);
      });
  }, [applySession]);

  // --- Actions --------------------------------------------------------------
  const signup = useCallback(
    async (
      email: string,
      password: string,
      fullName?: string
    ): Promise<SignupResult> => {
      const cleanEmail = email.trim().toLowerCase();

      if (!isSupabaseConfigured || !supabase) {
        const res = await api.signup(cleanEmail, password);
        setStoredToken(res.access_token);
        setUser(res.user);
        setIsGuest(false);
        localStorage.removeItem(GUEST_STORAGE_KEY);
        return { needsEmailConfirmation: false, email: cleanEmail };
      }

      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          emailRedirectTo: authRedirectTo('/'),
          data: fullName ? { full_name: fullName } : undefined,
        },
      });
      if (error) throw error;

      if (data.session) {
        // The project has email confirmation disabled: we are signed in already.
        await applySession(data.session);
        return { needsEmailConfirmation: false, email: cleanEmail };
      }
      // Confirmation is required, so this account cannot be used until the link
      // is clicked - and Supabase's shared mailer is best-effort and rate
      // limited. The card surfaces that instead of a "check your inbox" screen.
      return { needsEmailConfirmation: true, email: cleanEmail };
    },
    [applySession]
  );

  const login = useCallback(
    async (email: string, password: string): Promise<void> => {
      const cleanEmail = email.trim().toLowerCase();

      if (!isSupabaseConfigured || !supabase) {
        const res = await api.login(cleanEmail, password);
        setStoredToken(res.access_token);
        setUser(res.user);
        setIsGuest(false);
        localStorage.removeItem(GUEST_STORAGE_KEY);
        return;
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });
      if (error) throw error;
      await applySession(data.session);
    },
    [applySession]
  );

  /**
   * Start an OAuth sign-in. This hands the browser to the provider, so on
   * success the page navigates away and `detectSessionInUrl` picks the session
   * up when the provider redirects back.
   */
  const signInWithProvider = useCallback(async (provider: Provider): Promise<void> => {
    const { error } = await requireSupabase().auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: authRedirectTo('/'),
        // Google only: ask for a fresh consent-friendly login without forcing
        // the approval screen on every visit (we only need the identity).
        ...(provider === 'google' ? { queryParams: { prompt: 'select_account' } } : {}),
      },
    });
    if (error) throw error;
  }, []);

  const sendPasswordReset = useCallback(async (email: string): Promise<void> => {
    const { error } = await requireSupabase().auth.resetPasswordForEmail(
      email.trim().toLowerCase(),
      { redirectTo: authRedirectTo('/') }
    );
    if (error) throw error;
  }, []);

  const resendConfirmation = useCallback(async (email: string): Promise<void> => {
    const { error } = await requireSupabase().auth.resend({
      type: 'signup',
      email: email.trim().toLowerCase(),
      options: { emailRedirectTo: authRedirectTo('/') },
    });
    if (error) throw error;
  }, []);

  const updatePassword = useCallback(async (password: string): Promise<void> => {
    const { error } = await requireSupabase().auth.updateUser({ password });
    if (error) throw error;
    setIsRecovery(false);
  }, []);

  const logout = useCallback(async (): Promise<void> => {
    try {
      if (isSupabaseConfigured && supabase) {
        await supabase.auth.signOut();
      } else {
        await api.logout();
      }
    } catch {
      // Ignore network errors: the local session is cleared regardless.
    }
    setStoredToken(null);
    setUser(null);
    setIsGuest(false);
    setSyncError(null);
    localStorage.removeItem(GUEST_STORAGE_KEY);
  }, []);

  const continueAsGuest = useCallback(() => {
    setStoredToken(null);
    setUser(null);
    setIsGuest(true);
    localStorage.setItem(GUEST_STORAGE_KEY, 'true');
  }, []);

  const finishRecovery = useCallback(() => setIsRecovery(false), []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isGuest,
      isLoading,
      isSupabaseMode: isSupabaseConfigured,
      isRecovery,
      syncError,
      signup,
      login,
      signInWithProvider,
      sendPasswordReset,
      resendConfirmation,
      updatePassword,
      logout,
      continueAsGuest,
      finishRecovery,
    }),
    [
      user,
      isGuest,
      isLoading,
      isRecovery,
      syncError,
      signup,
      login,
      signInWithProvider,
      sendPasswordReset,
      resendConfirmation,
      updatePassword,
      logout,
      continueAsGuest,
      finishRecovery,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}