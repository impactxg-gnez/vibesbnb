# Database Migration Instructions

## ⚠️ IMPORTANT: Run This Migration First

The application requires additional columns in the `properties` table that don't exist yet. You **must** run the migration script before using the property import/edit features.

## Quick Steps

1. **Go to Supabase Dashboard**
   - Navigate to: https://supabase.com/dashboard
   - Select your project: `okmudgacbpgycixtpoqx`

2. **Open SQL Editor**
   - Click on "SQL Editor" in the left sidebar
   - Click "New query"

3. **Run the Migration Script**
   - Copy the entire contents of `SUPABASE_MIGRATE_PROPERTIES_COMPLETE.sql`
   - Paste it into the SQL Editor
   - Click "Run" (or press Ctrl+Enter)

4. **Verify Success**
   - You should see a success message
   - The verification query at the end will show all columns in the properties table
   - You should see these columns:
     - `host_id` (uuid)
     - `bedrooms` (integer)
     - `bathrooms` (integer)
     - `beds` (integer)
     - `description` (text)
     - `wellness_friendly` (boolean)
     - `google_maps_url` (text)

## What This Migration Does

- ✅ Adds `host_id` column to link properties to hosts
- ✅ Adds `bedrooms`, `bathrooms`, `beds` columns for property details
- ✅ Adds `description` column for property descriptions
- ✅ Adds `wellness_friendly` column for wellness-friendly flag
- ✅ Adds `google_maps_url` column for map links
- ✅ Creates indexes for faster queries
- ✅ Updates Row Level Security (RLS) policies so hosts can manage their properties

## Troubleshooting

### Error: "column already exists"
- This is fine! The script uses `IF NOT EXISTS` so it won't fail if columns already exist
- Just continue - the migration will only add missing columns

### Error: "permission denied"
- Make sure you're logged into Supabase as the project owner
- Check that you have the correct project selected

### Properties still not persisting
- After running the migration, try:
  1. Clear your browser cache
  2. Log out and log back in
  3. Try importing a property again

## After Migration

Once the migration is complete:
- ✅ Property import will work correctly
- ✅ Properties will persist in the database
- ✅ Edit page will load property data
- ✅ Properties will be linked to the correct host

