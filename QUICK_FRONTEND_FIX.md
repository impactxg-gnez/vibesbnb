# Quick Fix: Show Listings on Frontend

## The Problem
Your frontend at https://vibesbnb-web.vercel.app/ doesn't have the backend API URL configured.

## The Solution (Pick One)

### Option 1: Vercel Dashboard (Recommended - Takes 2 minutes)

1. Go to: https://vercel.com/dashboard
2. Click on your **vibesbnb-web** project
3. Click **Settings** → **Environment Variables**
4. Click **Add New**
5. Add this variable:
   ```
   Key: NEXT_PUBLIC_API_URL
   Value: https://vibesbnb-api-431043141075.us-central1.run.app/api/v1
   ```
6. Check all environments (Production, Preview, Development)
7. Click **Save**
8. Go to **Deployments** tab
9. Click the ⋯ menu on latest deployment → **Redeploy**
10. Wait 30-60 seconds

After redeploying, refresh https://vibesbnb-web.vercel.app/ and you'll see all 12 listings!

### Option 2: Via Command Line (If you prefer CLI)

```bash
# Install Vercel CLI if you don't have it
npm i -g vercel

# Login
vercel login

# Navigate to web app
cd apps/web

# Add environment variable
vercel env add NEXT_PUBLIC_API_URL production
# When prompted, paste: https://vibesbnb-api-431043141075.us-central1.run.app/api/v1

# Also add for preview and development
vercel env add NEXT_PUBLIC_API_URL preview
vercel env add NEXT_PUBLIC_API_URL development

# Trigger a new deployment
vercel --prod
```

### Option 3: Update Local .env and Push (If connected to Git)

If your Vercel project is connected to GitHub:

1. Create `apps/web/.env.production`:
   ```
   NEXT_PUBLIC_API_URL=https://vibesbnb-api-431043141075.us-central1.run.app/api/v1
   ```

2. Commit and push:
   ```bash
   git add apps/web/.env.production
   git commit -m "Add production API URL"
   git push
   ```

3. Vercel will auto-deploy

## Verify It Worked

After redeploying:

1. Visit: https://vibesbnb-web.vercel.app/
2. Open Browser DevTools (F12)
3. Go to **Network** tab
4. Refresh the page
5. Look for a request to: `https://vibesbnb-api-431043141075.us-central1.run.app/api/v1/listings`
6. It should return 12 listings

You should see:
- ✅ 420-Friendly Mountain Retreats
- ✅ Yoga Studio Lofts  
- ✅ Beachfront Wellness Villas
- ✅ Desert Meditation Domes

## Still Not Working?

If you still don't see listings after redeploying:

### Check 1: Verify Environment Variable
```bash
# Check if variable is set
vercel env ls
```

### Check 2: Check Browser Console
1. Open DevTools (F12)
2. Look for errors in Console tab
3. Look for failed network requests in Network tab

### Check 3: Test API Directly
Open this in your browser:
https://vibesbnb-api-431043141075.us-central1.run.app/api/v1/listings

You should see JSON with 12 listings.

### Check 4: Hard Refresh
Sometimes browsers cache the old version:
- **Windows:** Ctrl + Shift + R
- **Mac:** Cmd + Shift + R

## Common Issues

### Issue: "CORS Error"
**Solution:** Already configured! Your backend allows requests from https://vibesbnb-web.vercel.app

### Issue: "404 Not Found"
**Solution:** Make sure the URL ends with `/api/v1` (not `/api/v1/` with trailing slash)

### Issue: Environment Variable Not Loading
**Solution:** Make sure you redeployed AFTER adding the variable. Environment variables only apply to new builds.

---

**Once you complete this, your app will be fully functional!** 🎉

