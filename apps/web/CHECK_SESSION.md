# Check Supabase Session Status

## Quick Diagnostic

Open your browser console (F12) and run this code to check your session status:

```javascript
// Check Supabase session
const { createClient } = await import('/src/lib/supabase/client.ts');
const supabase = createClient();

// Check session
const { data: { session }, error: sessionError } = await supabase.auth.getSession();
console.log('=== SESSION CHECK ===');
console.log('Session:', session);
console.log('Session Error:', sessionError);
console.log('Has Session:', !!session);

// Check user
const { data: { user }, error: userError } = await supabase.auth.getUser();
console.log('=== USER CHECK ===');
console.log('User:', user);
console.log('User Error:', userError);
console.log('Has User:', !!user);

// Check cookies
console.log('=== COOKIES ===');
console.log('All Cookies:', document.cookie);
const supabaseCookies = document.cookie.split(';').filter(c => c.includes('supabase'));
console.log('Supabase Cookies:', supabaseCookies);

// Check environment variables (in browser)
console.log('=== ENV VARS ===');
console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
console.log('Has Supabase URL:', !!process.env.NEXT_PUBLIC_SUPABASE_URL);
console.log('Has Supabase Key:', !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
```

## What to Look For

### If Session is NULL:
- You're not actually signed in with Supabase
- You might be using a demo account (localStorage only)
- The session cookies weren't set after sign-in

### If Session Exists but User is NULL:
- Session is invalid or expired
- Need to refresh the session

### If No Supabase Cookies:
- Cookies aren't being set
- Check browser cookie settings
- Check if you're on the correct domain

## Solutions

### Solution 1: Sign Out and Sign Back In
1. Click Sign Out
2. Clear browser storage (F12 → Application → Clear Storage)
3. Sign in again with your Supabase account (not demo account)
4. Check console for session

### Solution 2: Check if Using Demo Account
If you see `demo-` in your user ID, you're using a demo account which doesn't use Supabase.

To use Supabase:
1. Sign out
2. Sign in with a real account (not demo@host.com, demo@traveller.com, etc.)
3. Or create a new account through the signup page

### Solution 3: Verify Environment Variables
Make sure these are set in Vercel:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

And that they're NOT placeholder values.

