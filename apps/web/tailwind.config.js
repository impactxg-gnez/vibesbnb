/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      keyframes: {
        'vibes-loadbar': {
          '0%': { left: '-45%' },
          '100%': { left: '100%' },
        },
      },
      animation: {
        'vibes-loadbar': 'vibes-loadbar 1.35s ease-in-out infinite',
      },
      colors: {
        primary: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#00E676', // Vibrant Green from mockup
          600: '#00C853',
          700: '#00A144',
          800: '#008137',
          900: '#00652B',
        },
        surface: {
          light: '#2A2A2A',
          DEFAULT: '#1A1A1A',
          dark: '#0A0A0A',
        },
        // ~7.6:1 on #0A0A0A — WCAG 2.2 AA (≥4.5:1) for normal text
        muted: '#B3B3B3',
      },
    },
  },
  plugins: [],
};


