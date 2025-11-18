# Fix Property Save Issues - Step by Step Guide

## Current Status
- ✅ Session is working (you're authenticated with Supabase)
- ❌ Properties aren't being saved (0 properties in database)
- ❌ Location not being extracted from scraper

## Step 1: Run SQL Migration (CRITICAL)

**This must be done first!**

1. Go to Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Go to **SQL Editor** (left sidebar)
4. Click **"New query"**
5. Copy and paste the entire contents of `SUPABASE_FIX_PROPERTIES_TABLE.sql`
6. Click **"Run"** (or press Ctrl+Enter)
7. Verify it completed successfully - you should see:
   - "Success. No rows returned" or similar
   - The verification queries at the end should show the columns were added

**This adds the missing `rooms` column that's causing the save to fail.**

## Step 2: Verify Columns Were Added

Run this in Supabase SQL Editor to verify:

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'properties' 
  AND column_name IN ('rooms', 'latitude', 'longitude')
ORDER BY column_name;
```

You should see:
- `rooms` (type: jsonb)
- `latitude` (type: double precision)
- `longitude` (type: double precision)

## Step 3: Try Saving a Property Again

1. Go to `/host/properties`
2. Click **"Import Property"** or **"Add New Property"**
3. Import a property from Esca Management
4. **Check the browser console** for these logs:
   - `[Import Review] Loaded imported data:` - Should show location
   - `[Import Review] Session verified, saving property...`
   - `[Import Review] Property saved successfully to Supabase:`

## Step 4: Check for Errors

If you still see errors, check:

### Error: "Could not find the 'rooms' column"
- **Solution**: The SQL migration didn't run successfully
- Go back to Step 1 and run it again
- Make sure you see "Success" message

### Error: "Auth session missing"
- **Solution**: Sign out and sign back in
- Clear browser storage (F12 → Application → Clear Storage)
- Try again

### Error: "Failed to save property to database"
- **Solution**: Check the error details in console
- Share the full error message for debugging

## Step 5: Verify Location Extraction

After importing, check the console for:
```
[Properties] Extracted location: [location text] from scrapedData.location: [original location]
[Import Review] Loaded imported data: { location: "...", ... }
```

If location is still "Location not found":
- The scraper might need the actual URL to test
- Try a different Esca Management property URL
- Check if the property name contains location (e.g., "The Netflix House – Fort Lauderdale, FL")

## Step 6: Verify Property Was Saved

After saving, run this in Supabase SQL Editor:

```sql
SELECT id, name, location, host_id, status, created_at
FROM properties
WHERE host_id = 'cc10358f-01a0-40a3-a607-ff12a5131aa2'
ORDER BY created_at DESC
LIMIT 5;
```

Replace `cc10358f-01a0-40a3-a607-ff12a5131aa2` with your actual user ID if different.

## Troubleshooting

### Properties still showing 0 after migration
1. **Clear browser cache and localStorage**
   - F12 → Application → Clear Storage → Clear site data
   - Refresh the page
   - Sign in again

2. **Check RLS policies**
   - Run `SUPABASE_CHECK_RLS_POLICIES.sql` in Supabase
   - Verify "Hosts can insert their own properties" policy exists

3. **Check console for save errors**
   - Look for `[Import Review] Error saving property to Supabase:`
   - Share the full error message

### Location still not showing
1. **Check what the scraper extracted**
   - Look for `[Esca Management] Extracted:` in console
   - Check if `location` field has a value

2. **Try manual location entry**
   - On the import-review page, manually type the location
   - The LocationPicker should work even if scraper didn't find it

## Quick Test

After running the migration, try this:

1. Go to `/host/properties/new`
2. Fill in the form manually (don't import)
3. Add a property name, location, price, etc.
4. Add at least one room with images
5. Click "Save"
6. Check console for success message
7. Check if property appears in the list

If this works, the issue is with the import/scraper. If it doesn't, the issue is with the save process.

