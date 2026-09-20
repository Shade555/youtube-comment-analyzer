import { useState, type ReactNode } from 'react';
import { CircleAlert, Eye, EyeOff } from 'lucide-react';

interface TextFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: 'text' | 'email' | 'password';
  placeholder?: string;
  autoComplete?: string;
  /** Inline field error - shown under the input and turns the border red. */
  error?: string | null;
  hint?: ReactNode;
  disabled?: boolean;
  autoFocus?: boolean;
  onBlur?: () => void;
  /** Called on Enter, so forms submit like a real form. */
  onEnter?: () => void;
}

export function TextField({
  id,
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  autoComplete,
  error,
  hint,
  disabled,
  autoFocus,
  onBlur,
  onEnter,
}: TextFieldProps) {
  const [revealed, setRevealed] = useState(false);
  const isPassword = type === 'password';
  const inputType = isPassword && revealed ? 'text' : type;
  const errorId = `${id}-error`;

  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <label
          htmlFor={id}
          className="text-sm font-medium text-gray-300"
        >
          {label}
        </label>
        {hint}
      </div>

      <div className="relative">
        <input
          id={id}
          type={inputType}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && onEnter) {
              e.preventDefault();
              onEnter();
            }
          }}
          placeholder={placeholder}
          autoComplete={autoComplete}
          disabled={disabled}
          autoFocus={autoFocus}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          className={`w-full rounded-xl border bg-[#1a1c27] px-3.5 py-2.5 text-sm text-gray-100 placeholder-gray-600 transition-colors focus:outline-none focus:ring-2 disabled:opacity-60 ${
            isPassword ? 'pr-11' : ''
          } ${
            error
              ? 'border-red-500/70 focus:border-red-500 focus:ring-red-500/30'
              : 'border-[#2b2e3f] focus:border-indigo-500 focus:ring-indigo-500/30'
          }`}
        />

        {isPassword && (
          <button
            type="button"
            onClick={() => setRevealed((current) => !current)}
            tabIndex={-1}
            aria-label={revealed ? 'Hide password' : 'Show password'}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-gray-500 transition-colors hover:text-gray-300"
          >
            {revealed ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        )}
      </div>

      {error && (
        <p
          id={errorId}
          className="mt-1.5 flex items-center gap-1.5 text-xs text-red-400"
        >
          <CircleAlert size={13} className="shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}