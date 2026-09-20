interface SubmitButtonProps {
  label: string;
  isSubmitting: boolean;
  onClick: () => void;
}

/** Primary action button with a built-in pending state. */
export function SubmitButton({ label, isSubmitting, onClick }: SubmitButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isSubmitting}
      className="flex w-full items-center justify-center gap-2 rounded-full bg-white py-3 font-semibold text-black transition-colors hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {isSubmitting ? (
        <>
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-black/25 border-t-black" />
          Working...
        </>
      ) : (
        label
      )}
    </button>
  );
}