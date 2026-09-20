import type { ComponentType } from 'react';
import type { Provider } from '@supabase/supabase-js';
import { GoogleIcon } from '../components/auth/GoogleIcon';
import { AppleIcon, GitHubIcon, MicrosoftIcon } from '../components/auth/ProviderIcons';

interface ProviderMeta {
  /** Supabase provider id, as returned by /auth/v1/settings. */
  id: Provider;
  label: string;
  Icon: ComponentType<{ size?: number }>;
}

/**
 * Providers we have a mark and wording for.
 *
 * The rendered list is driven by the project's own settings, so whatever is
 * enabled in the Supabase dashboard shows up with no code change. Supabase
 * reports Microsoft Entra ID as `azure`, hence the id/label mismatch.
 */
const providerMeta: ProviderMeta[] = [
  { id: 'google' as Provider, label: 'Google', Icon: GoogleIcon },
  { id: 'github' as Provider, label: 'GitHub', Icon: GitHubIcon },
  { id: 'azure' as Provider, label: 'Microsoft', Icon: MicrosoftIcon },
  { id: 'apple' as Provider, label: 'Apple', Icon: AppleIcon },
];

/** The enabled providers we can actually draw, in a stable display order. */
export function supportedProviders(enabled: string[]): ProviderMeta[] {
  return providerMeta.filter((meta) => enabled.includes(meta.id));
}

export function hasUsableProvider(enabled: string[]): boolean {
  return supportedProviders(enabled).length > 0;
}

/** Provider names for setup hints, so copy never mentions one we cannot draw. */
export const providerLabels = providerMeta.map((meta) => meta.label).join(', ');