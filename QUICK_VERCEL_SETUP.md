# Quick Vercel Setup Guide

## 🎯 Goal
Deploy VibesBNB to two separate Vercel projects:
1. **vibesbnb-signup** - Early access signup pages
2. **vibesbnb-web** - Main application

---

## 📋 Prerequisites

1. Install Vercel CLI:
```bash
npm install -g vercel
```

2. Login to Vercel:
```bash
vercel login
```

---

## 🚀 Quick Setup (5 Minutes)

### Step 1: Create Signup Project

```bash
cd apps/web
vercel
```

When prompted:
- **Set up and deploy?** → Yes
- **Which scope?** → Your team/personal account
- **Link to existing project?** → No
- **Project name?** → `vibesbnb-signup`
- **In which directory is your code?** → `./` (current directory)
- **Want to override settings?** → Yes
  - **Build Command:** `cd ../.. && npm run build -- --filter=@vibesbnb/web`
  - **Output Directory:** `.next`
  - **Install Command:** `cd ../.. && npm install`

**Add Environment Variables:**
```bash
vercel env add NEXT_PUBLIC_API_URL production
# Enter: https://api.vibesbnb.com

vercel env add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY production
# Enter: your_google_maps_key
```

---

### Step 2: Create Main Web Project

First, unlink from the signup project:
```bash
rm -rf .vercel
```

Then create new project:
```bash
vercel
```

When prompted:
- **Set up and deploy?** → Yes
- **Which scope?** → Your team/personal account
- **Link to existing project?** → No
- **Project name?** → `vibesbnb-web`
- **In which directory is your code?** → `./` (current directory)
- **Want to override settings?** → Yes
  - **Build Command:** `cd ../.. && npm run build -- --filter=@vibesbnb/web`
  - **Output Directory:** `.next`
  - **Install Command:** `cd ../.. && npm install`

**Add Environment Variables:**
```bash
vercel env add NEXT_PUBLIC_API_URL production
# Enter: https://api.vibesbnb.com

vercel env add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY production
# Enter: your_google_maps_key

vercel env add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY production
# Enter: your_stripe_key
```

---

## 🔄 Deploying Updates

### Deploy Signup Site Only
```bash
npm run deploy:signup
```

### Deploy Main Web App Only
```bash
npm run deploy:web
```

### Deploy Both Projects
```bash
npm run deploy:all
```

---

## 🌐 Configure Domains

### For Signup Site
1. Go to Vercel Dashboard → vibesbnb-signup → Settings → Domains
2. Add: `signup.vibesbnb.com`
3. Follow DNS instructions

### For Main Site
1. Go to Vercel Dashboard → vibesbnb-web → Settings → Domains
2. Add: `www.vibesbnb.com` or `vibesbnb.com`
3. Follow DNS instructions

---

## ✅ Verify Deployment

### Signup Site
Visit: `https://vibesbnb-signup.vercel.app/coming-soon`

Pages to check:
- `/coming-soon` - Landing page ✓
- `/early-access?category=host` - Signup form ✓
- `/thank-you?category=host` - Thank you page ✓

### Main Web App
Visit: `https://vibesbnb-web.vercel.app`

Pages to check:
- `/` - Homepage ✓
- `/search` - Search page ✓
- `/listings/123` - Listing detail ✓

---

## 🔧 Troubleshooting

### Build Fails
**Error:** `Module not found: Can't resolve '@vibesbnb/shared'`

**Fix:**
```bash
# In Vercel project settings, update:
Install Command: cd ../.. && npm install
Build Command: cd ../.. && npm run build -- --filter=@vibesbnb/web
```

### Environment Variables Not Working
**Fix:**
1. Add variables in Vercel Dashboard
2. Make sure they start with `NEXT_PUBLIC_` for client-side access
3. Redeploy: `vercel --prod`

### Wrong Pages Showing
**Fix:** Make sure you're deploying to the correct project:
```bash
# Check current project
cat .vercel/project.json

# Re-link if needed
vercel link --project=vibesbnb-signup
```

---

## 📊 Monitor Deployments

### View Logs
```bash
vercel logs <deployment-url>
```

### View All Deployments
```bash
vercel list
```

### Check Project Status
Visit: https://vercel.com/dashboard

---

## 🎉 Next Steps

After successful deployment:

1. ✅ Test all pages on both sites
2. ✅ Configure custom domains
3. ✅ Set up analytics (Vercel Analytics)
4. ✅ Enable preview deployments for PRs
5. ✅ Set up monitoring alerts

---

## 💡 Pro Tips

### Automatic Deployments
Both projects auto-deploy when you push to main:
```bash
git push origin main
```

### Preview Deployments
Every PR gets a preview URL:
```bash
git checkout -b feature/new-feature
git push origin feature/new-feature
# Create PR → Get preview URL
```

### Rollback Deployments
If something breaks:
1. Go to Vercel Dashboard
2. Select the project
3. Click on a previous deployment
4. Click "Promote to Production"

---

## 📞 Support

- **Vercel Docs:** https://vercel.com/docs
- **Vercel Discord:** https://vercel.com/discord
- **VibesBNB Team:** hello@vibesbnb.com

---

**Last Updated:** November 2025

