import type { Provider } from '@supabase/supabase-js';
import { supportedProviders } from '../../lib/authProviders';

interface ProviderButtonsProps {
  /** Enabled provider ids straight from the project settings. */
  enabled: string[];
  disabled?: boolean;
  onSelect: (provider: Provider) => void;
}

export function ProviderButtons({ enabled, disabled, onSelect }: ProviderButtonsProps) {
  const available = supportedProviders(enabled);
  if (available.length === 0) return null;

  return (
    <div className="space-y-2.5">
      {available.map(({ id, label, Icon }) => (
        <button
          key={id}
          type="button"
          onClick={() => onSelect(id)}
          disabled={disabled}
          className="flex w-full items-center justify-center gap-3 rounded-xl border border-[#2b2e3f] bg-[#1a1c27] py-2.5 text-sm font-medium text-gray-100 transition-colors hover:border-[#3a3e52] hover:bg-[#20222f] disabled:opacity-60"
        >
          <Icon size={18} />
          Continue with {label}
        </button>
      ))}
    </div>
  );
}