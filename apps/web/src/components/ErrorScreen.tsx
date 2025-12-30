'use client';

import { useRouter } from 'next/navigation';

interface ErrorScreenProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  showBack?: boolean;
}

export function ErrorScreen({
  title = 'Ooops....',
  message = "Something went wrong. We're doing everything to fix it and should be up and running soon",
  onRetry,
  showBack = true,
}: ErrorScreenProps) {
  const router = useRouter();

  const handleBack = () => {
    router.back();
  };

  const handleRetry = () => {
    if (onRetry) {
      onRetry();
    } else {
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen bg-[#2c3446] flex flex-col items-center justify-center px-6">
      {/* Back button */}
      <button
        onClick={handleBack}
        className="absolute top-8 left-6 text-white"
        aria-label="Go back"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      <div className="flex flex-col items-center justify-center flex-1">
        {/* Refresh Icon */}
        <div className="mb-8">
          <svg
            className="w-32 h-32 text-green-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        </div>

        {/* Error Text */}
        <h1 className="text-white text-2xl font-bold mb-4">{title}</h1>
        <p className="text-mist-400 text-center text-sm max-w-xs leading-relaxed">
          {message}
        </p>
      </div>

      {/* Action Buttons */}
      <div className="w-full max-w-sm space-y-3 mb-8">
        <button
          onClick={handleRetry}
          className="w-full bg-cyan-400 text-gray-900 font-semibold py-4 rounded-xl hover:bg-cyan-500 transition-colors"
        >
          Try again
        </button>
        {showBack && (
          <button
            onClick={handleBack}
            className="w-full bg-white text-gray-900 font-semibold py-4 rounded-xl hover:bg-gray-100 transition-colors"
          >
            Back
          </button>
        )}
      </div>
    </div>
  );
}

