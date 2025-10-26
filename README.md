# VibesBNB 🌿

A production-ready, mobile-first marketplace for wellness and 420-friendly short-stay travel.

## Features

### For Guests
- Search listings by location, dates, guests, and wellness filters
- View detailed listings with galleries, amenities, reviews
- Instant or request-to-book with Stripe payments
- Real-time messaging with hosts
- Trip management and reviews

### For Hosts
- KYC verification and onboarding
- Create and manage listings
- Two-way iCal calendar synchronization
- Booking management (auto-accept or manual review)
- Stripe Connect for automatic payouts
- Dashboard with earnings and occupancy metrics

### For Admins
- Host/listing verification and approval
- Content moderation
- Metrics dashboard (GMV, users, bookings)
- Audit logs and reporting

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React, Tailwind CSS
- **Backend**: NestJS, Node.js
- **Database**: Firebase Firestore
- **Auth**: JWT with refresh tokens
- **Real-time**: Socket.io (WebSockets)
- **Payments**: Stripe (Cards, Apple/Google Pay, Connect)
- **Storage**: AWS S3 (or compatible)
- **Queue**: BullMQ + Redis
- **Email/SMS**: SendGrid + Twilio
- **Maps**: Google Maps API
- **KYC**: Veriff/Jumio (pluggable)

## Quick Start

### Prerequisites
- Node.js 18+
- Docker & Docker Compose
- Firebase project
- Stripe account

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/vibesbnb.git
cd vibesbnb
```

2. Install dependencies:
```bash
npm install
```

3. Copy environment variables:
```bash
cp .env.example .env
```

4. Configure your `.env` file with API keys and credentials.

5. Start infrastructure services (Redis, etc.):
```bash
npm run docker:up
```

6. Run development servers:
```bash
npm run dev
```

The app will be available at:
- Frontend: http://localhost:3000
- API: http://localhost:3001
- Admin: http://localhost:3000/admin

### Seed Demo Data

```bash
npm run seed
```

This creates:
- 3 demo hosts with verified KYC
- 12 listings with images
- 20 sample bookings

## Project Structure

```
vibesbnb/
├── apps/
│   ├── web/              # Next.js frontend (guest + host + admin)
│   └── api/              # NestJS backend API
├── packages/
│   ├── shared/           # Shared types, constants, utilities
│   └── ui/               # Shared UI components
├── infrastructure/       # Terraform/CDK configs
└── docker/              # Docker configurations
```

## Testing

```bash
# Run all tests
npm test

# API tests only
npm run test:api

# Web tests only
npm run test:web
```

## Deployment

### Docker

Build and run with Docker Compose:

```bash
docker-compose up --build
```

### Cloud Deployment

One-click deployment configurations included for:
- AWS (ECS + RDS + S3)
- GCP (Cloud Run + Cloud SQL + GCS)
- Azure (Container Apps + PostgreSQL + Blob Storage)

See `infrastructure/` directory for IaC templates.

## Security & Compliance

- TLS/HTTPS everywhere
- PII encryption at rest
- Rate limiting and DDoS protection
- Audit logging for sensitive operations
- GDPR-compliant data export/deletion
- Content moderation queue
- Legal disclaimers for jurisdiction-specific regulations

## API Documentation

API documentation available at `/api/docs` when running in development mode.

## License

MIT

## Support

For questions or issues, please open a GitHub issue or contact support@vibesbnb.com


