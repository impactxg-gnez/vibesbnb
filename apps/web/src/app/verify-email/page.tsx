export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen bg-charcoal-950 flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full text-center">
        <div className="bg-charcoal-900 shadow-lg rounded-xl p-8 border border-charcoal-800">
          <div className="text-6xl mb-6">✉️</div>
          <h1 className="text-3xl font-bold text-white mb-4">
            Check Your Email
          </h1>
          <p className="text-mist-400 mb-6">
            We've sent you a verification link. Please check your email and click the link to verify your account.
          </p>
          <p className="text-sm text-mist-500">
            If you don't see the email, check your spam folder.
          </p>
        </div>
      </div>
    </div>
  );
}

