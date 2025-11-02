# 🚀 Deploy VibesBNB Web - Quick Guide

## ✅ What's Ready

Your complete VibesBNB marketplace site is now ready to deploy to `vibesbnb-web`!

**Restored Features:**
- ✅ Full homepage with Hero, SearchBar, Categories, Listings
- ✅ Search page with filtering
- ✅ Listing detail pages
- ✅ Host landing page
- ✅ All signup pages still work
- ✅ Middleware configured for dual-site setup

## 🎯 Deploy Now - 3 Options

### Option 1: Git Push (Easiest - Auto-Deploy)

```bash
git add .
git commit -m "feat: restore complete VibesBNB marketplace"
git push origin main
```

✅ If Vercel is connected to your repo, it will auto-deploy both projects:
- `vibesbnb-signup` → Shows signup pages only
- `vibesbnb-web` → Shows full marketplace

### Option 2: Vercel CLI

```powershell
# From your project root
cd apps\web

# Deploy to production
vercel --prod
```

When prompted, select/create project `vibesbnb-web`.

### Option 3: Vercel Dashboard

1. Visit [vercel.com/dashboard](https://vercel.com/dashboard)
2. Find project `vibesbnb-web`
3. Click "Redeploy" on the latest deployment
   - OR -
4. Go to "Deployments" → "..." menu → "Redeploy"

## 📋 After Deployment

### Test These URLs on vibesbnb-web.vercel.app:

| Page | URL | Expected |
|------|-----|----------|
| Homepage | `/` | Hero + Search + Categories + Listings |
| Search | `/search` | Search bar + listing grid |
| Listing | `/listings/1` | Full property details |
| Host | `/host` | Become a host page |
| Coming Soon | `/coming-soon` | Signup landing (still accessible) |

### Verify Signup Site Still Works:

On `vibesbnb-signup.vercel.app`:
- `/` should redirect to `/coming-soon` ✅
- `/early-access` should work ✅
- `/search` should redirect to `/coming-soon` (blocked) ✅

## 🔧 If Using Vercel CLI

If you get build errors, ensure your `vercel.json` has:

```json
{
  "buildCommand": "cd ../.. && npm run build -- --filter=@vibesbnb/web",
  "outputDirectory": ".next",
  "installCommand": "cd ../.. && npm install",
  "framework": "nextjs"
}
```

This is already in your `apps/web/vercel.json` ✅

## ⚠️ Important Notes

### Mock Data
Current listings use placeholder data. To connect real data:
1. Update `NEXT_PUBLIC_API_URL` in Vercel environment variables
2. Implement API calls in components (marked with comments)

### Environment Variables
Make sure these are set in Vercel project settings:
```
NEXT_PUBLIC_API_URL=<your-api-url>
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=<your-key>
```

## 🎉 Success Checklist

After deployment completes:

- [ ] `vibesbnb-web.vercel.app` shows new homepage
- [ ] Search page works
- [ ] Listing details page works
- [ ] Host page works
- [ ] Mobile responsive
- [ ] No console errors

## 🐛 Troubleshooting

### "Module not found" errors
→ Make sure build command includes `cd ../..` to access monorepo packages

### Homepage still redirects to /coming-soon
→ Check middleware - should only redirect on signup subdomain

### Images not loading
→ Normal - using placeholder.com for now. Replace with real images later.

### Build takes too long
→ Normal for first build. Subsequent builds use cache.

## 📞 Need Help?

- Check `SITE_RESTORED.md` for full details
- Review `README.md` for complete documentation
- Check Vercel logs for specific errors

---

**Ready to go!** Choose your deployment option above and launch! 🚀

