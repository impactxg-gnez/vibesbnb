# VibesBNB - Deployment Guide

This document provides complete instructions for deploying the VibesBNB MVP to production.

## Prerequisites

Before deploying, ensure you have:

1. **Firebase Project**
   - Create a project at https://console.firebase.google.com
   - Enable Firestore Database
   - Generate service account credentials

2. **Stripe Account**
   - Sign up at https://stripe.com
   - Get API keys (publishable and secret)
   - Set up Stripe Connect for host payouts

3. **AWS Account** (for S3 storage)
   - Create an S3 bucket for media storage
   - Generate IAM credentials with S3 access

4. **SendGrid Account** (for emails)
   - Sign up at https://sendgrid.com
   - Generate API key

5. **Twilio Account** (optional, for SMS)
   - Sign up at https://twilio.com
   - Get Account SID and Auth Token

6. **Google Maps API Key**
   - Enable Geocoding API and Maps JavaScript API
   - Get API key from Google Cloud Console

7. **KYC Provider** (Veriff or Jumio)
   - Sign up for chosen provider
   - Get API credentials

## Environment Configuration

### Backend (.env for apps/api)

```bash
# App
NODE_ENV=production
PORT=3001
APP_URL=https://vibesbnb.com
API_URL=https://api.vibesbnb.com

# JWT
JWT_SECRET=<generate-strong-random-secret>
JWT_REFRESH_SECRET=<generate-strong-random-secret>
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Firebase
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-service-account-email
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_STORAGE_BUCKET=your-bucket.appspot.com

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# KYC
ENABLE_KYC=true
KYC_PROVIDER=veriff
VERIFF_API_KEY=your-veriff-key

# Google Maps
GOOGLE_MAPS_API_KEY=your-google-maps-key

# Email & SMS
SENDGRID_API_KEY=your-sendgrid-key
SENDGRID_FROM_EMAIL=noreply@vibesbnb.com
TWILIO_ACCOUNT_SID=your-twilio-sid
TWILIO_AUTH_TOKEN=your-twilio-token
TWILIO_FROM_PHONE=+1234567890

# S3 Storage
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=us-east-1
AWS_S3_BUCKET=vibesbnb-media
CDN_URL=https://cdn.vibesbnb.com

# Redis
REDIS_HOST=your-redis-host
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password

# Feature Flags
ENABLE_INSTANT_BOOK=true
PLATFORM_FEE_PERCENT=10
```

### Frontend (.env.local for apps/web)

```bash
NEXT_PUBLIC_API_URL=https://api.vibesbnb.com/api/v1
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your-google-maps-key
```

## Local Development

1. **Install dependencies:**
```bash
npm install
```

2. **Start infrastructure services:**
```bash
npm run docker:up
```

3. **Seed database:**
```bash
npm run seed
```

4. **Start development servers:**
```bash
npm run dev
```

Access:
- Frontend: http://localhost:3000
- API: http://localhost:3001
- API Docs: http://localhost:3001/api/docs

## Docker Deployment

### Build images:
```bash
docker build -f docker/api.Dockerfile -t vibesbnb-api .
docker build -f docker/web.Dockerfile -t vibesbnb-web .
```

### Run with Docker Compose:
```bash
docker-compose up -d
```

## Cloud Deployment Options

### Option 1: AWS (Recommended for Production)

**Infrastructure:**
- ECS Fargate for containers
- RDS for managed Redis (ElastiCache)
- S3 for media storage
- CloudFront for CDN
- Route53 for DNS
- ALB for load balancing
- Certificate Manager for SSL

**Deployment Steps:**
1. Push Docker images to ECR
2. Create ECS cluster and task definitions
3. Configure ALB with target groups
4. Setup CloudFront distribution
5. Configure environment variables in ECS task definitions

### Option 2: Google Cloud Platform

**Infrastructure:**
- Cloud Run for containers
- Cloud SQL for database
- Cloud Storage for media
- Cloud CDN
- Cloud Load Balancing

### Option 3: Azure

**Infrastructure:**
- Container Apps
- Azure Database for PostgreSQL
- Blob Storage
- Azure CDN
- Application Gateway

## Firebase Security Rules

Deploy these Firestore security rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read their own data
    match /users/{userId} {
      allow read: if request.auth != null && request.auth.uid == userId;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Listings are publicly readable
    match /listings/{listingId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    
    // Bookings - users can only access their own
    match /bookings/{bookingId} {
      allow read: if request.auth != null && 
        (resource.data.guestId == request.auth.uid || 
         resource.data.hostId == request.auth.uid);
      allow write: if request.auth != null;
    }
    
    // Admin-only collections
    match /audit_logs/{logId} {
      allow read, write: if request.auth != null && 
        request.auth.token.role == 'admin';
    }
  }
}
```

## Post-Deployment Checklist

- [ ] Configure Stripe webhooks endpoint
- [ ] Setup SSL certificates
- [ ] Configure CORS properly
- [ ] Enable CDN caching
- [ ] Setup monitoring (CloudWatch/Datadog)
- [ ] Configure log aggregation
- [ ] Setup error tracking (Sentry)
- [ ] Test payment flows end-to-end
- [ ] Test KYC verification flow
- [ ] Verify email/SMS notifications
- [ ] Test iCal sync functionality
- [ ] Configure backups
- [ ] Setup CI/CD pipeline
- [ ] Run security audit
- [ ] Load testing
- [ ] Create admin accounts

## Monitoring & Observability

**Recommended Tools:**
- **Application Monitoring**: New Relic or Datadog
- **Error Tracking**: Sentry
- **Log Management**: CloudWatch Logs or LogDNA
- **Uptime Monitoring**: Pingdom or UptimeRobot
- **Performance**: Google Lighthouse CI

**Key Metrics to Monitor:**
- API response times
- Error rates
- Booking conversion rate
- Payment success rate
- Database query performance
- CDN hit rate
- User sign-up rate
- KYC approval rate

## Backup & Disaster Recovery

1. **Firebase Firestore:**
   - Enable automatic backups
   - Export data regularly to Cloud Storage

2. **Media Files:**
   - Enable S3 versioning
   - Configure lifecycle policies

3. **Disaster Recovery Plan:**
   - Document recovery procedures
   - Test recovery quarterly
   - Maintain off-site backups

## Scaling Considerations

**Horizontal Scaling:**
- API can scale horizontally (stateless)
- Use load balancer to distribute traffic
- Redis for session management

**Database Scaling:**
- Firestore auto-scales
- Consider composite indexes for complex queries
- Monitor read/write quotas

**CDN & Caching:**
- Cache static assets aggressively
- Use CloudFront/CDN for media
- Implement Redis caching for API responses

## Security Hardening

- Enable rate limiting
- Implement DDoS protection (CloudFlare)
- Regular security audits
- Keep dependencies updated
- Enable 2FA for admin accounts
- Encrypt sensitive data at rest
- Use secrets manager for credentials
- Implement CORS properly
- Add security headers
- Regular penetration testing

## Support & Maintenance

**Regular Tasks:**
- Weekly: Review error logs
- Monthly: Security updates
- Quarterly: Performance audit
- Annually: Major version upgrades

**Documentation:**
- Maintain API documentation
- Update runbooks
- Document incidents
- Keep deployment guide current

## Troubleshooting

**Common Issues:**

1. **Payment failures:**
   - Check Stripe webhook configuration
   - Verify API keys
   - Check webhook signature validation

2. **KYC not working:**
   - Verify provider API credentials
   - Check webhook endpoints
   - Review provider dashboard

3. **Email/SMS not sending:**
   - Verify SendGrid/Twilio credentials
   - Check sender verification
   - Review quota limits

4. **iCal sync issues:**
   - Verify calendar URLs are accessible
   - Check cron job configuration
   - Review sync logs

## Cost Optimization

**Tips to reduce costs:**
- Use CDN caching effectively
- Optimize image sizes
- Clean up unused resources
- Use reserved instances for predictable load
- Implement auto-scaling
- Monitor and optimize database queries

## Legal & Compliance

- Ensure GDPR compliance
- Implement data export/deletion endpoints
- Display appropriate disclaimers
- Comply with local cannabis/wellness regulations
- Maintain terms of service
- Regular compliance audits

---

For questions or issues, refer to the main README.md or contact the development team.


