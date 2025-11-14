# Migrate Existing Users to Host Role

This guide explains how to migrate existing user accounts to have the 'host' role in Supabase.

## Methods

There are two ways to migrate users to host status:

### Method 1: Using the Admin Dashboard (Recommended)

1. **Set up the Supabase Service Role Key**
   - Go to your Vercel project settings
   - Add the environment variable: `SUPABASE_SERVICE_ROLE_KEY`
   - Get the service role key from your Supabase dashboard: Settings > API > Service Role Key
   - Redeploy your application after adding the environment variable

2. **Access the Migration Tool**
   - Log in as an admin user
   - Go to `/admin` dashboard
   - Click on "Migrate to Host" card

3. **Migrate Users**
   - **Option A (Recommended):** Enter specific email addresses (one per line) and click "Migrate Users to Host"
   - **Option B:** Check "Migrate all users" to update all users in the system (use with caution)

4. **Verify Migration**
   - Users will need to log out and log back in to see the changes
   - After login, hosts should be redirected to `/host/properties` instead of the home page

### Method 2: Using SQL Script (Direct Database Access)

1. **Access Supabase SQL Editor**
   - Go to your Supabase dashboard
   - Navigate to SQL Editor

2. **Run the Migration Script**
   - Open `SUPABASE_MIGRATE_HOSTS.sql`
   - Choose the appropriate option:
     - **Option 1:** Update all users (use with caution)
     - **Option 2:** Update specific users by email (recommended)
   - Modify the email addresses in the script
   - Execute the SQL script

3. **Verify the Update**
   - The script includes a verification query at the end
   - Check that users have been updated correctly

## Important Notes

- **Service Role Key:** The admin dashboard migration tool requires the `SUPABASE_SERVICE_ROLE_KEY` environment variable to be set in Vercel
- **User Session:** Users need to log out and log back in for the changes to take effect
- **Role Persistence:** The role is stored in Supabase user metadata and synced to localStorage on login
- **Safety:** Always test with a few users first before migrating all users

## Troubleshooting

### Migration Tool Not Working
- Check that `SUPABASE_SERVICE_ROLE_KEY` is set in Vercel environment variables
- Verify you're logged in as an admin user
- Check the browser console for errors

### Users Not Seeing Host Dashboard
- Ask users to log out and log back in
- Clear browser cache and localStorage
- Verify the role was set correctly in Supabase (check user metadata)

### SQL Script Errors
- Make sure you have the correct permissions in Supabase
- Verify the email addresses are correct
- Check that the users exist in the database

## Example: Migrate Specific Users

### Using Admin Dashboard
1. Go to `/admin/migrate-hosts`
2. Enter email addresses (one per line):
   ```
   user1@example.com
   user2@example.com
   user3@example.com
   ```
3. Click "Migrate Users to Host"

### Using SQL Script
```sql
UPDATE auth.users
SET raw_user_meta_data = jsonb_set(
  COALESCE(raw_user_meta_data, '{}'::jsonb),
  '{role}',
  '"host"'
)
WHERE email IN (
  'user1@example.com',
  'user2@example.com',
  'user3@example.com'
)
AND (raw_user_meta_data->>'role' IS NULL OR raw_user_meta_data->>'role' != 'host');
```

