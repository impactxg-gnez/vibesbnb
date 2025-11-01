# ✅ Vercel Deployment Setup Complete

## 📦 What Was Set Up

Your VibesBNB project is now configured for **dual Vercel deployments**:

### 1. **vibesbnb-signup** (Signup/Landing Pages)
- **Pages**: `/coming-soon`, `/early-access`, `/thank-you`
- **Purpose**: Pre-launch early access signup flow
- **Recommended Domain**: `signup.vibesbnb.com`

### 2. **vibesbnb-web** (Main Application)
- **Pages**: All app pages (home, dashboard, listings, bookings, etc.)
- **Purpose**: Full VibesBNB marketplace application
- **Recommended Domain**: `www.vibesbnb.com` or `vibesbnb.com`

---

## 🚀 Quick Start

### Option A: Using Vercel Dashboard (Recommended for First Time)

1. **Go to Vercel Dashboard**: https://vercel.com/new

2. **Create First Project (Signup Site)**:
   - Click "Add New Project"
   - Import your Git repository
   - **Project Name**: `vibesbnb-signup`
   - **Framework**: Next.js
   - **Root Directory**: `apps/web`
   - **Build Settings**:
     ```
     Build Command: cd ../.. && npm run build -- --filter=@vibesbnb/web
     Output Directory: .next
     Install Command: cd ../.. && npm install
     ```
   - **Environment Variables**:
     ```
     NEXT_PUBLIC_API_URL=https://your-api-url.com
     NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_key_here
     ```
   - Click "Deploy"

3. **Create Second Project (Main Site)**:
   - Click "Add New Project" again
   - Import the **same** repository
   - **Project Name**: `vibesbnb-web`
   - **Framework**: Next.js
   - **Root Directory**: `apps/web`
   - **Build Settings**: Same as above
   - **Environment Variables**: Same as above + add:
     ```
     NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_key
     ```
   - Click "Deploy"

### Option B: Using CLI (For Automation)

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Navigate to web app
cd apps/web

# Deploy signup project
vercel --prod --project vibesbnb-signup

# Deploy main web project
vercel --prod --project vibesbnb-web
```

---

## 📝 Files Created

```
✅ apps/web/vercel.json               # Main app Vercel config
✅ apps/web/vercel-signup.json        # Signup app Vercel config
✅ scripts/deploy-signup.sh           # Deploy signup (Linux/Mac)
✅ scripts/deploy-web.sh              # Deploy main app (Linux/Mac)
✅ scripts/deploy-both.sh             # Deploy both (Linux/Mac)
✅ scripts/deploy-signup.ps1          # Deploy signup (Windows)
✅ scripts/deploy-web.ps1             # Deploy main app (Windows)
✅ scripts/deploy-both.ps1            # Deploy both (Windows)
✅ VERCEL_DEPLOYMENT_GUIDE.md         # Comprehensive guide
✅ QUICK_VERCEL_SETUP.md              # Quick setup guide
```

---

## 🎯 NPM Scripts Added

After initial Vercel setup, use these commands to deploy:

```bash
# Deploy signup site only
npm run deploy:signup

# Deploy main web app only
npm run deploy:web

# Deploy both projects at once
npm run deploy:all
```

**Note**: These scripts work on both Windows and Linux/Mac automatically!

---

## 🌐 Domain Configuration

### Recommended Setup

| Domain/Subdomain | Points To | Purpose |
|------------------|-----------|---------|
| `signup.vibesbnb.com` | vibesbnb-signup | Early access landing |
| `www.vibesbnb.com` | vibesbnb-web | Main application |
| `vibesbnb.com` | vibesbnb-web | Main application |

### How to Add Domains

1. Go to Vercel project → **Settings** → **Domains**
2. Click **Add Domain**
3. Enter domain (e.g., `signup.vibesbnb.com`)
4. Follow DNS configuration instructions
5. Wait for DNS propagation (can take 24-48 hours)

---

## 🔐 Environment Variables Needed

### For Both Projects
```bash
NEXT_PUBLIC_API_URL=https://api.vibesbnb.com
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
```

### For Main Web Only (Additional)
```bash
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
NEXT_PUBLIC_SOCKET_URL=wss://api.vibesbnb.com
```

### How to Add in Vercel

1. Go to Project → **Settings** → **Environment Variables**
2. Click **Add New**
3. Enter **Key** and **Value**
4. Select **Production** environment
5. Click **Save**
6. **Redeploy** for changes to take effect

---

## 📊 Deployment Workflow

### Automatic Deployments

Both projects auto-deploy when you push to `main`:

```bash
git add .
git commit -m "Update: your changes"
git push origin main
```

Vercel will automatically:
1. Build both projects
2. Run tests
3. Deploy to production
4. Update both URLs

### Manual Deployments

Use the NPM scripts:

```bash
# Deploy just the signup pages
npm run deploy:signup

# Deploy just the main app
npm run deploy:web

# Deploy both at once
npm run deploy:all
```

---

## ✅ Testing Your Deployments

### Signup Site
Visit: `https://vibesbnb-signup.vercel.app`

Test these pages:
- `/coming-soon` - Landing page with countdown ✓
- `/early-access?category=host` - Host signup form ✓
- `/early-access?category=traveller` - Traveller signup ✓
- `/early-access?category=service_host` - Service host signup ✓
- `/early-access?category=dispensary` - Dispensary signup ✓
- `/thank-you?category=host` - Thank you page ✓

### Main Web App
Visit: `https://vibesbnb-web.vercel.app`

Test these pages:
- `/` - Homepage with listings ✓
- `/search` - Search page ✓
- `/login` - Login page ✓
- `/register` - Register page ✓
- `/dashboard` - User dashboard ✓

---

## 🐛 Troubleshooting

### Build Fails: "Module not found"

**Problem**: Can't find `@vibesbnb/shared` package

**Solution**: Make sure build command includes monorepo root:
```bash
Build Command: cd ../.. && npm run build -- --filter=@vibesbnb/web
Install Command: cd ../.. && npm install
```

### Environment Variables Not Working

**Problem**: Variables undefined in production

**Solution**:
1. Variables must start with `NEXT_PUBLIC_` for client-side access
2. Add them in Vercel Dashboard (Settings → Environment Variables)
3. Redeploy after adding variables

### Wrong Pages Showing

**Problem**: Signup pages on main site or vice versa

**Solution**: Both projects deploy the same app, which is fine. They're just different URLs. If you want to restrict access:
- Use middleware to redirect based on hostname
- Or use different branches for each project

### Deployment Stuck

**Problem**: Build running for too long

**Solution**:
1. Check Vercel logs in Dashboard
2. Look for build errors
3. Test build locally: `npm run build`
4. Cancel and retry deployment

---

## 🎨 Customization

### Different Landing Page for Signup Site

If you want the signup site to default to `/coming-soon`:

**In `apps/web/middleware.ts`** (create if it doesn't exist):

```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const hostname = request.headers.get('host');
  
  // Redirect signup site root to /coming-soon
  if (hostname?.includes('signup') && request.nextUrl.pathname === '/') {
    return NextResponse.redirect(new URL('/coming-soon', request.url));
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: '/',
};
```

### Hide Signup Pages from Main Site

Add to `apps/web/middleware.ts`:

```typescript
// Restrict signup pages on main site
if (!hostname?.includes('signup') && 
    ['/coming-soon', '/early-access'].includes(request.nextUrl.pathname)) {
  return NextResponse.redirect(new URL('/', request.url));
}
```

---

## 📈 Monitoring & Analytics

### Enable Vercel Analytics

1. Go to Project → **Analytics**
2. Click **Enable**
3. Analytics automatically integrated

### View Performance

- **Web Vitals**: Core Web Vitals scores
- **Visitors**: Real-time visitor count
- **Top Pages**: Most visited pages
- **Geography**: Visitor locations

### View Deployment Logs

```bash
vercel logs <deployment-url>
```

Or in Dashboard → Deployments → Click deployment → View Logs

---

## 🔄 Rollback Strategy

If a deployment breaks something:

1. Go to **Vercel Dashboard**
2. Select the project
3. Click **Deployments**
4. Find the last working deployment
5. Click **•••** menu → **Promote to Production**

Or via CLI:
```bash
vercel rollback
```

---

## 💡 Best Practices

### 1. Use Preview Deployments
Every PR automatically gets a preview URL:
- Test changes before merging
- Share with team for review
- Verify functionality

### 2. Environment-Specific Variables
Use different values for preview vs production:
```bash
# Production
NEXT_PUBLIC_API_URL=https://api.vibesbnb.com

# Preview
NEXT_PUBLIC_API_URL=https://api-staging.vibesbnb.com
```

### 3. Monitor Build Times
- Check deployment logs regularly
- Optimize slow builds
- Use build cache when possible

### 4. Test Before Deploy
```bash
# Test locally first
npm run build
npm run start

# Then deploy
npm run deploy:all
```

---

## 🚨 Important Notes

1. **Both projects use the same codebase** - They're just different Vercel projects pointing to the same repo
2. **Automatic deployments** - Pushing to `main` deploys both projects
3. **Environment variables** - Set separately for each project
4. **Domains** - Configure different domains for each project
5. **Costs** - Hobby plan is free, Pro is $20/month per project if needed

---

## 📚 Additional Resources

- **Full Deployment Guide**: See `VERCEL_DEPLOYMENT_GUIDE.md`
- **Quick Setup**: See `QUICK_VERCEL_SETUP.md`
- **Vercel Docs**: https://vercel.com/docs
- **Next.js Docs**: https://nextjs.org/docs
- **Monorepo Guide**: https://vercel.com/docs/monorepos

---

## ✨ Next Steps

1. ✅ Create both Vercel projects (see Quick Start above)
2. ✅ Add environment variables to each project
3. ✅ Test deployments
4. ✅ Configure custom domains
5. ✅ Set up DNS records
6. ✅ Enable analytics
7. ✅ Test automatic deployments

---

## 🎉 You're Ready!

Your deployment setup is complete. When you're ready to deploy:

```bash
# Deploy both projects
npm run deploy:all
```

Or push to main:
```bash
git push origin main
```

Both sites will automatically build and deploy! 🚀

---

**Questions?** Check the guides in this repo or reach out to the team.

**Last Updated**: November 2025

