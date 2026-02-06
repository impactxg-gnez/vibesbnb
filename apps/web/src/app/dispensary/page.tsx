'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import { Truck, Leaf, ShieldCheck, ArrowRight, Store } from 'lucide-react';

export default function DispensarySignupPage() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    dispensaryName: '',
    location: '',
    deliveryRadius: 10,
    description: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const supabase = createClient();

  const handleNext = () => setStep(step + 1);
  const handleBack = () => setStep(step - 1);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Create dispensary application directly (no auth signup - admin approval only)
      const { error: dispError } = await supabase
        .from('dispensaries')
        .insert({
          email: formData.email,
          owner_name: formData.name,
          name: formData.dispensaryName,
          location: formData.location,
          // Coordinates can be added later by admin or geocoding service
          latitude: null,
          longitude: null,
          delivery_radius: formData.deliveryRadius,
          description: formData.description,
          status: 'pending' // Admin must approve
        });
        
      if (dispError) {
        // Check if it's a duplicate
        if (dispError.code === '23505') {
          toast.error('An application with this email or dispensary name already exists');
        } else {
          console.error('Error creating dispensary application:', dispError);
          toast.error('Failed to submit application. Please try again.');
        }
        setIsLoading(false);
        return;
      }

      toast.success('Application submitted!');
      setStep(3); // Success step
    } catch (error: any) {
      toast.error(error.message || 'Failed to submit application');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-dark text-white pt-24 pb-12 px-6 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-6xl pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-primary-500/10 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-primary-500/5 blur-[120px] rounded-full animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      <div className="max-w-2xl mx-auto relative z-10">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-500 rounded-2xl mb-6 shadow-[0_0_30px_rgba(0,230,118,0.3)]">
            <Leaf className="text-black w-8 h-8" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
            Partner with <span className="text-primary-500">VibesBNB</span>
          </h1>
          <p className="text-muted text-lg max-w-md mx-auto">
            Join the community and reach wellness-seeking travellers in your area.
          </p>
        </div>

        {/* Progress bar */}
        {step < 3 && (
          <div className="flex items-center justify-between mb-8 max-w-sm mx-auto">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all ${step >= 1 ? 'bg-primary-500 text-black' : 'bg-white/10 text-muted'}`}>1</div>
            <div className={`flex-1 h-1 mx-4 rounded-full ${step >= 2 ? 'bg-primary-500' : 'bg-white/10'}`} />
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all ${step >= 2 ? 'bg-primary-500 text-black' : 'bg-white/10 text-muted'}`}>2</div>
          </div>
        )}

        <div className="bg-surface border border-white/5 rounded-[2.5rem] p-8 md:p-12 shadow-[0_30px_60px_rgba(0,0,0,0.5)]">
          {step === 1 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="space-y-2">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <ShieldCheck className="text-primary-500" />
                  Account Details
                </h2>
                <p className="text-muted">Set up your owner account</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-muted uppercase tracking-wider ml-1">Full Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="Your name"
                    className="input !py-4"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-muted uppercase tracking-wider ml-1">Business Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    placeholder="contact@yourdispensary.com"
                    className="input !py-4"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-muted uppercase tracking-wider ml-1">Password</label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    placeholder="••••••••"
                    className="input !py-4"
                  />
                </div>
              </div>

              <button 
                onClick={handleNext}
                disabled={!formData.name || !formData.email || !formData.password}
                className="btn-primary w-full !py-5 text-lg flex items-center justify-center gap-2 group"
              >
                Next Step
                <ArrowRight className="group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="space-y-2">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <Store className="text-primary-500" />
                  Dispensary Profile
                </h2>
                <p className="text-muted">Tell us about your business</p>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-muted uppercase tracking-wider ml-1">Dispensary Name</label>
                  <input
                    type="text"
                    value={formData.dispensaryName}
                    onChange={(e) => setFormData({...formData, dispensaryName: e.target.value})}
                    placeholder="e.g. Green Haven Miami"
                    className="input !py-4"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-muted uppercase tracking-wider ml-1">Store Location / Address</label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({...formData, location: e.target.value})}
                    placeholder="e.g. 123 Main St, Miami, FL 33101"
                    className="input !py-4"
                  />
                  <p className="text-xs text-muted ml-1">Enter your store's full address</p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-muted uppercase tracking-wider ml-1">Business Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    placeholder="Tell us about your products and services..."
                    className="input !py-4 min-h-[100px] resize-none"
                  />
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-bold text-muted uppercase tracking-wider ml-1 flex items-center gap-2">
                      <Truck className="w-4 h-4 text-primary-500" />
                      Delivery Radius
                    </label>
                    <span className="text-primary-500 font-bold">{formData.deliveryRadius} miles</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="50"
                    value={formData.deliveryRadius}
                    onChange={(e) => setFormData({...formData, deliveryRadius: parseInt(e.target.value)})}
                    className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-primary-500"
                  />
                  <div className="flex justify-between text-xs text-muted font-medium">
                    <span>1 mi</span>
                    <span>25 mi</span>
                    <span>50 mi</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <button 
                  onClick={handleBack}
                  className="btn-secondary flex-1 !py-5"
                >
                  Back
                </button>
                <button 
                  onClick={handleSubmit}
                  disabled={isLoading || !formData.dispensaryName || !formData.location}
                  className="btn-primary flex-[2] !py-5 text-lg"
                >
                  {isLoading ? 'Creating Application...' : 'Apply to Join'}
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="text-center space-y-8 animate-in zoom-in duration-500">
              <div className="w-20 h-20 bg-primary-500/20 rounded-full flex items-center justify-center mx-auto">
                <ShieldCheck className="text-primary-500 w-10 h-10" />
              </div>
              <div className="space-y-4">
                <h2 className="text-3xl font-bold">Application Submitted!</h2>
                <div className="space-y-3">
                  <p className="text-muted">Your dispensary application has been sent to our admin team for review.</p>
                  <div className="bg-primary-500/10 border border-primary-500/20 rounded-2xl p-4 inline-block">
                    <div className="flex items-center justify-center gap-2 text-primary-500 font-semibold">
                      <ShieldCheck className="w-5 h-5" />
                      <span>Pending Admin Approval</span>
                    </div>
                  </div>
                  <p className="text-sm text-muted">
                    You'll receive an email at <span className="text-white font-medium">{formData.email}</span> once approved.
                  </p>
                </div>
              </div>
              <Link href="/" className="btn-primary inline-flex px-8 !py-4">
                Return Home
              </Link>
            </div>
          )}
        </div>

        {step < 3 && (
          <p className="text-center mt-8 text-muted font-medium">
            Already listing on VibesBNB? {' '}
            <Link href="/login" className="text-primary-500 font-bold hover:underline">
              Sign in to dashboard
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
