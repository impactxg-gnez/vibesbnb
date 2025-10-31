'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

interface VerificationFormProps {
  phoneNumber: string;
  onVerify: (e: React.FormEvent) => Promise<void>;
  onResend: () => Promise<void>;
  onBack: () => void;
  isLoading: boolean;
}

function VerificationForm({ phoneNumber, onVerify, onResend, onBack, isLoading }: VerificationFormProps) {
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = (index: number, value: string) => {
    if (value.length > 1) {
      value = value.slice(0, 1);
    }

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Store the code in a hidden input or pass it to parent
    await onVerify(e);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* OTP Input Boxes */}
      <div className="flex justify-center gap-3 mb-8">
        {code.map((digit, index) => (
          <input
            key={index}
            ref={(el) => {
              inputRefs.current[index] = el;
            }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            className="w-12 h-16 bg-white text-gray-900 text-center text-2xl font-semibold rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        ))}
      </div>

      {/* Message */}
      <p className="text-center text-sm text-gray-400 mb-4">
        <span className="text-green-500">42DBNB</span> needs to verify your identity. We just sent a SMS code to the phone number above. Please enter the code below:
      </p>

      {/* Resend Code Link */}
      <div className="text-center mb-6">
        <button
          type="button"
          onClick={onResend}
          disabled={isLoading}
          className="text-gray-400 hover:text-white transition-colors text-sm disabled:opacity-50"
        >
          Resend Code
        </button>
        <p className="text-xs text-green-500 mt-2">
          Code Resent! Please allow up to 10 minutes.
        </p>
      </div>

      {/* Back to Phone Input */}
      <div className="text-center">
        <button
          type="button"
          onClick={onBack}
          className="text-gray-400 hover:text-white transition-colors text-sm"
        >
          ← Change phone number
        </button>
      </div>

      {/* Exit Button */}
      <div className="text-center mt-8">
        <Link
          href="/"
          className="text-gray-400 hover:text-white transition-colors text-sm"
        >
          Exit
        </Link>
      </div>
    </form>
  );
}

type LoginMethod = 'phone' | 'password' | 'sso';

export default function LoginPage() {
  const [loginMethod, setLoginMethod] = useState<LoginMethod>('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [step, setStep] = useState<'phone' | 'verify'>('phone');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // TODO: Implement SMS verification API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success('Verification code sent!');
      setStep('verify');
    } catch (error: any) {
      toast.error('Failed to send verification code');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // TODO: Implement verification API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success('Login successful!');
      router.push('/dashboard');
    } catch (error: any) {
      toast.error('Invalid verification code');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    setIsLoading(true);
    try {
      // TODO: Implement resend code API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success('Verification code resent!');
    } catch (error: any) {
      toast.error('Failed to resend code');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // TODO: Implement password login API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success('Login successful!');
      router.push('/dashboard');
    } catch (error: any) {
      toast.error('Invalid email or password');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialLogin = (provider: string) => {
    toast(`${provider} login coming soon!`, {
      icon: 'ℹ️',
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#2c3446] px-4 py-8 relative">
      {/* Exit Button */}
      <Link
        href="/"
        className="absolute bottom-8 text-gray-400 hover:text-white transition-colors text-sm"
      >
        Exit
      </Link>

      <div className="w-full max-w-md">
        {/* Header with Lock Icon */}
        <div className="text-center mb-8">
          <h1 className="text-white text-2xl font-semibold mb-8">Login</h1>
          
          {/* Green Circular Lock Icon */}
          <div className="relative w-48 h-48 mx-auto mb-8">
            {/* Outer glow circles */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-green-600/30 to-green-900/30 blur-xl"></div>
            <div className="absolute inset-4 rounded-full bg-gradient-to-br from-green-600/40 to-green-800/40 blur-lg"></div>
            <div className="absolute inset-8 rounded-full bg-gradient-to-br from-green-500/50 to-green-700/50"></div>
            
            {/* Center circle with lock */}
            <div className="absolute inset-14 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center shadow-2xl">
              <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
          </div>

          {step === 'verify' ? (
            <>
              <h2 className="text-white text-lg font-medium mb-2">Enter verification code</h2>
              <p className="text-gray-400 text-sm">
                We sent a code to {phoneNumber}
              </p>
            </>
          ) : (
            <>
              <h2 className="text-white text-lg font-medium mb-2">Choose login method</h2>
              <p className="text-gray-400 text-sm">
                Select how you'd like to sign in
              </p>
            </>
          )}
        </div>

        {/* Login Method Tabs */}
        {step !== 'verify' && (
          <div className="flex gap-2 mb-6 bg-[#3a4358] p-1.5 rounded-xl">
            <button
              type="button"
              onClick={() => setLoginMethod('phone')}
              className={`flex-1 py-3 px-4 rounded-lg font-medium text-sm transition-all ${
                loginMethod === 'phone'
                  ? 'bg-green-500 text-white shadow-lg'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Phone
            </button>
            <button
              type="button"
              onClick={() => setLoginMethod('password')}
              className={`flex-1 py-3 px-4 rounded-lg font-medium text-sm transition-all ${
                loginMethod === 'password'
                  ? 'bg-green-500 text-white shadow-lg'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Password
            </button>
            <button
              type="button"
              onClick={() => setLoginMethod('sso')}
              className={`flex-1 py-3 px-4 rounded-lg font-medium text-sm transition-all ${
                loginMethod === 'sso'
                  ? 'bg-green-500 text-white shadow-lg'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              SSO
            </button>
          </div>
        )}

        {/* Form Based on Login Method */}
        {step === 'verify' ? (
          <VerificationForm 
            phoneNumber={phoneNumber}
            onVerify={handleVerifyCode}
            onResend={handleResendCode}
            onBack={() => setStep('phone')}
            isLoading={isLoading}
          />
        ) : loginMethod === 'phone' ? (
          <form onSubmit={handleSendCode} className="space-y-6">
            {/* Phone Number Input */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <input
                type="tel"
                required
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="w-full bg-[#3a4358] text-white pl-12 pr-4 py-4 rounded-lg border-b-2 border-gray-600 focus:border-green-500 focus:outline-none transition-colors placeholder-gray-500"
                placeholder="888-888-8888"
              />
            </div>

            {/* Continue Button */}
            <button
              type="submit"
              disabled={isLoading || !phoneNumber}
              className="w-full bg-green-500 text-white font-semibold py-4 rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-green-500/30"
            >
              {isLoading ? 'Sending...' : 'Send Code'}
            </button>
          </form>
        ) : loginMethod === 'password' ? (
          <form onSubmit={handlePasswordLogin} className="space-y-6">
            {/* Email Input */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                </svg>
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#3a4358] text-white pl-12 pr-4 py-4 rounded-lg border-b-2 border-gray-600 focus:border-green-500 focus:outline-none transition-colors placeholder-gray-500"
                placeholder="Email address"
              />
            </div>

            {/* Password Input */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#3a4358] text-white pl-12 pr-4 py-4 rounded-lg border-b-2 border-gray-600 focus:border-green-500 focus:outline-none transition-colors placeholder-gray-500"
                placeholder="Password"
              />
            </div>

            {/* Forgot Password */}
            <div className="text-right">
              <Link href="/forgot-password" className="text-sm text-gray-400 hover:text-white transition-colors">
                Forgot password?
              </Link>
            </div>

            {/* Login Button */}
            <button
              type="submit"
              disabled={isLoading || !email || !password}
              className="w-full bg-green-500 text-white font-semibold py-4 rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-green-500/30"
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        ) : (
          <div className="space-y-4">
            <p className="text-center text-gray-400 text-sm mb-6">
              Sign in with your preferred provider
            </p>

            {/* Google SSO */}
            <button
              type="button"
              onClick={() => handleSocialLogin('Google')}
              className="w-full flex items-center justify-center gap-3 bg-white text-gray-900 font-semibold py-4 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <svg className="w-6 h-6" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <span>Continue with Google</span>
            </button>

            {/* Apple SSO */}
            <button
              type="button"
              onClick={() => handleSocialLogin('Apple')}
              className="w-full flex items-center justify-center gap-3 bg-black text-white font-semibold py-4 rounded-lg hover:bg-gray-900 transition-colors"
            >
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
              </svg>
              <span>Continue with Apple</span>
            </button>

            {/* Facebook SSO */}
            <button
              type="button"
              onClick={() => handleSocialLogin('Facebook')}
              className="w-full flex items-center justify-center gap-3 bg-[#1877F2] text-white font-semibold py-4 rounded-lg hover:bg-[#166FE5] transition-colors"
            >
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
              <span>Continue with Facebook</span>
            </button>
          </div>
        )}

        {/* Sign Up Link */}
        {step !== 'verify' && (
          <div className="mt-8 text-center">
            <p className="text-gray-400 text-sm">
              Don't have an account?{' '}
              <Link href="/select-role" className="text-green-500 hover:text-green-400 transition-colors font-semibold">
                Sign up
              </Link>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}


