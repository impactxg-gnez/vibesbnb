# VibesBNB 🌿

The complete 420-friendly travel marketplace connecting travelers with cannabis-welcoming accommodations and wellness experiences.

## 🌟 Features

### For Travelers
- **Search & Browse** - Find perfect 420-friendly accommodations by location, dates, and preferences
- **Detailed Listings** - View property details, amenities, photos, and reviews
- **Category Exploration** - Browse by Wellness Retreats, Adventure, City, Beach, Mountain, and Unique Spaces
- **Secure Booking** - Safe booking process with verified hosts
- **Reviews & Ratings** - Read authentic reviews from other travelers

### For Hosts
- **List Your Space** - Create and manage property listings
- **Flexible Pricing** - Set your own rates and availability
- **Cannabis-Friendly** - Connect with guests who appreciate 420-welcoming spaces
- **Host Protection** - Insurance and support included
- **Earnings Dashboard** - Track bookings and income

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/impactxg-gnez/vibesbnb.git
cd vibesbnb

# Install dependencies
npm install

# Run development server
npm run dev
```

Visit http://localhost:3000

### Build for Production

```bash
npm run build
npm run start
```

## 📁 Project Structure

```
vibesbnb/
├── apps/
│   └── web/                    # Next.js frontend application
│       ├── src/
│       │   ├── app/           # App router pages
│       │   │   ├── page.tsx          # Homepage
│       │   │   ├── search/           # Search page
│       │   │   ├── listings/         # Listing details
│       │   │   ├── host/             # Host landing
│       │   │   ├── coming-soon/      # Pre-launch page
│       │   │   └── early-access/     # Signup forms
│       │   ├── components/    # React components
│       │   │   ├── home/             # Homepage components
│       │   │   ├── search/           # Search components
│       │   │   └── layout/           # Layout components
│       │   └── lib/          # Utilities
│       └── middleware.ts      # Route middleware
├── packages/
│   └── shared/                # Shared types and utilities
└── README.md
```

## 🎨 Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Deployment**: Vercel
- **Images**: Next.js Image Optimization

## 📄 Pages

### Main App
- `/` - Homepage with Hero, Search Bar, Categories, Featured Listings
- `/search` - Browse and filter listings
- `/listings/[id]` - Individual listing details with booking
- `/host` - Become a host landing page

### Pre-Launch
- `/coming-soon` - Early access landing page
- `/early-access` - Signup forms for hosts, travelers, services
- `/thank-you` - Post-signup confirmation

### Legal
- `/privacy` - Privacy policy
- `/terms` - Terms of service

## 🎨 Design Features

- **Mobile-First**: Responsive design optimized for all devices
- **Modern UI**: Clean, intuitive interface with Tailwind CSS
- **Cannabis-Friendly Branding**: Green color scheme (#16a34a)
- **Image Optimization**: Unsplash integration with Next.js Image
- **Smooth Animations**: Hover effects and transitions

## 🚀 Deployment

### Deploy to Vercel

#### Via Vercel Dashboard

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import repository: `impactxg-gnez/vibesbnb`
3. Configure:
   - **Project Name**: `vibesbnb-web`
   - **Framework**: Next.js
   - **Root Directory**: `apps/web`
   - **Build Command**: `cd ../.. && npm run build -- --filter=@vibesbnb/web`
   - **Output Directory**: `.next`
   - **Install Command**: `cd ../.. && npm install`
4. Add environment variables (see below)
5. Deploy!

#### Via Vercel CLI

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

```env
NEXT_PUBLIC_API_URL=https://your-api-url.com
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
```

## 🧪 Development

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm run start

# Run linter
npm run lint
```

## 🎯 Component Architecture

### Homepage Components

**Hero** - Main hero section with CTA buttons
- Gradient background
- "Explore Listings" and "Become a Host" CTAs

**SearchBar** - Property search widget
- Location, check-in/out dates, guests
- URL parameter-based search

**WellnessCategories** - Category grid
- 6 clickable category cards
- Icons and descriptions

**FeaturedListings** - Property showcase
- 4 featured properties
- Ratings, pricing, locations

**HowItWorks** - Process explanation
- 4-step guide
- Call-to-action section

## 🔍 Features Coming Soon

- User authentication and profiles
- Real-time booking system
- Host dashboard
- Messaging between hosts and guests
- Payment processing with Stripe
- Reviews and ratings system
- Advanced search filters
- Map view integration

## 📝 License

Proprietary - All rights reserved.

## 📞 Support

For questions or issues:
- Email: hello@vibesbnb.com
- Repository: https://github.com/impactxg-gnez/vibesbnb

---

**Built with ❤️ and 🌿 by the VibesBNB Team**

Last Updated: November 2025
