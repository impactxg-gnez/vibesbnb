# Supabase Setup Guide

## Environment Variables

Create a `.env.local` file in the `apps/web` directory with the following variables:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# API Configuration (optional)
NEXT_PUBLIC_API_URL=http://localhost:3001

# Google Maps API (optional)
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key

# Stripe Configuration (optional)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
```

## Getting Your Supabase Credentials

1. Go to [https://supabase.com](https://supabase.com)
2. Create a new project or select an existing one
3. Go to Project Settings > API
4. Copy the `Project URL` and `anon public` key
5. Add them to your `.env.local` file

## Authentication Setup

The authentication is already configured to use:
- Email/Password authentication
- Email verification (can be disabled in Supabase dashboard)
- Automatic session management

## Database Tables

The app will automatically use Supabase's built-in `auth.users` table for authentication.
No additional tables are required for basic auth functionality.

