'use client';

const steps = [
  {
    number: 1,
    title: 'Search & Discover',
    description: 'Browse 420-friendly accommodations and experiences tailored to your preferences',
    icon: '🔍',
  },
  {
    number: 2,
    title: 'Book with Confidence',
    description: 'Secure booking with verified hosts and transparent pricing',
    icon: '✅',
  },
  {
    number: 3,
    title: 'Enjoy Your Stay',
    description: 'Relax knowing you can be yourself in a welcoming environment',
    icon: '🌿',
  },
  {
    number: 4,
    title: 'Share Your Experience',
    description: 'Leave reviews to help others discover amazing cannabis-friendly stays',
    icon: '⭐',
  },
];

export function HowItWorks() {
  return (
    <div className="bg-gray-50 py-16">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">How It Works</h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Finding your perfect 420-friendly getaway is easy with VibesBNB
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step) => (
            <div key={step.number} className="text-center">
              <div className="text-6xl mb-4">{step.icon}</div>
              <div className="inline-block bg-green-600 text-white w-10 h-10 rounded-full flex items-center justify-center font-bold mb-4">
                {step.number}
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">{step.title}</h3>
              <p className="text-gray-600">{step.description}</p>
            </div>
          ))}
        </div>
        
        <div className="text-center mt-12">
          <div className="bg-green-100 border border-green-600 rounded-xl p-8 max-w-3xl mx-auto">
            <h3 className="text-2xl font-bold text-gray-900 mb-3">Ready to Get Started?</h3>
            <p className="text-gray-700 mb-6">
              Join thousands of travelers finding their perfect cannabis-welcoming accommodations
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="/search"
                className="inline-block bg-green-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-green-700 transition"
              >
                Start Searching
              </a>
              <a
                href="/host"
                className="inline-block bg-white text-green-700 px-8 py-3 rounded-lg font-semibold hover:bg-gray-50 transition border-2 border-green-600"
              >
                List Your Space
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

