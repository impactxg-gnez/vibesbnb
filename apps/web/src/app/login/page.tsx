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
            ref={(el) => (inputRefs.current[index] = el)}
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

export default function LoginPage() {
  const [phoneNumber, setPhoneNumber] = useState('');
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

          {step === 'phone' ? (
            <>
              <h2 className="text-white text-lg font-medium mb-2">Enter your phone number</h2>
              <p className="text-gray-400 text-sm">
                Enter your phone number to receive a SMS verification code.
              </p>
            </>
          ) : (
            <>
              <h2 className="text-white text-lg font-medium mb-2">Enter verification code</h2>
              <p className="text-gray-400 text-sm">
                We sent a code to {phoneNumber}
              </p>
            </>
          )}
        </div>

        {/* Form */}
        {step === 'phone' ? (
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
        ) : (
          <VerificationForm 
            phoneNumber={phoneNumber}
            onVerify={handleVerifyCode}
            onResend={handleResendCode}
            onBack={() => setStep('phone')}
            isLoading={isLoading}
          />
        )}
      </div>
    </div>
  );
}


