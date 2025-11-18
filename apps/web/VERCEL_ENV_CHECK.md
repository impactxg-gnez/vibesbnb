# Vercel Project & Environment Variables Check

## 🔍 Current Vercel Project

**Project Name**: `vibesbnb-web`  
**Project ID**: `prj_DTdKFYyQ8zm9IYy5qtAilbQFE6RK`  
**Organization ID**: `team_pLV8GArwIdzo0sivPN7dCf0b`  
**Vercel Dashboard**: https://vercel.com/kevals-projects-6dce5dc6/vibesbnb-web

---

## ✅ Required Environment Variables

Go to your Vercel project settings and verify these environment variables are set:

### 1. Supabase Configuration (CRITICAL for property persistence)
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

**How to check:**
1. Go to https://vercel.com/kevals-projects-6dce5dc6/vibesbnb-web/settings/environment-variables
2. Verify all three variables are present
3. Make sure they're NOT placeholder values like:
   - `https://placeholder.supabase.co`
   - `placeholder-key`

### 2. Google Maps API Key
```
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
```

### 3. Optional (if using external API)
```
NEXT_PUBLIC_API_URL=your_api_url
```

---

## 🔧 How to Check/Update Environment Variables

### Via Vercel Dashboard:
1. Go to: https://vercel.com/kevals-projects-6dce5dc6/vibesbnb-web/settings/environment-variables
2. Review all variables
3. Add/Edit as needed
4. **Important**: After updating, redeploy the project for changes to take effect

### Via Vercel CLI:
```bash
# List all environment variables
vercel env ls

# Pull environment variables to local file
vercel env pull .env.local

# Add a new environment variable
vercel env add NEXT_PUBLIC_SUPABASE_URL production
```

---

## 🚨 Common Issues

### Issue: Properties not syncing across devices
**Cause**: Supabase environment variables not set or incorrect

**Solution**:
1. Verify `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set
2. Check they match your Supabase project settings
3. Redeploy after updating variables

### Issue: "Auth session missing" error
**Cause**: Session not properly established after sign-in

**Solution**: 
- The code now includes retry logic to wait for session
- If still happening, check Supabase configuration

---

## 📋 Verification Checklist

- [ ] `NEXT_PUBLIC_SUPABASE_URL` is set and correct
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` is set and correct
- [ ] `SUPABASE_SERVICE_ROLE_KEY` is set (for admin operations)
- [ ] `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is set
- [ ] All variables are set for **Production** environment
- [ ] All variables are set for **Preview** environment (if using)
- [ ] Project has been redeployed after adding/updating variables

---

## 🔗 Quick Links

- **Vercel Project**: https://vercel.com/kevals-projects-6dce5dc6/vibesbnb-web
- **Environment Variables**: https://vercel.com/kevals-projects-6dce5dc6/vibesbnb-web/settings/environment-variables
- **Deployments**: https://vercel.com/kevals-projects-6dce5dc6/vibesbnb-web/deployments
- **Settings**: https://vercel.com/kevals-projects-6dce5dc6/vibesbnb-web/settings

