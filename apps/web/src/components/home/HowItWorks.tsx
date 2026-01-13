'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';

const steps = [
  {
    number: 1,
    title: 'Search',
    description: 'Browse wellness-friendly properties tailored to your travel style',
    icon: '🔍',
  },
  {
    number: 2,
    title: 'Book',
    description: 'Secure booking with verified hosts and transparent pricing',
    icon: '✅',
  },
  {
    number: 3,
    title: 'Enjoy',
    description: 'Relax in a welcoming environment where you can be yourself',
    icon: '🌿',
  },
  {
    number: 4,
    title: 'Review',
    description: 'Share your experience to help others find amazing stays',
    icon: '⭐',
  },
];

export function HowItWorks() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <div className="bg-surface-dark py-32 relative overflow-hidden">
      {/* Background Decorative Element */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl">
        <div className="absolute top-0 left-0 w-96 h-96 bg-primary-500/5 blur-[120px] rounded-full -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-primary-500/5 blur-[120px] rounded-full translate-x-1/2 translate-y-1/2" />
      </div>

      <div className="container mx-auto px-6 relative z-10" ref={ref}>
        <motion.div 
          className="text-center mb-24"
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
        >
          <h2 className="text-5xl font-bold text-white mb-6 tracking-tight">
            How It <span className="text-primary-500 italic">Works</span>
          </h2>
          <p className="text-muted max-w-2xl mx-auto text-lg leading-relaxed">
            Your wellness-friendly getaway is just a few clicks away. We've simplified the process so you can focus on your journey.
          </p>
        </motion.div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, index) => (
            <motion.div
              key={step.number}
              className="relative"
              initial={{ opacity: 0, y: 50 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.8, delay: index * 0.15 }}
            >
              <div className="bg-surface group rounded-[2.5rem] p-10 border border-white/5 hover:border-primary-500/30 transition-all duration-500 hover:shadow-[0_20px_40px_rgba(0,0,0,0.4)] h-full flex flex-col">
                <div className="text-5xl mb-8 group-hover:scale-110 transition-transform origin-left">{step.icon}</div>
                
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-primary-500 flex items-center justify-center text-black font-black text-xl shadow-[0_0_20px_rgba(0,230,118,0.3)]">
                    {step.number}
                  </div>
                  <h3 className="text-2xl font-bold text-white group-hover:text-primary-500 transition-colors uppercase tracking-tight">{step.title}</h3>
                </div>
                
                <p className="text-muted leading-relaxed font-medium">{step.description}</p>
              </div>

              {/* Connector Line (visible on large screens) */}
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-[5.5rem] -right-4 w-8 h-px bg-white/10" />
              )}
            </motion.div>
          ))}
        </div>
        
        <motion.div 
          className="text-center mt-24"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={isInView ? { opacity: 1, scale: 1 } : {}}
          transition={{ duration: 0.8, delay: 0.8 }}
        >
          <div className="inline-flex flex-col sm:flex-row gap-6 p-2 bg-surface rounded-[2.5rem] border border-white/5 shadow-2xl">
            <a
              href="/search"
              className="btn-primary min-w-[200px]"
            >
              Start Exploring
            </a>
            <a
              href="/host"
              className="bg-white/5 hover:bg-white/10 text-white px-8 py-4 rounded-[1.5rem] font-bold transition-all flex items-center justify-center gap-2 border border-white/5"
            >
              Become a Host
            </a>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
