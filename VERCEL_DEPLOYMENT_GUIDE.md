# Vercel Deployment Guide - VibesBNB

This guide explains how to deploy VibesBNB to two separate Vercel projects:
1. **vibesbnb-signup** - Early access/signup pages
2. **vibesbnb-web** - Main application

## Architecture

Both deployments use the same `apps/web` Next.js application, but serve different purposes:

### vibesbnb-signup (Signup Pages)
- **Domain**: `signup.vibesbnb.com` (or custom domain)
- **Pages**: `/coming-soon`, `/early-access`, `/thank-you`
- **Purpose**: Pre-launch landing page and early access signup

### vibesbnb-web (Main Application)
- **Domain**: `www.vibesbnb.com` (or custom domain)
- **Pages**: All app pages (home, dashboard, listings, bookings, etc.)
- **Purpose**: Main VibesBNB application

---

## Step 1: Deploy Signup Project

### Create New Vercel Project

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **"Add New Project"**
3. Import your Git repository
4. Configure the project:

**Project Settings:**
```
Project Name: vibesbnb-signup
Framework Preset: Next.js
Root Directory: apps/web
Build Command: cd ../.. && npm run build -- --filter=@vibesbnb/web
Output Directory: .next
Install Command: cd ../.. && npm install
```

**Environment Variables:**
```
NEXT_PUBLIC_API_URL=https://api.vibesbnb.com
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_key
```

5. Click **"Deploy"**

### Configure Custom Domain (Optional)

1. In Vercel project settings, go to **Domains**
2. Add domain: `signup.vibesbnb.com`
3. Update your DNS records as instructed by Vercel

---

## Step 2: Deploy Main Web Project

### Create Second Vercel Project

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **"Add New Project"**
3. Import the **same** Git repository
4. Configure the project:

**Project Settings:**
```
Project Name: vibesbnb-web
Framework Preset: Next.js
Root Directory: apps/web
Build Command: cd ../.. && npm run build -- --filter=@vibesbnb/web
Output Directory: .next
Install Command: cd ../.. && npm install
```

**Environment Variables:**
```
NEXT_PUBLIC_API_URL=https://api.vibesbnb.com
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_key
```

5. Click **"Deploy"**

### Configure Custom Domain (Optional)

1. In Vercel project settings, go to **Domains**
2. Add domain: `www.vibesbnb.com` or `vibesbnb.com`
3. Update your DNS records as instructed by Vercel

---

## Step 3: Configure Branch Deployments

### For Both Projects

In each Vercel project settings:

1. Go to **Git** settings
2. Configure which branches to auto-deploy:
   - **Production Branch**: `main`
   - **Preview Branches**: `develop`, `staging` (optional)

---

## Step 4: Environment Variables

Make sure to add all necessary environment variables to both projects:

### Common Variables (Both Projects)
```bash
NEXT_PUBLIC_API_URL=https://api.vibesbnb.com
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_key_here
```

### Main App Only (vibesbnb-web)
```bash
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_key
NEXT_PUBLIC_SOCKET_URL=wss://api.vibesbnb.com
```

You can copy environment variables between projects using Vercel CLI:
```bash
vercel env pull .env.local --environment=production
```

---

## Step 5: Deploy Commands

### Using Vercel CLI

Install Vercel CLI if you haven't:
```bash
npm i -g vercel
```

### Link Projects

**For Signup Project:**
```bash
cd apps/web
vercel link --project=vibesbnb-signup
vercel --prod
```

**For Main Web Project:**
```bash
cd apps/web
vercel link --project=vibesbnb-web
vercel --prod
```

---

## Step 6: Configure Redirects (Optional)

If you want the signup pages to redirect to the main site after launch:

**In apps/web/next.config.js**, add:

```javascript
module.exports = {
  async redirects() {
    // Only enable this after launch
    if (process.env.NEXT_PUBLIC_LAUNCH_MODE === 'live') {
      return [
        {
          source: '/coming-soon',
          destination: '/',
          permanent: false,
        },
      ];
    }
    return [];
  },
};
```

---

## Deployment Workflow

### Automatic Deployments

Both projects will automatically deploy when you push to `main`:

```bash
git add .
git commit -m "Update: feature description"
git push origin main
```

Vercel will:
1. Deploy to **vibesbnb-signup** 
2. Deploy to **vibesbnb-web**
3. Both deployments happen simultaneously

### Manual Deployments

**Deploy Signup Site:**
```bash
cd apps/web
vercel --prod --scope=vibesbnb-signup
```

**Deploy Main Site:**
```bash
cd apps/web
vercel --prod --scope=vibesbnb-web
```

---

## Testing

### Preview Deployments

Every branch/PR gets automatic preview URLs:
- `vibesbnb-signup-git-feature-name.vercel.app`
- `vibesbnb-web-git-feature-name.vercel.app`

### Local Testing

```bash
# Test the web app locally
cd apps/web
npm run dev

# Visit:
# - http://localhost:3000/coming-soon (signup page)
# - http://localhost:3000 (main app)
```

---

## Domain Configuration

### Recommended Setup

```
signup.vibesbnb.com  →  vibesbnb-signup.vercel.app
www.vibesbnb.com     →  vibesbnb-web.vercel.app
vibesbnb.com         →  vibesbnb-web.vercel.app
```

### DNS Records

Add these records to your DNS provider:

**For signup subdomain:**
```
Type: CNAME
Name: signup
Value: cname.vercel-dns.com
```

**For main domain:**
```
Type: A
Name: @
Value: 76.76.21.21

Type: CNAME
Name: www
Value: cname.vercel-dns.com
```

---

## Monitoring & Analytics

### Vercel Analytics

Enable analytics for both projects:

1. Go to project **Settings** → **Analytics**
2. Enable **Web Analytics**
3. Add analytics script is auto-injected

### Environment-Specific Tracking

Add to your environment variables:

```bash
# Signup project
NEXT_PUBLIC_GA_TRACKING_ID=G-SIGNUP123

# Main project
NEXT_PUBLIC_GA_TRACKING_ID=G-MAIN456
```

---

## Troubleshooting

### Build Fails

**Issue**: Monorepo not resolving dependencies

**Solution**: Ensure `installCommand` includes workspace root:
```bash
cd ../.. && npm install
```

### 404 Errors

**Issue**: Pages not found after deployment

**Solution**: Check `outputDirectory` is set to `.next`

### Environment Variables Not Loading

**Solution**: 
1. Verify all `NEXT_PUBLIC_*` variables are set in Vercel
2. Redeploy after adding new variables

---

## Cost Optimization

- **Hobby Plan**: Free for both projects with generous limits
- **Pro Plan**: $20/month per project if you need more
- Both projects share the same repository, so no extra Git costs

---

## Security

### Signup Project
- Add `X-Robots-Tag: noindex` header (already in vercel-signup.json)
- Limit access to only signup pages

### Main Project  
- Full SEO enabled
- All security headers configured
- Rate limiting on API routes

---

## Next Steps

1. ✅ Create **vibesbnb-signup** project on Vercel
2. ✅ Create **vibesbnb-web** project on Vercel
3. ✅ Add environment variables to both
4. ✅ Configure custom domains
5. ✅ Test deployments
6. ✅ Set up DNS records
7. ✅ Monitor analytics

---

## Quick Commands Reference

```bash
# Deploy signup site
vercel --prod --cwd apps/web

# Deploy main site  
vercel --prod --cwd apps/web

# Preview deployment
vercel --cwd apps/web

# Pull env variables
vercel env pull

# Check deployment logs
vercel logs <deployment-url>
```

---

## Support

- **Vercel Docs**: https://vercel.com/docs
- **Next.js Docs**: https://nextjs.org/docs
- **Monorepo Setup**: https://vercel.com/docs/monorepos

---

**Last Updated**: November 2025

