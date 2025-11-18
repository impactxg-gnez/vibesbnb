# Debugging Property Save Issues

## Current Issue
Properties are being saved to localStorage only, not to Supabase database.

## Symptoms
- Properties show up on the same device/browser
- Properties don't appear on other devices
- Console shows: `[Properties] Auth session missing!`
- Database query shows 0 properties

## Root Cause
The Supabase session is not being established or maintained when saving properties.

## Debugging Steps

### 1. Check Browser Console When Adding Property

When you click "Save" on a new property, check the browser console for these logs:

**Expected logs (if working):**
```
[New Property] Session loaded successfully, user ID: [uuid]
[New Property] Session verified, saving property with host_id: [uuid]
[New Property] Session token exists: true
[New Property] Property saved successfully to Supabase: [object]
```

**If you see these instead:**
```
[New Property] No Supabase session available after 5 attempts
[New Property] Session not available when attempting insert
[New Property] Falling back to localStorage
```

This means the session isn't being established.

### 2. Check Supabase Session in Browser

Open browser console and run:
```javascript
// Check if Supabase client is available
const { createClient } = await import('@/lib/supabase/client');
const supabase = createClient();

// Check session
const { data: { session }, error } = await supabase.auth.getSession();
console.log('Session:', session);
console.log('Error:', error);

// Check user
const { data: { user }, error: userError } = await supabase.auth.getUser();
console.log('User:', user);
console.log('User Error:', userError);
```

### 3. Test RLS Policies Directly

Run `SUPABASE_TEST_INSERT.sql` in Supabase SQL Editor:
1. First, get your user ID from the query
2. Replace `YOUR_USER_ID_HERE` with your actual user ID
3. Run the insert query
4. If it fails, the error will tell you which RLS policy is blocking

### 4. Verify Environment Variables

Check that these are set in Vercel:
- `NEXT_PUBLIC_SUPABASE_URL` - Should be your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Should be your Supabase anon key

**Important**: After updating environment variables in Vercel, you MUST redeploy for changes to take effect.

### 5. Check RLS Policies

Run `SUPABASE_CHECK_RLS_POLICIES.sql` to verify:
- RLS is enabled
- Insert policy exists: "Hosts can insert their own properties"
- Policy condition: `WITH CHECK (host_id = auth.uid())`

## Common Fixes

### Fix 1: Redeploy After Setting Environment Variables
1. Go to Vercel dashboard
2. Settings → Environment Variables
3. Verify variables are set
4. Go to Deployments
5. Click "Redeploy" on the latest deployment

### Fix 2: Clear Browser Storage and Re-login
1. Open browser DevTools (F12)
2. Application tab → Storage
3. Clear Local Storage
4. Clear Session Storage
5. Sign out and sign back in
6. Try adding a property again

### Fix 3: Check Supabase Project Settings
1. Go to Supabase Dashboard
2. Settings → API
3. Verify the URL and anon key match what's in Vercel
4. Check if email confirmation is required (might block session)

### Fix 4: Verify User Email is Confirmed
1. Go to Supabase Dashboard
2. Authentication → Users
3. Find your user
4. Verify email is confirmed
5. If not, confirm it manually

## Next Steps

After trying the fixes above:
1. Add a new property
2. Check browser console for the detailed logs
3. Share the console output if issues persist

