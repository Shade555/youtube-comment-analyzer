/**
 * Friendly, human wording for Supabase Auth failures, plus the client-side
 * validation used for inline field errors.
 */

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function validateEmail(value: string): string | null {
  const email = value.trim();
  if (!email) return 'Enter your email address.';
  if (!EMAIL_PATTERN.test(email)) return 'That does not look like a valid email.';
  return null;
}

export function validatePassword(value: string): string | null {
  if (!value) return 'Enter a password.';
  if (value.length < 8) return 'Use at least 8 characters.';
  if (!/[A-Za-z]/.test(value)) return 'Include at least one letter.';
  if (!/\d/.test(value)) return 'Include at least one number.';
  return null;
}

export function passwordChecks(value: string) {
  return [
    { label: '8+ characters', met: value.length >= 8 },
    { label: 'a letter', met: /[A-Za-z]/.test(value) },
    { label: 'a number', met: /\d/.test(value) },
  ];
}

/** Turn whatever Supabase (`AuthError`) or our API threw into plain English. */
export function describeAuthError(error: unknown): string {
  const raw =
    (error as { message?: string } | null)?.message ?? String(error ?? '');
  const code = (error as { code?: string } | null)?.code ?? '';
  const message = raw.toLowerCase();

  if (message.includes('not configured')) {
    return 'Supabase is not configured yet. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env, then restart the dev server.';
  }
  if (
    code === 'invalid_credentials' ||
    message.includes('invalid login credentials')
  ) {
    return 'That email and password combination is not right.';
  }
  if (code === 'email_not_confirmed' || message.includes('email not confirmed')) {
    return 'This account still needs email confirmation, and this project cannot send mail reliably. Turn off "Confirm email" in Supabase, or sign in with Google/GitHub instead.';
  }
  if (code === 'user_already_exists' || message.includes('already registered')) {
    return 'An account with this email already exists. Try logging in instead.';
  }
  if (code === 'weak_password' || message.includes('weak password')) {
    return 'That password is too weak. Try adding numbers or symbols.';
  }
  if (
    code === 'over_email_send_rate_limit' ||
    message.includes('rate limit') ||
    message.includes('too many requests')
  ) {
    return 'Email sending is limited by Supabase\'s shared mailer (about 2 per hour). Use Google/GitHub sign-in, or configure custom SMTP in Supabase.';
  }
  if (
    message.includes('provider is not enabled') ||
    message.includes('unsupported provider')
  ) {
    return 'That sign-in provider is not enabled on this Supabase project yet.';
  }
  if (message.includes('failed to fetch') || message.includes('network')) {
    return 'Could not reach the server. Check your connection and try again.';
  }
  if (message.includes('password') && message.includes('least')) {
    return 'Choose a longer password.';
  }
  if (message.includes('same password')) {
    return 'Your new password must be different from the old one.';
  }
  return raw || 'Something went wrong. Please try again.';
}