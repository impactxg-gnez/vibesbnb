# Vercel Environment Variable Update Required

## Action Required: Update API URL in Vercel

Your frontend is now deployed and localStorage fallback has been removed. All signups will go **ONLY to Firebase**.

### Current Issue
The frontend needs to point to the correct Cloud Run API URL.

### Correct API URL
```
https://vibesbnb-api-ytgu7naeyq-uc.a.run.app/api/v1
```

## Steps to Update Vercel Environment Variable

### Option 1: Via Vercel Dashboard (Recommended)

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your **vibesbnb** project
3. Go to **Settings** → **Environment Variables**
4. Find or create: `NEXT_PUBLIC_API_URL`
5. Set value to: `https://vibesbnb-api-ytgu7naeyq-uc.a.run.app/api/v1`
6. Make sure it's enabled for: **Production**, **Preview**, and **Development**
7. Click **Save**
8. **Redeploy** your app (Settings → Deployments → click on latest → Redeploy)

### Option 2: Via Vercel CLI

```bash
# Install Vercel CLI if not already installed
npm i -g vercel

# Set the environment variable
vercel env add NEXT_PUBLIC_API_URL production
# When prompted, enter: https://vibesbnb-api-ytgu7naeyq-uc.a.run.app/api/v1

# Also add for preview and development
vercel env add NEXT_PUBLIC_API_URL preview
vercel env add NEXT_PUBLIC_API_URL development

# Redeploy
vercel --prod
```

## What Changed

### Before ❌
- Signups tried API first
- **If API failed** → saved to localStorage
- Data scattered between Firebase and localStorage
- Hard to track signups

### After ✅
- Signups go **ONLY to Firebase via API**
- No localStorage fallback
- All data in one place
- Real-time tracking
- Custom document IDs: `{name}_{phone}`

## Testing After Update

Once you've updated the environment variable and redeployed:

### 1. Test a New Signup
Go to: https://vibesbnb.vercel.app/early-access?category=traveller

Fill out the form and submit.

### 2. Check Firebase Console
Go to: https://console.firebase.google.com/u/0/project/vibesbnb-api-476309/firestore/data/~2Fearly_access_signups

You should immediately see your signup with a document ID like: `keval_702082...`

### 3. Verify via API (PowerShell)
```powershell
# Get all signups
Invoke-RestMethod -Uri "https://vibesbnb-api-ytgu7naeyq-uc.a.run.app/api/v1/early-access/signups" | ConvertTo-Json -Depth 5

# Get statistics
Invoke-RestMethod -Uri "https://vibesbnb-api-ytgu7naeyq-uc.a.run.app/api/v1/early-access/stats" | ConvertTo-Json
```

## Migrating Old localStorage Data

If you still have data in localStorage from your previous signups:

1. Open https://vibesbnb.vercel.app in your browser
2. Open Developer Tools (F12) → Console
3. Paste and run:

```javascript
async function migrateOldSignups() {
  const signups = JSON.parse(localStorage.getItem('earlyAccessSignups') || '[]');
  
  if (signups.length === 0) {
    console.log('No old signups to migrate');
    return;
  }
  
  console.log(`Found ${signups.length} old signup(s). Migrating...`);
  
  for (const signup of signups) {
    try {
      // Remove timestamp field - API generates its own
      const { timestamp, ...cleanSignup } = signup;
      
      const response = await fetch('https://vibesbnb-api-ytgu7naeyq-uc.a.run.app/api/v1/early-access/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cleanSignup)
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log(`✅ ${signup.name} (${signup.category}) → ${result.id}`);
      } else {
        const error = await response.json();
        console.log(`⚠️ ${signup.name}: ${error.message}`);
      }
    } catch (error) {
      console.error(`❌ ${signup.name}:`, error);
    }
  }
  
  console.log('✨ Migration complete!');
  
  // Optional: Clear localStorage after successful migration
  // localStorage.removeItem('earlyAccessSignups');
}

migrateOldSignups();
```

## Firebase Collection Structure

**Collection**: `early_access_signups`

**Document ID Format**: `{sanitized_name}_{sanitized_phone}`
- Example: "Keval Tanmay" with phone "+91 702-082-9448" → `keval_tanmay_917020829448`

**Document Fields**:
```typescript
{
  name: string;
  email: string;
  phone: string;
  category: 'host' | 'dispensary' | 'service_host' | 'traveller';
  timestamp: string; // ISO 8601
  createdAt: Firestore.Timestamp;
  updatedAt: Firestore.Timestamp;
  
  // Optional based on category
  location?: {
    address: string;
    lat: number;
    lng: number;
  };
  serviceHostData?: {
    services: string[];
    serviceAreas: string[];
    pincodes: string[];
  };
  airbnbData?: {
    listingUrl: string;
    propertyName?: string;
    propertyType?: string;
    bedrooms?: number;
    bathrooms?: number;
    guests?: number;
  };
}
```

## Troubleshooting

### Issue: "Failed to sign up. Please check your connection"
**Solution**: 
1. Verify NEXT_PUBLIC_API_URL is set correctly in Vercel
2. Make sure you redeployed after setting the env var
3. Check API is responding: https://vibesbnb-api-ytgu7naeyq-uc.a.run.app/api/v1/early-access/stats

### Issue: Signups not appearing in Firebase
**Solution**:
1. Look in the correct collection: `early_access_signups` (not `user_profiles`)
2. Check API logs in Cloud Run for errors
3. Verify Firebase credentials are set in Cloud Run

### Issue: CORS errors in browser console
**Solution**: The API should allow requests from your Vercel domain. Check the CORS configuration in `apps/api/src/main.ts`

---

## Summary

✅ **localStorage fallback removed**  
✅ **All signups go to Firebase only**  
✅ **Custom document IDs for easy access**  
🔄 **Update NEXT_PUBLIC_API_URL in Vercel**  
🔄 **Redeploy frontend**  
🔄 **Test new signup**  

Once you update the environment variable, everything will work perfectly! 🚀

