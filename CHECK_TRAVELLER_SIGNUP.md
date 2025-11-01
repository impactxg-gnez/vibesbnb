# How to Find Your Traveller Signup

## Current Status
🚧 **Cloud Build is deploying now** - The early-access API endpoints will be live in a few minutes.

## Where is Your Signup Stored?

### During Transition Period
When you signed up, the frontend tried to save to Firebase via API. Since the API endpoints weren't deployed yet, it fell back to **localStorage** (browser storage).

### Option 1: Check localStorage (Immediate)

1. Open your browser where you signed up: https://vibesbnb.vercel.app
2. Press `F12` to open Developer Tools
3. Go to **Console** tab
4. Paste and run:

```javascript
const signups = JSON.parse(localStorage.getItem('earlyAccessSignups') || '[]');
console.table(signups);

// Show just travellers
const travellers = signups.filter(s => s.category === 'traveller');
console.log('Traveller Signups:', travellers);
```

You should see your signup with:
- Your name
- Email
- Phone number
- Category: "traveller"
- Timestamp

### Option 2: Check Firebase (After Deployment Completes - ~5-10 minutes)

#### Using Firebase Console:
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select project: **vibesbnb-api-476309**
3. Navigate to **Firestore Database**
4. Open **early_access_signups** collection
5. Look for a document with ID: `{your_name}_{your_phone}`
   - Example: If your name is "John Doe" and phone is "+1234567890"
   - Document ID would be: `john_doe_1234567890`

#### Using API (PowerShell):
Wait for deployment to complete, then run:

```powershell
# Get all traveller signups
Invoke-RestMethod -Uri "https://vibesbnb-api-431043141075.us-central1.run.app/api/v1/early-access/signups?category=traveller" | ConvertTo-Json -Depth 5

# Get signup statistics
Invoke-RestMethod -Uri "https://vibesbnb-api-431043141075.us-central1.run.app/api/v1/early-access/stats" | ConvertTo-Json -Depth 5
```

#### Using cURL (Git Bash/Linux/Mac):
```bash
# Get all traveller signups
curl https://vibesbnb-api-431043141075.us-central1.run.app/api/v1/early-access/signups?category=traveller

# Get signup statistics
curl https://vibesbnb-api-431043141075.us-central1.run.app/api/v1/early-access/stats
```

## Migration from localStorage to Firebase

### Automatic Migration (Recommended)
Once the API is deployed, you can create a simple migration script:

1. Open your browser console on https://vibesbnb.vercel.app
2. Paste and run this:

```javascript
async function migrateToFirebase() {
  const signups = JSON.parse(localStorage.getItem('earlyAccessSignups') || '[]');
  
  console.log(`Found ${signups.length} signup(s) in localStorage`);
  
  for (const signup of signups) {
    try {
      const response = await fetch('https://vibesbnb-api-431043141075.us-central1.run.app/api/v1/early-access/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(signup)
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('✅ Migrated:', signup.name, '→', result.id);
      } else {
        console.log('⚠️ Already exists or error:', signup.name);
      }
    } catch (error) {
      console.error('❌ Failed:', signup.name, error);
    }
  }
  
  console.log('Migration complete!');
}

// Run migration
migrateToFirebase();
```

This will:
- Read all signups from localStorage
- Send each one to Firebase via API
- Skip duplicates (if email already exists for that category)
- Log the results

## Monitoring Deployment

### Check Build Status:
```powershell
gcloud builds list --limit=1 --format="table(id,status,createTime)"
```

### Check if API is Ready:
```powershell
# Test health endpoint
Invoke-RestMethod -Uri "https://vibesbnb-api-431043141075.us-central1.run.app/health"
```

### View Build Logs:
Go to: https://console.cloud.google.com/cloud-build/builds

## Expected Timeline

- ⏱️ **Build Time**: 5-10 minutes
- ⏱️ **Deployment**: 1-2 minutes
- ⏱️ **Total**: ~7-12 minutes from now

## What Happens After Deployment

1. **New signups** will go directly to Firebase
2. **Old signups** in localStorage need to be migrated (see script above)
3. **Document IDs** will be in format: `{name}_{phone}`
   - Easy to find and read
   - No duplicates possible
   - Human-friendly

## Verification Steps (Once Deployed)

### Step 1: Test API Endpoint
```powershell
Invoke-RestMethod -Uri "https://vibesbnb-api-431043141075.us-central1.run.app/api/v1/early-access/signups" | ConvertTo-Json
```

### Step 2: Check Firebase Console
Look for `early_access_signups` collection with documents

### Step 3: Try New Signup
1. Go to https://vibesbnb.vercel.app/early-access
2. Fill out form with test data
3. Submit
4. Check Firebase Console - should appear immediately!

### Step 4: Verify Document ID Format
Document should be named: `test_user_1234567890` (not random Firebase ID)

## Troubleshooting

### Issue: API Still Returns 404
**Solution**: Wait a bit longer, Cloud Build may still be running

### Issue: Signup in localStorage but Not Firebase
**Solution**: Run the migration script above

### Issue: Can't Access Firebase Console
**Solution**: Make sure you're logged in with the correct Google account

### Issue: Build Failed
**Solution**: Check build logs at https://console.cloud.google.com/cloud-build/builds

---

I'll monitor the deployment and let you know when it's complete! 🚀

