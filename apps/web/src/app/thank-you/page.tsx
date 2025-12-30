'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

type UserCategory = 'host' | 'traveller' | 'service_host' | 'dispensary';

const categoryInfo = {
  host: {
    title: 'Host',
    icon: '🏠',
    color: 'from-green-500 to-green-600',
  },
  traveller: {
    title: 'Traveller',
    icon: '✈️',
    color: 'from-blue-500 to-blue-600',
  },
  service_host: {
    title: 'Service Host',
    icon: '🧘',
    color: 'from-purple-500 to-purple-600',
  },
  dispensary: {
    title: 'Dispensary',
    icon: '🌿',
    color: 'from-yellow-500 to-yellow-600',
  },
};

export default function ThankYouPage() {
  const searchParams = useSearchParams();
  const category = (searchParams.get('category') as UserCategory) || 'traveller';
  const [mounted, setMounted] = useState(false);
  const [showConfetti, setShowConfetti] = useState(true);

  useEffect(() => {
    setMounted(true);
    // Hide confetti after 3 seconds
    const timer = setTimeout(() => setShowConfetti(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  if (!mounted) {
    return null;
  }

  const info = categoryInfo[category];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-48 w-96 h-96 bg-green-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 -right-48 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl animate-pulse delay-500"></div>
      </div>

      {/* Confetti Effect */}
      {showConfetti && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[...Array(50)].map((_, i) => (
            <div
              key={i}
              className="confetti"
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 3}s`,
                backgroundColor: ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b'][Math.floor(Math.random() * 4)],
              }}
            />
          ))}
        </div>
      )}

      <div className="relative z-10 min-h-screen flex items-center justify-center px-4 py-12">
        <div className="max-w-2xl w-full text-center">
          {/* Success Animation */}
          <div className="mb-8 animate-scale-in">
            <div className="inline-flex items-center justify-center w-32 h-32 bg-gradient-to-br from-green-500 to-green-600 rounded-full shadow-2xl shadow-green-500/50 mb-8">
              <svg className="w-16 h-16 text-white animate-check" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>

          {/* Main Content */}
          <div className="bg-white/5 backdrop-blur-lg rounded-3xl p-8 md:p-12 border border-white/10 shadow-2xl animate-fade-in-up">
            <div className="text-6xl mb-6">{info.icon}</div>
            
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Thank You for Signing Up!
            </h1>
            
            <p className={`text-xl md:text-2xl mb-6 bg-gradient-to-r ${info.color} bg-clip-text text-transparent font-semibold`}>
              Welcome to the {info.title} waitlist
            </p>
            
            <div className="space-y-4 text-mist-300 mb-8">
              <p className="text-lg">
                You're now on the exclusive early access list for VibesBNB!
              </p>
              <p>
                We'll send you an email with your unique access code and all the details you need when we launch on:
              </p>
              <div className="inline-block bg-green-500/20 border border-green-500/50 rounded-2xl px-6 py-4 mt-4">
                <p className="text-green-400 font-bold text-xl">
                  April 20, 2026 at 12:00 PM PST
                </p>
              </div>
            </div>

            {/* What's Next */}
            <div className="bg-white/5 rounded-2xl p-6 mb-8 text-left">
              <h3 className="text-xl font-semibold mb-4 flex items-center">
                <span className="bg-gradient-to-r from-green-400 to-green-600 bg-clip-text text-transparent">
                  What happens next?
                </span>
              </h3>
              <ul className="space-y-3 text-mist-300">
                <li className="flex items-start">
                  <svg className="w-6 h-6 text-green-500 mr-3 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>You'll receive a confirmation email within 24 hours</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-6 h-6 text-green-500 mr-3 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>We'll keep you updated with exclusive previews and features</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-6 h-6 text-green-500 mr-3 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Get priority access when we launch</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-6 h-6 text-green-500 mr-3 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Special launch day perks for early supporters</span>
                </li>
              </ul>
            </div>

            {/* Social Sharing */}
            <div className="mb-8">
              <p className="text-mist-400 mb-4">Help us spread the word!</p>
              <div className="flex gap-4 justify-center">
                <button className="bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl px-6 py-3 transition-all hover:scale-105">
                  Share on Twitter
                </button>
                <button className="bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl px-6 py-3 transition-all hover:scale-105">
                  Share on Facebook
                </button>
              </div>
            </div>

            {/* Back to Home */}
            <Link
              href="/coming-soon"
              className="inline-flex items-center justify-center px-8 py-4 bg-gradient-to-r from-green-500 to-green-600 text-white font-semibold rounded-xl hover:shadow-2xl hover:scale-105 transition-all duration-300"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Home
            </Link>
          </div>

          {/* Footer */}
          <p className="text-mist-500 text-sm mt-8">
            Questions? Contact us at <a href="mailto:hello@vibesbnb.com" className="text-green-400 hover:text-green-300">hello@vibesbnb.com</a>
          </p>
        </div>
      </div>

      {/* Animations */}
      <style jsx>{`
        @keyframes scale-in {
          from {
            opacity: 0;
            transform: scale(0);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        
        @keyframes check {
          0% {
            stroke-dasharray: 0, 100;
          }
          100% {
            stroke-dasharray: 100, 0;
          }
        }
        
        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes confetti-fall {
          0% {
            transform: translateY(-100vh) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(360deg);
            opacity: 0;
          }
        }
        
        .animate-scale-in {
          animation: scale-in 0.6s ease-out;
        }
        
        .animate-check {
          animation: check 0.6s ease-out 0.3s forwards;
          stroke-dasharray: 0, 100;
        }
        
        .animate-fade-in-up {
          animation: fade-in-up 0.8s ease-out 0.4s both;
        }
        
        .confetti {
          position: absolute;
          width: 10px;
          height: 10px;
          animation: confetti-fall 3s linear forwards;
        }
        
        .delay-500 {
          animation-delay: 500ms;
        }
        
        .delay-1000 {
          animation-delay: 1000ms;
        }
      `}</style>
    </div>
  );
}

