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
    <div className="container mx-auto px-4 pb-20">
      <h2 className="text-2xl font-bold text-mist-100 mb-6">Why VibesBNB</h2>
      
      <div className="flex flex-wrap gap-3">
        {features.map((feature, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: index * 0.1 }}
            className="flex items-center gap-2 bg-charcoal-900 border border-charcoal-800 px-4 py-3 rounded-2xl"
          >
            <span className="text-earth-500 text-lg">{feature.icon}</span>
            <span className="text-mist-100 text-sm">{feature.text}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

