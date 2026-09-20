import { Check } from 'lucide-react';
import { passwordChecks } from '../../lib/authErrors';

/** Live password requirements, so signup never feels like a blind guess. */
export function PasswordChecklist({ value }: { value: string }) {
  return (
    <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
      {passwordChecks(value).map((rule) => (
        <li
          key={rule.label}
          className={`flex items-center gap-1.5 text-xs transition-colors ${
            rule.met ? 'text-emerald-400' : 'text-gray-500'
          }`}
        >
          <span
            className={`flex h-3.5 w-3.5 items-center justify-center rounded-full border transition-colors ${
              rule.met
                ? 'border-emerald-400/60 bg-emerald-400/15'
                : 'border-gray-600'
            }`}
          >
            {rule.met && <Check size={9} strokeWidth={3} />}
          </span>
          {rule.label}
        </li>
      ))}
    </ul>
  );
}