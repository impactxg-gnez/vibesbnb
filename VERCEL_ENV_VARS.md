# Vercel Environment Variables for VibesBNB

## Required Environment Variables

Add these environment variables to your **vibesbnb-web** Vercel project:

### 1. Google Maps API Key (Required for Location Features)
```
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
```

**Purpose:**
- Google Maps display in LocationPicker component
- Google Places Autocomplete for address search
- Google Geocoding API for converting addresses to coordinates and vice versa

**How to get:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable these APIs:
   - Maps JavaScript API
   - Places API
   - Geocoding API
4. Create credentials (API Key)
5. Restrict the key to your domain for security

### 2. Supabase Configuration (Required)
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

**Purpose:**
- Database connection
- Authentication
- Server-side operations

### 3. Optional Environment Variables
```
NEXT_PUBLIC_API_URL=your_api_url (if using external API)
NODE_ENV=production (automatically set by Vercel)
VERCEL=1 (automatically set by Vercel)
```

## How to Add in Vercel

1. Go to your Vercel dashboard
2. Select the **vibesbnb-web** project
3. Go to **Settings** → **Environment Variables**
4. Add each variable above
5. Make sure to select the correct environments (Production, Preview, Development)
6. Redeploy your application after adding variables

## Important Notes

- `NEXT_PUBLIC_*` variables are exposed to the browser - never put sensitive keys here
- `SUPABASE_SERVICE_ROLE_KEY` should be kept secret and only used server-side
- Google Maps API key should be restricted to your domain in Google Cloud Console
- After adding environment variables, you may need to redeploy for changes to take effect

