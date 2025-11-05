# Connect vibesbnb-web to GitHub Repository

## 🎯 Current Status

**Vercel Project**: vibesbnb-web (https://vercel.com/kevals-projects-6dce5dc6/vibesbnb-web)
**GitHub Repository**: https://github.com/impactxg-gnez/vibesbnb
**Status**: ⚠️ Not Connected - Needs Git Integration

## 🔗 How to Connect

### Step 1: Connect Git Repository

1. Go to your Vercel project: https://vercel.com/kevals-projects-6dce5dc6/vibesbnb-web
2. Click **"Connect Git"** button (visible on the overview page)
3. Select **GitHub** as your Git provider
4. Search for and select: `impactxg-gnez/vibesbnb`
5. Click **Connect**

### Step 2: Configure Build Settings

After connecting, configure these settings:

**Project Settings**:
- **Framework Preset**: Next.js
- **Root Directory**: `apps/web`
- **Build Command**: `cd ../.. && npm run build -- --filter=@vibesbnb/web`
- **Output Directory**: `.next`
- **Install Command**: `cd ../.. && npm install`

### Step 3: Environment Variables

Add these in Settings → Environment Variables:

```
NEXT_PUBLIC_API_URL=https://your-api-url.com
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_key
```

### Step 4: Deploy

Once connected, Vercel will:
1. Automatically detect the latest commit on main branch
2. Start building
3. Deploy to production

Or manually trigger: Click **"Redeploy"** from Deployments tab

## ✅ After Connection

Future git pushes to `main` branch will automatically:
- Trigger new deployment
- Build the app
- Deploy to production
- Update https://vibesbnb-web.vercel.app

## 🚀 What Will Be Deployed

The complete VibesBNB marketplace with:
- ✅ Homepage with Hero, SearchBar, Categories, Featured Listings, How It Works
- ✅ Search page with property grid
- ✅ Listing detail pages with booking widget
- ✅ Host landing page
- ✅ All components and layouts

## 📊 Verify Connection

After connecting, check:
1. Settings → Git → Should show "impactxg-gnez/vibesbnb"
2. Deployments → Should show latest commit deploying
3. Production URL → Should load the new homepage

---

**Repository**: https://github.com/impactxg-gnez/vibesbnb
**Vercel Project**: https://vercel.com/kevals-projects-6dce5dc6/vibesbnb-web

