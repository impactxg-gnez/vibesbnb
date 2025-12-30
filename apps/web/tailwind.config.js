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
      colors: {
        // Dark Charcoal Background (from screenshots)
        'charcoal': {
          50: '#F5F5F3',
          100: '#E8E8E6',
          200: '#D1D1CF',
          300: '#BABAB8',
          400: '#A3A3A1',
          500: '#8C8C8A',
          600: '#6E6E6C',
          700: '#50504E',
          800: '#323230',
          900: '#1A1A18',
          950: '#0E0F11', // Main dark background
        },
        // Earthy Green (cannabis leaf, toggles, accents)
        'earth': {
          50: '#F0F5F0',
          100: '#D9E6D9',
          200: '#B3CDB3',
          300: '#8DB48D',
          400: '#679B67',
          500: '#4A7C4A', // Main earthy green
          600: '#3D653D',
          700: '#304E30',
          800: '#233723',
          900: '#162016',
        },
        // Brown Accent (for buttons like "Relax & Restore")
        'rust': {
          50: '#FDF5F0',
          100: '#FAE6D9',
          200: '#F5CDB3',
          300: '#F0B48D',
          400: '#EB9B67',
          500: '#C96E45', // Main brown/rust
          600: '#A15838',
          700: '#79422B',
          800: '#512C1E',
          900: '#291611',
        },
        // Light Gray Text
        'mist': {
          50: '#FFFFFF',
          100: '#F5F5F3', // Main light text
          200: '#E8E8E6',
          300: '#D1D1CF',
          400: '#BABAB8',
          500: '#A3A3A1',
        },
        // Legacy primary colors mapped to new scheme
        primary: {
          50: '#F0F5F0',
          100: '#D9E6D9',
          200: '#B3CDB3',
          300: '#8DB48D',
          400: '#679B67',
          500: '#4A7C4A', // Main green
          600: '#3D653D',
          700: '#304E30',
          800: '#233723',
          900: '#162016',
        },
      },
    },
  },
  plugins: [],
};


