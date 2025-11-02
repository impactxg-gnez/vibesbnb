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
- **Legal Pages** - Privacy policy and Terms of service

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

Or via Vercel CLI:

```bash
vercel --prod
```

Or via Vercel Dashboard:
1. Import this repository
2. Project name: `vibesbnb-signup`
3. Root directory: `apps/web`
4. Framework: Next.js
5. Build settings:
   ```
   Build Command: cd ../.. && npm run build -- --filter=@vibesbnb/web
   Output Directory: .next
   Install Command: cd ../.. && npm install
   ```

## 🌐 Pages

- `/` - Redirects to `/coming-soon`
- `/coming-soon` - Landing page with early access signup
- `/early-access?category=host` - Host signup form
- `/early-access?category=traveller` - Traveller signup form
- `/early-access?category=service_host` - Service host signup form
- `/early-access?category=dispensary` - Dispensary signup form
- `/thank-you?category=host` - Thank you confirmation page
- `/privacy` - Privacy policy
- `/terms` - Terms of service

## 🎨 Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Deployment**: Vercel
- **Backend**: Firebase (for signup storage)

## 📝 Environment Variables

```bash
NEXT_PUBLIC_API_URL=https://your-api-url.com
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_key
```

## 📖 Documentation

For the complete VibesBNB marketplace application, see the main repository.

## 🔒 License

Proprietary - All rights reserved.

## 📞 Support

For questions or issues:
- Email: hello@vibesbnb.com

---

**Part of the VibesBNB Platform**

Last Updated: November 2025
