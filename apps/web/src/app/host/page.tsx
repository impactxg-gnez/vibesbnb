export default function HostPage() {
  return (
    <div className="min-h-screen bg-gray-950">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 text-white py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl">
            <h1 className="text-4xl sm:text-5xl font-bold mb-6">
              Become a VibesBNB Host
            </h1>
            <p className="text-xl mb-8 text-emerald-50">
              Share your wellness-friendly space with travelers who appreciate it
            </p>
            <button className="bg-white text-emerald-700 px-8 py-4 rounded-lg font-semibold text-lg hover:bg-gray-100 transition">
              Start Hosting
            </button>
          </div>
        </div>
      </div>

      {/* Benefits */}
      <div className="container mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-center mb-12 text-white">Why Host on VibesBNB?</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-center bg-gray-900 p-8 rounded-xl border border-gray-800">
            <div className="text-5xl mb-4">💰</div>
            <h3 className="text-xl font-semibold mb-3 text-white">Earn Extra Income</h3>
            <p className="text-gray-400">
              Turn your extra space into income by hosting like-minded travelers
            </p>
          </div>
          <div className="text-center bg-gray-900 p-8 rounded-xl border border-gray-800">
            <div className="text-5xl mb-4">🛡️</div>
            <h3 className="text-xl font-semibold mb-3 text-white">Host Protection</h3>
            <p className="text-gray-400">
              Comprehensive insurance and 24/7 support to protect your property
            </p>
          </div>
          <div className="text-center bg-gray-900 p-8 rounded-xl border border-gray-800">
            <div className="text-5xl mb-4">🧘</div>
            <h3 className="text-xl font-semibold mb-3 text-white">Wellness-Friendly</h3>
            <p className="text-gray-400">
              Connect with guests who respect and appreciate your wellness-friendly policies
            </p>
          </div>
        </div>
      </div>

      {/* How It Works */}
      <div className="bg-gray-900 py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12 text-white">How Hosting Works</h2>
          <div className="max-w-4xl mx-auto space-y-8">
            <div className="flex gap-6">
              <div className="flex-shrink-0 w-12 h-12 bg-emerald-600 text-white rounded-full flex items-center justify-center font-bold text-xl">
                1
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2 text-white">Create Your Listing</h3>
                <p className="text-gray-400">
                  Add photos, description, amenities, and your house rules. Set your own pricing and availability.
                </p>
              </div>
            </div>
            <div className="flex gap-6">
              <div className="flex-shrink-0 w-12 h-12 bg-emerald-600 text-white rounded-full flex items-center justify-center font-bold text-xl">
                2
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2 text-white">Welcome Guests</h3>
                <p className="text-gray-400">
                  Receive booking requests from verified guests. Communicate through our secure messaging system.
                </p>
              </div>
            </div>
            <div className="flex gap-6">
              <div className="flex-shrink-0 w-12 h-12 bg-emerald-600 text-white rounded-full flex items-center justify-center font-bold text-xl">
                3
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2 text-white">Get Paid</h3>
                <p className="text-gray-400">
                  Receive payment 24 hours after guest check-in. Choose your preferred payout method.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="bg-emerald-900/30 border border-emerald-600/50 rounded-2xl p-12 text-center max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold mb-4 text-white">Ready to Start Hosting?</h2>
          <p className="text-xl text-gray-300 mb-8">
            Join thousands of hosts earning income from their wellness-friendly spaces
          </p>
          <button className="bg-emerald-600 text-white px-10 py-4 rounded-lg font-semibold text-lg hover:bg-emerald-700 transition">
            List Your Space
          </button>
        </div>
      </div>
    </div>
  );
}
