'use client';

type FormErrorLiveProps = {
  id?: string;
  message?: string | null;
};

/** Announce form validation errors to assistive tech (prefer over toast-only). */
export function FormErrorLive({ id = 'form-error-live', message }: FormErrorLiveProps) {
  if (!message) return null;
  return (
    <div id={id} role="alert" aria-live="assertive" className="text-rose-400 text-sm font-medium mt-2">
      {message}
    </div>
  );
}
