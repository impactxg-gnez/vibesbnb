# VibesBNB Signup

Early access landing pages for VibesBNB - The 420-friendly travel marketplace.

## 📋 What's Included

This repository contains the signup/landing pages for VibesBNB:

- **Coming Soon Page** (`/coming-soon`) - Countdown timer and early access signup
- **Early Access Forms** (`/early-access`) - Signup forms for different user categories:
  - Hosts
  - Travellers
  - Service Hosts
  - Dispensaries
- **Thank You Page** (`/thank-you`) - Post-signup confirmation

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

Visit http://localhost:3000/coming-soon

### Build for Production

```bash
npm run build
npm run start
```

## 📦 Deployment

### Deploy to Vercel

This project is configured for Vercel deployment:

```bash
# Deploy using the script
npm run deploy
```

Or connect your GitHub repository to Vercel for automatic deployments.

### Configuration

Set these environment variables in Vercel:

```
NEXT_PUBLIC_API_URL=https://your-api-url.com/api/v1
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
```

## 🏗️ Tech Stack

- **Framework**: Next.js 14
- **Styling**: Tailwind CSS
- **Language**: TypeScript
- **Deployment**: Vercel

## 📁 Project Structure

```
apps/web/
├── src/
│   ├── app/
│   │   ├── coming-soon/       # Landing page with countdown
│   │   ├── early-access/      # Signup forms
│   │   ├── thank-you/         # Confirmation page
│   │   ├── privacy/           # Privacy policy
│   │   └── terms/             # Terms of service
│   ├── components/
│   │   └── layout/            # Header, Footer, etc.
│   ├── contexts/              # React contexts
│   └── lib/                   # API client and utilities
└── public/                    # Static assets
```

## 🎨 Features

- ✅ Responsive design
- ✅ Dark mode support
- ✅ Multiple signup categories
- ✅ Google Maps integration for location
- ✅ Form validation
- ✅ Firebase integration for signup data
- ✅ Beautiful animations

## 🔧 Development

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run test         # Run tests
npm run deploy       # Deploy to Vercel
```

## 📚 Documentation

For deployment guides and detailed setup instructions, see:

- `DEPLOYMENT_SETUP_COMPLETE.md` - Complete deployment guide
- `QUICK_VERCEL_SETUP.md` - Quick Vercel setup
- `DEPLOYMENT_COMMANDS.md` - Command reference

## 🌐 Domains

- **Production**: https://signup.vibesbnb.com
- **Staging**: https://vibesbnb-signup.vercel.app

## 🤝 Contributing

This is a private repository for VibesBNB. Contact the team for access.

## 📝 License

Proprietary - All rights reserved

## 📧 Contact

Questions? Reach out at hello@vibesbnb.com

---

**Launch Date**: April 20, 2026 at 12:00 PM PST 🚀
