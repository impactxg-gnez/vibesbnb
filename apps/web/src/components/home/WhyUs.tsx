'use client';

import { motion } from 'framer-motion';

const features = [
  {
    icon: '✓',
    text: 'Verified wellness-friendly policies',
  },
  {
    icon: '🌿',
    text: 'Wellness-first',
  },
  {
    icon: '🌲',
    text: 'Nature-inspired',
  },
];

export function WhyUs() {
  return (
    <div className="container mx-auto px-6 pb-32">
      <div className="bg-surface relative overflow-hidden rounded-[3rem] p-12 border border-white/5">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary-500/5 blur-[120px] rounded-full translate-x-1/2 -translate-y-1/2" />
        
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-12">
          <div className="max-w-md text-center md:text-left">
            <h2 className="text-4xl font-bold text-white mb-6">Why <span className="text-primary-500">VibesBNB</span></h2>
            <p className="text-muted leading-relaxed">
              We're redefining travel by putting your well-being first. Every property is personally vetted to ensure it meets our organic, sustainable, and soulful standards.
            </p>
          </div>
          
          <div className="flex flex-wrap justify-center md:justify-end gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="flex items-center gap-4 bg-white/5 border border-white/5 px-6 py-4 rounded-3xl group hover:bg-white/10 transition-colors"
              >
                <div className="w-12 h-12 bg-primary-500/10 rounded-2xl flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                  {feature.icon}
                </div>
                <span className="text-white font-bold tracking-tight">{feature.text}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

