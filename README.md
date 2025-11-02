# VibesBNB

The complete 420-friendly travel marketplace connecting travelers with cannabis-welcoming accommodations and experiences.

## 🌿 About VibesBNB

VibesBNB is a full-featured marketplace platform designed for cannabis-friendly travel. Our platform connects travelers seeking 420-welcoming accommodations with hosts who provide them, creating a judgment-free travel experience.

## ✨ Features

### For Travelers
- **Search & Discovery**: Browse cannabis-friendly listings by location, dates, and preferences
- **Detailed Listings**: View property details, amenities, photos, and reviews
- **Secure Booking**: Safe and transparent booking process with instant confirmation
- **Verified Hosts**: All hosts are verified for your peace of mind
- **Reviews & Ratings**: Read reviews from other travelers

### For Hosts
- **List Your Space**: Easily create and manage property listings
- **Set Your Rules**: Define your own cannabis consumption policies
- **Flexible Pricing**: Control your pricing and availability
- **Host Protection**: Comprehensive insurance and support
- **Guest Communication**: Secure messaging with potential guests

### Platform Features
- **Early Access Signup**: Pre-launch signup pages for building user base
- **Dual-Site Architecture**: Separate signup and main app experiences
- **Mobile Responsive**: Optimized for all devices
- **Modern UI/UX**: Beautiful, intuitive interface built with Next.js 14 and Tailwind CSS

## 📁 Project Structure

```
VibesBNB/
├── apps/
│   └── web/                    # Next.js frontend application
│       ├── src/
│       │   ├── app/           # App router pages
│       │   │   ├── coming-soon/      # Landing page
│       │   │   ├── early-access/     # Signup forms
│       │   │   ├── search/           # Search page
│       │   │   ├── listings/         # Listing details
│       │   │   ├── host/             # Host onboarding
│       │   │   └── ...
│       │   ├── components/    # React components
│       │   │   ├── home/             # Homepage components
│       │   │   ├── search/           # Search components
│       │   │   └── layout/           # Layout components
│       │   └── lib/          # Utilities and helpers
│       ├── middleware.ts      # Route middleware
│       └── vercel.json        # Vercel configuration
├── packages/
│   └── shared/                # Shared types and utilities
│       ├── src/types/        # TypeScript types
│       └── src/utils/        # Shared utility functions
└── scripts/                   # Deployment scripts

```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Build shared packages
cd packages/shared && npm run build && cd ../..

# Run development server
npm run dev
```

Visit:
- Main app: http://localhost:3000
- Coming soon: http://localhost:3000/coming-soon
- Search: http://localhost:3000/search

### Build for Production

```bash
npm run build
npm run start
```

## 📦 Deployment

### Dual Vercel Deployment

This project supports deployment to two separate Vercel projects:

1. **vibesbnb-signup** - Early access signup pages
   - Domain: `signup.vibesbnb.com`
   - Shows: `/coming-soon`, `/early-access`, `/thank-you`

2. **vibesbnb-web** - Main application
   - Domain: `vibesbnb.com` or `www.vibesbnb.com`
   - Shows: Homepage, search, listings, host dashboard, etc.

### Deploy to Vercel

#### Using Vercel Dashboard

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your repository
3. Set project name: `vibesbnb-web`
4. Set root directory: `apps/web`
5. Configure build settings:
   ```
   Build Command: cd ../.. && npm run build -- --filter=@vibesbnb/web
   Output Directory: .next
   Install Command: cd ../.. && npm install
   ```
6. Add environment variables (see below)
7. Deploy!

#### Using Vercel CLI

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
cd apps/web
vercel --prod
```

### Environment Variables

Add these in Vercel Dashboard → Settings → Environment Variables:

```bash
# Required
NEXT_PUBLIC_API_URL=https://your-api-url.com
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_key

# Optional (for future features)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
NEXT_PUBLIC_SOCKET_URL=wss://your-websocket-url.com
```

## 🎨 Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Deployment**: Vercel
- **Package Manager**: npm (workspaces)

## 🧪 Development

### Project Commands

```bash
# Development
npm run dev          # Start dev server

# Building
npm run build        # Build all packages and apps
npm run start        # Start production server

# Deployment
npm run deploy       # Deploy to Vercel
```

### Monorepo Structure

This is a monorepo using npm workspaces:
- `apps/web` - Frontend Next.js application
- `packages/shared` - Shared TypeScript types and utilities

## 📖 Documentation

- [Deployment Guide](./DEPLOYMENT.md) - Complete deployment instructions
- [Vercel Setup](./QUICK_VERCEL_SETUP.md) - Quick Vercel deployment guide
- [Deployment Commands](./DEPLOYMENT_COMMANDS.md) - CLI deployment reference

## 🌐 Page Routes

### Main App Pages
- `/` - Homepage with hero, search, and featured listings
- `/search` - Search and browse listings
- `/listings/[id]` - Listing detail page
- `/host` - Become a host page
- `/bookings` - User bookings (coming soon)
- `/dashboard` - User dashboard (coming soon)
- `/profile` - User profile (coming soon)

### Signup Pages
- `/coming-soon` - Landing page with countdown
- `/early-access` - Early access signup forms
- `/thank-you` - Thank you confirmation

### Legal Pages
- `/privacy` - Privacy policy
- `/terms` - Terms of service

## 🔒 Middleware & Routing

The app uses Next.js middleware to handle dual-site routing:

- **Signup subdomain** (`signup.vibesbnb.com`):
  - Shows only signup pages
  - Redirects root to `/coming-soon`
  - Blocks access to main app pages

- **Main app** (`vibesbnb.com`):
  - Shows full marketplace application
  - Homepage with search and listings
  - All features accessible

## 🤝 Contributing

This is a private MVP project. For questions or access, contact the development team.

## 📝 License

Proprietary - All rights reserved.

## 📞 Support

For questions or issues:
- Email: hello@vibesbnb.com
- Documentation: See docs in this repository

---

**Built with ❤️ and 🌿 by the VibesBNB Team**

Last Updated: November 2025
