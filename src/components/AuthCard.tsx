import { useEffect, useState } from 'react';
import type { Provider } from '@supabase/supabase-js';
import {
  ArrowLeft,
  CircleAlert,
  KeyRound,
  Mail,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { describeAuthError, validateEmail, validatePassword } from '../lib/authErrors';
import { fetchAuthSettings } from '../lib/supabase';
import { TextField } from './auth/TextField';
import { ProviderButtons } from './auth/ProviderButtons';
import { hasUsableProvider, providerLabels } from '../lib/authProviders';
import { PasswordChecklist } from './auth/PasswordChecklist';
import { SubmitButton } from './auth/SubmitButton';

interface SupabaseAuthSettings {
  providers: Provider[];
  mailerAutoconfirm: boolean;
}

type Mode = 'login' | 'signup' | 'reset' | 'check-email' | 'new-password';

interface AuthCardProps {
  onClose: () => void;
  onLogin: () => void;
}

interface FieldErrors {
  email?: string;
  password?: string;
  confirm?: string;
}

export function AuthCard({ onClose, onLogin }: AuthCardProps) {
  const {
    login,
    signup,
    signInWithProvider,
    sendPasswordReset,
    resendConfirmation,
    updatePassword,
    isSupabaseMode,
    isRecovery,
  } = useAuth();

  const [mode, setMode] = useState<Mode>('login');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Seconds until "resend email" unlocks again (Supabase rate-limits sends).
  const [resendIn, setResendIn] = useState(0);
  const [pendingEmail, setPendingEmail] = useState('');
  // Set when a signup needs email confirmation, which this project cannot
  // deliver reliably. The login form then explains how to get unblocked.
  const [blockedByConfirmation, setBlockedByConfirmation] = useState(false);
  // Which providers the Supabase project actually has enabled (null = unknown).
  const [authSettings, setAuthSettings] = useState<SupabaseAuthSettings | null>(null);

  // Password-recovery links raise PASSWORD_RECOVERY, which pins the card to the
  // "choose a new password" step (derived rather than set in an effect).
  const view: Mode = isRecovery ? 'new-password' : mode;

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = setInterval(
      () => setResendIn((seconds) => (seconds <= 1 ? 0 : seconds - 1)),
      1000
    );
    return () => clearInterval(timer);
  }, [resendIn]);

  // Ask the project which providers are enabled so we never advertise a login
  // route that Supabase will reject ("provider is not enabled").
  useEffect(() => {
    let active = true;
    void fetchAuthSettings().then((result) => {
      if (active) setAuthSettings(result);
    });
    return () => {
      active = false;
    };
  }, []);

  const switchMode = (next: Mode) => {
    setMode(next);
    setFormError(null);
    setNotice(null);
    setErrors({});
    setPassword('');
    setConfirmPassword('');
  };

  const validateSignIn = () => {
    const next: FieldErrors = {};
    const emailError = validateEmail(email);
    if (emailError) next.email = emailError;
    if (!password) next.password = 'Enter your password.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const validateNewAccount = () => {
    const next: FieldErrors = {};
    const emailError = validateEmail(email);
    if (emailError) next.email = emailError;
    const passwordError = validatePassword(password);
    if (passwordError) next.password = passwordError;
    if (password !== confirmPassword) next.confirm = 'Passwords do not match.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  /** Shared submit wrapper: clears banners, tracks loading, maps errors. */
  const run = async (action: () => Promise<void>) => {
    setFormError(null);
    setNotice(null);
    setIsSubmitting(true);
    try {
      await action();
    } catch (err) {
      setFormError(describeAuthError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogin = () => {
    if (!validateSignIn()) return;
    void run(async () => {
      await login(email, password);
      onLogin();
    });
  };

  const handleSignup = () => {
    if (!validateNewAccount()) return;
    void run(async () => {
      const result = await signup(email, password, fullName.trim() || undefined);
      if (result.needsEmailConfirmation) {
        // Do not strand the user on a "check your inbox" screen: this project's
        // mailer is best-effort and rate limited, so the account is unusable
        // until confirmation is turned off. Say that on the login form instead.
        setPendingEmail(result.email);
        setBlockedByConfirmation(true);
        switchMode('login');
        return;
      }
      onLogin();
    });
  };

  const handleReset = () => {
    const emailError = validateEmail(email);
    if (emailError) {
      setErrors({ email: emailError });
      return;
    }
    setErrors({});
    void run(async () => {
      await sendPasswordReset(email);
      setPendingEmail(email.trim().toLowerCase());
      setResendIn(45);
      switchMode('check-email');
    });
  };

  const handleNewPassword = () => {
    const next: FieldErrors = {};
    const passwordError = validatePassword(password);
    if (passwordError) next.password = passwordError;
    if (password !== confirmPassword) next.confirm = 'Passwords do not match.';
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    void run(async () => {
      await updatePassword(password);
      onLogin();
    });
  };

  // Reset link and signup confirmation go to different Supabase endpoints, so
  // they get separate handlers - mixing them up would email the wrong link.
  const handleResendReset = () => {
    if (resendIn > 0) return;
    void run(async () => {
      await sendPasswordReset(pendingEmail);
      setResendIn(45);
      setNotice(`Sent again to ${pendingEmail}.`);
    });
  };

  const handleResendConfirmation = () => {
    if (resendIn > 0) return;
    void run(async () => {
      await resendConfirmation(pendingEmail);
      setResendIn(45);
      setNotice(`Confirmation email sent again to ${pendingEmail}.`);
    });
  };

  const handleProvider = (provider: Provider) => {
    void run(async () => {
      await signInWithProvider(provider);
    });
  };

  const titles: Record<Mode, { heading: string; sub: string }> = {
    login: {
      heading: 'Welcome back',
      sub: 'Log in with Google or your email to revisit your analyses.',
    },
    signup: {
      heading: 'Create your account',
      sub: 'Save every analysis to your Supabase account.',
    },
    reset: {
      heading: 'Reset your password',
      sub: 'We will email you a secure link to choose a new one.',
    },
    'check-email': {
      heading: 'Check your inbox',
      sub: 'Your password reset link is on its way.',
    },
    'new-password': {
      heading: 'Choose a new password',
      sub: 'Pick something you have not used before.',
    },
  };

  const isEmailForm = view === 'login' || view === 'signup' || view === 'reset';
  // Only providers the project has enabled are offered, so no button dead-ends.
  const enabledProviders = authSettings?.providers ?? [];
  const showProviders = view !== 'reset' && hasUsableProvider(enabledProviders);
  // Signup cannot succeed while confirmation is on and mail is unreliable.
  const confirmationRequired = authSettings?.mailerAutoconfirm === false;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-[#262837] bg-[#14151f] shadow-2xl">
        {/* Ambient glow, purely decorative. */}
        <div className="pointer-events-none absolute -top-24 left-1/2 h-48 w-96 -translate-x-1/2 rounded-full bg-indigo-500/25 blur-3xl" />

        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 z-10 rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-white/5 hover:text-white"
        >
          <X size={18} />
        </button>

        <div className="relative px-7 pb-7 pt-8">
          <div className="mb-5 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-indigo-300">
            <Sparkles size={13} />
            YouTube Comment Analyzer
          </div>

          <h2 className="text-2xl font-bold text-white">{titles[view].heading}</h2>
          <p className="mt-1 text-sm text-gray-400">{titles[view].sub}</p>

          {(view === 'login' || view === 'signup') && (
            <div className="mt-5 grid grid-cols-2 gap-1 rounded-xl border border-[#262837] bg-[#1a1c27] p-1">
              {(['login', 'signup'] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => switchMode(value)}
                  className={`rounded-lg py-2 text-sm font-medium transition-colors ${
                    view === value
                      ? 'bg-white text-black'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {value === 'login' ? 'Log in' : 'Sign up'}
                </button>
              ))}
            </div>
          )}

          {formError && (
            <div
              role="alert"
              className="mt-5 flex items-start gap-2 rounded-xl border border-red-500/40 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-300"
            >
              <CircleAlert size={15} className="mt-0.5 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {notice && (
            <div className="mt-5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3.5 py-2.5 text-sm text-emerald-300">
              {notice}
            </div>
          )}

          {!isSupabaseMode && (
            <div className="mt-5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3.5 py-2.5 text-xs text-amber-200/90">
              Running on the local auth fallback. Add{' '}
              <code className="text-amber-100">VITE_SUPABASE_URL</code> and{' '}
              <code className="text-amber-100">VITE_SUPABASE_ANON_KEY</code> to{' '}
              <code className="text-amber-100">.env</code> to enable Supabase Auth
              (Google/GitHub sign-in, password reset).
            </div>
          )}
{isEmailForm && (
            <div className="mt-6 space-y-4">
              {view === 'login' && blockedByConfirmation && (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3.5 py-3 text-xs text-amber-100/90">
                  <p className="flex items-start gap-2">
                    <ShieldCheck size={14} className="mt-0.5 shrink-0" />
                    <span>
                      <strong className="font-semibold">{pendingEmail}</strong> was
                      created, but this project requires email confirmation before
                      signing in - and Supabase&apos;s built-in mailer is
                      best-effort (about 2 emails/hour), so that link may never
                      arrive.
                    </span>
                  </p>
                  <p className="mt-2 pl-6 text-amber-200/80">
                    Unblock it by turning off <strong>Confirm email</strong> in
                    Supabase &rarr; Authentication &rarr; Sign In / Providers
                    &rarr; Email, then log in. Or use{' '}
                    {showProviders
                      ? 'one of the provider buttons above'
                      : providerLabels}
                    .
                  </p>
                  <button
                    type="button"
                    onClick={handleResendConfirmation}
                    disabled={resendIn > 0 || isSubmitting}
                    className="ml-6 mt-2.5 flex items-center gap-2 rounded-lg border border-amber-400/30 px-2.5 py-1.5 font-medium text-amber-100 transition-colors hover:bg-amber-400/10 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <RefreshCw size={13} className={isSubmitting ? 'animate-spin' : ''} />
                    {resendIn > 0
                      ? `Resend in ${resendIn}s`
                      : 'Try sending the confirmation email again'}
                  </button>
                </div>
              )}

              {showProviders && (
                <ProviderButtons
                  enabled={enabledProviders}
                  disabled={isSubmitting}
                  onSelect={handleProvider}
                />
              )}

              {showProviders && (
                <div className="flex items-center gap-3 text-[11px] uppercase tracking-widest text-gray-600">
                  <span className="h-px flex-1 bg-[#262837]" />
                  or use your email
                  <span className="h-px flex-1 bg-[#262837]" />
                </div>
              )}

              {view === 'signup' && (
                <TextField
                  id="fullName"
                  label="Full name"
                  value={fullName}
                  onChange={setFullName}
                  placeholder="Ada Lovelace"
                  autoComplete="name"
                  disabled={isSubmitting}
                />
              )}

              <TextField
                id="email"
                label="Email"
                type="email"
                value={email}
                onChange={(value) => {
                  setEmail(value);
                  if (errors.email) {
                    setErrors((prev) => ({ ...prev, email: undefined }));
                  }
                }}
                onBlur={() => {
                  const emailError = validateEmail(email);
                  setErrors((prev) => ({ ...prev, email: emailError ?? undefined }));
                }}
                placeholder="you@example.com"
                autoComplete="email"
                error={errors.email}
                disabled={isSubmitting}
                autoFocus={view === 'signup'}
                onEnter={
                  view === 'reset'
                    ? handleReset
                    : view === 'signup'
                      ? handleSignup
                      : handleLogin
                }
              />
              {view !== 'reset' && (
                <>
                  <TextField
                    id="password"
                    label="Password"
                    type="password"
                    value={password}
                    onChange={(value) => {
                      setPassword(value);
                      if (errors.password) {
                        setErrors((prev) => ({ ...prev, password: undefined }));
                      }
                    }}
                    placeholder="••••••••"
                    autoComplete={
                      view === 'signup' ? 'new-password' : 'current-password'
                    }
                    error={errors.password}
                    disabled={isSubmitting}
                    onEnter={view === 'signup' ? handleSignup : handleLogin}
                    hint={
                      view === 'login' ? (
                        <button
                          type="button"
                          onClick={() => switchMode('reset')}
                          className="text-xs font-medium text-indigo-300 underline-offset-2 hover:text-indigo-200 hover:underline"
                        >
                          Forgot password?
                        </button>
                      ) : undefined
                    }
                  />
                  {view === 'signup' && <PasswordChecklist value={password} />}
                </>
              )}

              {view === 'signup' && (
                <TextField
                  id="confirmPassword"
                  label="Confirm password"
                  type="password"
                  value={confirmPassword}
                  onChange={(value) => {
                    setConfirmPassword(value);
                    if (errors.confirm) {
                      setErrors((prev) => ({ ...prev, confirm: undefined }));
                    }
                  }}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  error={errors.confirm}
                  disabled={isSubmitting}
                  onEnter={handleSignup}
                />
              )}

              {view === 'signup' && confirmationRequired && (
                <p className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3.5 py-2.5 text-xs text-amber-200/90">
                  <ShieldCheck size={14} className="mt-0.5 shrink-0" />
                  <span>
                    This project requires email confirmation, but Supabase&apos;s
                    built-in mailer is best-effort (about 2 emails/hour) - the
                    link often never arrives, and login stays blocked until it
                    does. Turn off <strong>Confirm email</strong> in Supabase
                    &rarr; Authentication &rarr; Sign In / Providers &rarr; Email,
                    or sign in with {providerLabels} instead.
                  </span>
                </p>
              )}

              <div className="pt-1">
                <SubmitButton
                  isSubmitting={isSubmitting}
                  label={
                    view === 'login'
                      ? 'Log in'
                      : view === 'signup'
                        ? 'Create account'
                        : 'Send reset link'
                  }
                  onClick={
                    view === 'login'
                      ? handleLogin
                      : view === 'signup'
                        ? handleSignup
                        : handleReset
                  }
                />
              </div>

              {view === 'reset' && (
                <button
                  type="button"
                  onClick={() => switchMode('login')}
                  className="mx-auto flex items-center gap-1.5 text-sm text-gray-400 hover:text-white"
                >
                  <ArrowLeft size={14} /> Back to log in
                </button>
              )}

              {(view === 'login' || view === 'signup') && (
                <p className="pt-1 text-center text-xs text-gray-500">
                  {view === 'signup' ? 'Already have an account? ' : 'New here? '}
                  <button
                    type="button"
                    onClick={() => switchMode(view === 'signup' ? 'login' : 'signup')}
                    className="font-medium text-gray-300 underline-offset-2 hover:text-white hover:underline"
                  >
                    {view === 'signup' ? 'Log in' : 'Create one'}
                  </button>
                </p>
              )}
            </div>
          )}
{view === 'check-email' && (
            <div className="mt-6">
              <div className="flex items-start gap-3 rounded-xl border border-[#262837] bg-[#1a1c27] p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-500/15 text-indigo-300">
                  <Mail size={18} />
                </div>
                <div className="text-sm">
                  <p className="font-medium text-gray-100">{pendingEmail}</p>
                  <p className="mt-1 text-gray-400">
                    Follow the link in that email to set a new password.
                  </p>
                </div>
              </div>

              <div className="mt-5 space-y-3">
                <button
                  type="button"
                  onClick={handleResendReset}
                  disabled={resendIn > 0 || isSubmitting}
                  className="flex w-full items-center justify-center gap-2 rounded-full border border-[#2b2e3f] bg-[#1a1c27] py-3 text-sm font-medium text-gray-100 transition-colors hover:bg-[#20222f] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <RefreshCw size={15} className={isSubmitting ? 'animate-spin' : ''} />
                  {resendIn > 0 ? `Resend in ${resendIn}s` : 'Resend reset link'}
                </button>

                <button
                  type="button"
                  onClick={() => switchMode('login')}
                  className="mx-auto flex items-center gap-1.5 text-sm text-gray-400 hover:text-white"
                >
                  <ArrowLeft size={14} /> Back to log in
                </button>
              </div>

              <p className="mt-5 text-center text-xs text-gray-500">
                Nothing in your inbox? Check the spam folder - or that address may
                already have an account.
              </p>
            </div>
          )}

          {view === 'new-password' && (
            <div className="mt-6 space-y-4">
              <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2.5 text-xs text-emerald-200">
                <ShieldCheck size={15} />
                Recovery link verified
              </div>

              <TextField
                id="newPassword"
                label="New password"
                type="password"
                value={password}
                onChange={setPassword}
                placeholder="••••••••"
                autoComplete="new-password"
                error={errors.password}
                disabled={isSubmitting}
                autoFocus
                onEnter={handleNewPassword}
              />
              <PasswordChecklist value={password} />

              <TextField
                id="confirmNewPassword"
                label="Confirm new password"
                type="password"
                value={confirmPassword}
                onChange={setConfirmPassword}
                placeholder="••••••••"
                autoComplete="new-password"
                error={errors.confirm}
                disabled={isSubmitting}
                onEnter={handleNewPassword}
              />

              <div className="pt-1">
                <SubmitButton label="Save new password" isSubmitting={isSubmitting} onClick={handleNewPassword} />
              </div>
            </div>
          )}

          <p className="mt-6 flex items-center justify-center gap-1.5 text-center text-[11px] text-gray-600">
            <KeyRound size={11} />
            Passwords are hashed and managed by Supabase Auth.
          </p>
        </div>
      </div>
    </div>
  );
}
