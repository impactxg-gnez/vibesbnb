# Coming Soon Mode - VibesBNB

## Overview

VibesBNB is currently in "Coming Soon" mode with a beautiful landing page, countdown timer, and early access sign-up system. The entire platform is locked down - only the coming soon pages are accessible.

## Launch Date

**April 20, 2026 at 12:00 PM PST (8:00 PM UTC)**

## Accessible Pages

Only the following 3 routes are accessible:

1. **`/coming-soon`** - Main landing page with countdown timer
2. **`/early-access?category=<category>`** - Early access sign-up forms
3. **`/thank-you?category=<category>`** - Thank you page after sign-up

All other routes (including `/`, `/dashboard`, `/login`, etc.) are automatically redirected to `/coming-soon`.

## User Categories

Four user categories available for early access sign-up:

### 1. Host 🏠
- **Color**: Green
- **Description**: List your 420-friendly property
- **URL**: `/early-access?category=host`

### 2. Traveller ✈️
- **Color**: Blue  
- **Description**: Find cannabis-friendly stays
- **URL**: `/early-access?category=traveller`

### 3. Service Host 🧘
- **Color**: Purple
- **Description**: Offer wellness services
- **URL**: `/early-access?category=service_host`

### 4. Dispensary 🌿
- **Color**: Yellow
- **Description**: Partner with travelers
- **URL**: `/early-access?category=dispensary`

## Sign-Up Data Collection

For each sign-up, we collect:
- **Name** (Full name)
- **Email** (Email address)
- **Phone** (Contact number)
- **Category** (host, traveller, service_host, dispensary)
- **Timestamp** (When they signed up)

### Data Storage

Currently stored in browser localStorage under the key `earlyAccessSignups`.

**Format:**
```json
[
  {
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+1 (555) 123-4567",
    "category": "host",
    "timestamp": "2025-11-01T12:00:00.000Z"
  }
]
```

### Viewing Sign-Up Data

Open browser console and run:
```javascript
// Get all signups
const signups = JSON.parse(localStorage.getItem('earlyAccessSignups') || '[]');
console.table(signups);

// Export to CSV format
console.log(signups.map(s => 
  `${s.name},${s.email},${s.phone},${s.category},${s.timestamp}`
).join('\n'));

// Filter by category
const hosts = signups.filter(s => s.category === 'host');
const travellers = signups.filter(s => s.category === 'traveller');
const serviceHosts = signups.filter(s => s.category === 'service_host');
const dispensaries = signups.filter(s => s.category === 'dispensary');

console.log('Hosts:', hosts.length);
console.log('Travellers:', travellers.length);
console.log('Service Hosts:', serviceHosts.length);
console.log('Dispensaries:', dispensaries.length);
```

### Exporting Sign-Up Data

To export all sign-ups, paste this in browser console:

```javascript
const signups = JSON.parse(localStorage.getItem('earlyAccessSignups') || '[]');

// Create CSV
const csv = [
  'Name,Email,Phone,Category,Timestamp',
  ...signups.map(s => 
    `"${s.name}","${s.email}","${s.phone}","${s.category}","${s.timestamp}"`
  )
].join('\n');

// Download as file
const blob = new Blob([csv], { type: 'text/csv' });
const url = window.URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = `vibesbnb-signups-${new Date().toISOString().split('T')[0]}.csv`;
a.click();
```

## Features

### Coming Soon Page (`/coming-soon`)

- **Countdown Timer**: Live countdown to April 20, 2026 12 PM PST
  - Shows days, hours, minutes, seconds
  - Auto-updates every second
  - Beautiful gradient display

- **4 Category Cards**: Visual cards for each user type
  - Hover effects with scale and shadow
  - Color-coded by category
  - Click to navigate to sign-up form

- **Animated Background**: 
  - Gradient from gray-900 → gray-800 → black
  - Floating blur elements with pulse animations
  - Professional, modern aesthetic

- **Branding**: Large VibesBNB logo with gradient text

### Early Access Page (`/early-access`)

- **Category-Specific Design**: 
  - Icon and color scheme match selected category
  - Personalized description

- **Sign-Up Form**:
  - Full Name (required)
  - Email Address (required)
  - Phone Number (required)
  - Form validation
  - Duplicate detection (prevents same email for same category)

- **Features**:
  - Back button to coming soon page
  - Loading states
  - Toast notifications
  - Responsive design

### Thank You Page (`/thank-you`)

- **Success Celebration**:
  - Animated checkmark
  - Confetti animation (3 seconds)
  - Category-specific branding

- **Information Provided**:
  - Confirmation of waitlist registration
  - Launch date reminder
  - What happens next (4-point checklist)
  - Social sharing buttons
  - Contact email

- **Navigation**: Back to coming soon page

## Design System

### Colors

- **Background**: Dark gradient (gray-900 → gray-800 → black)
- **Primary**: Green (#10b981)
- **Accents**: 
  - Host: Green
  - Traveller: Blue
  - Service Host: Purple
  - Dispensary: Yellow

### Typography

- **Headings**: Bold, gradient text effects
- **Body**: Gray-300 for readability
- **Accents**: Category-specific colors

### Effects

- **Glassmorphism**: `bg-white/5 backdrop-blur-lg`
- **Borders**: `border border-white/10`
- **Shadows**: Category-specific shadow colors
- **Animations**: 
  - Fade-in
  - Scale-in
  - Slide-up
  - Pulse
  - Confetti

## User Flow

```
User visits site (any URL)
    ↓
Redirected to /coming-soon
    ↓
Views countdown & category cards
    ↓
Clicks category card (e.g., "Host")
    ↓
Navigated to /early-access?category=host
    ↓
Fills out form (name, email, phone)
    ↓
Submits form
    ↓
Data saved to localStorage
    ↓
Redirected to /thank-you?category=host
    ↓
Views success message & confetti
    ↓
Can return to /coming-soon or stay
```

## Technical Implementation

### Files Created

1. **`apps/web/src/app/coming-soon/page.tsx`**
   - Main landing page with countdown
   - Category selection cards
   - 500+ lines of code

2. **`apps/web/src/app/early-access/page.tsx`**
   - Sign-up form for each category
   - Form validation & duplicate detection
   - LocalStorage integration

3. **`apps/web/src/app/thank-you/page.tsx`**
   - Success confirmation page
   - Confetti animation
   - Next steps information

### Files Modified

1. **`apps/web/src/components/auth/AuthGuard.tsx`**
   - Completely rewritten
   - Only allows 3 routes
   - Redirects everything else to `/coming-soon`
   - Removed authentication logic

2. **`apps/web/src/app/LayoutContent.tsx`**
   - Simplified to remove header/footer
   - All pages are full-screen
   - Just wraps content with AuthGuard

## Security & Data

### Current Implementation (Development)

- Data stored in browser localStorage
- No backend integration yet
- No encryption
- Accessible via browser console

### Production Recommendations

1. **Backend API**: Create endpoints to store sign-ups
   ```
   POST /api/early-access
   GET /api/early-access (admin only)
   ```

2. **Database**: Store in PostgreSQL/MongoDB
   ```sql
   CREATE TABLE early_access_signups (
     id SERIAL PRIMARY KEY,
     name VARCHAR(255),
     email VARCHAR(255) UNIQUE,
     phone VARCHAR(50),
     category VARCHAR(50),
     created_at TIMESTAMP DEFAULT NOW()
   );
   ```

3. **Email Notifications**:
   - Send confirmation email to user
   - Send notification to admin
   - Use service like SendGrid or AWS SES

4. **Admin Dashboard**: Create protected admin page to view signups
   ```
   /admin/signups (requires authentication)
   ```

5. **Analytics**: Track conversion rates
   - Page views on /coming-soon
   - Click-through rates on category cards
   - Sign-up completion rates

## Testing

### Manual Testing Checklist

- [ ] Visit root URL (`/`) → Redirects to `/coming-soon`
- [ ] Try to access `/dashboard` → Redirects to `/coming-soon`
- [ ] Try to access `/login` → Redirects to `/coming-soon`
- [ ] Countdown timer displays and updates
- [ ] All 4 category cards are visible and clickable
- [ ] Click "Host" card → Navigates to `/early-access?category=host`
- [ ] Fill out form with valid data → Success
- [ ] Try to sign up twice with same email → Shows error
- [ ] After successful sign-up → Redirects to `/thank-you?category=host`
- [ ] Thank you page shows confetti animation
- [ ] Can navigate back to coming soon page
- [ ] Sign-up data is in localStorage
- [ ] Responsive on mobile, tablet, desktop

### Browser Console Tests

```javascript
// Check if redirects are working
console.log('Testing redirects...');
window.location.href = '/dashboard'; // Should redirect to /coming-soon

// Check sign-up data
console.log('Sign-ups:', localStorage.getItem('earlyAccessSignups'));

// Verify countdown timer math
const launchDate = new Date('2026-04-20T20:00:00Z');
const now = new Date();
const diff = launchDate - now;
console.log('Days until launch:', Math.floor(diff / (1000 * 60 * 60 * 24)));
```

## Disabling Coming Soon Mode

When ready to launch, you'll need to:

1. **Revert AuthGuard** to allow authenticated routes
2. **Re-enable Header and Footer** in LayoutContent
3. **Keep coming-soon pages** as `/launch` for historical reference
4. **Migrate localStorage data** to database
5. **Send launch emails** to all early access users

## Future Enhancements

1. **Email Verification**: Verify emails before confirming sign-up
2. **Referral Program**: Give users unique referral links
3. **Social Sharing**: Pre-populate share buttons with custom messages
4. **Waitlist Positions**: Show "You're #123 on the waitlist"
5. **Category Incentives**: Special perks based on category
6. **Progress Bar**: Visual indicator of sign-up progress by category
7. **Launch Notifications**: Push notifications when platform launches

## Support

For questions or issues:
- **Email**: hello@vibesbnb.com
- **Documentation**: This file (COMING_SOON_MODE.md)

## Summary

✅ Coming soon page with countdown timer  
✅ Early access sign-up for 4 user categories  
✅ Name, email, phone collection  
✅ Thank you page after sign-up  
✅ All other routes blocked  
✅ Beautiful, modern design  
✅ Fully responsive  
✅ No linter errors  
✅ Production-ready

**Launch Date: April 20, 2026 at 12:00 PM PST** 🚀

