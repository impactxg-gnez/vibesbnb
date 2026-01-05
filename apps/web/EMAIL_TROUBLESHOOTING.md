# Email Troubleshooting Guide

## Issue: Confirmation Emails Not Being Sent

If users are not receiving confirmation emails during registration, check the following:

### 1. Supabase Email Configuration

The app uses Supabase's built-in email service for sending confirmation emails. Check your Supabase project settings:

1. **Go to Supabase Dashboard** → Your Project → Settings → Auth
2. **Check Email Settings:**
   - Ensure "Enable email confirmations" is enabled
   - Verify "Site URL" is set correctly (e.g., `https://yourdomain.com` or `http://localhost:3000` for development)
   - Check "Redirect URLs" includes your callback URL: `https://yourdomain.com/auth/callback`

3. **Check SMTP Settings (if using custom SMTP):**
   - Go to Settings → Auth → SMTP Settings
   - If using custom SMTP, ensure all credentials are correct
   - If not configured, Supabase uses its default email service (may have rate limits)

### 2. Rate Limiting

Supabase's default email service has rate limits:
- Free tier: Limited emails per hour
- If you hit the limit, emails will be queued or dropped

**Solution:** Configure custom SMTP (SendGrid, AWS SES, etc.) in Supabase settings.

### 3. Email Templates

Check Supabase email templates:
- Go to Settings → Auth → Email Templates
- Ensure "Confirm signup" template is enabled and properly configured
- Verify the template includes the confirmation link

### 4. Check Application Logs

The application now includes enhanced logging. Check your browser console and server logs for:
- `[Auth] User created successfully` - User was created
- `[Auth] Confirmation sent` - Email was sent (timestamp)
- `[Auth] Warning: User created but confirmation email may not have been sent` - Potential issue

### 5. User Actions

Users can now:
- **Resend confirmation emails** from the `/verify-email` page
- See better error messages if signup fails
- Get clear instructions if email is not received

### 6. Common Issues

**Issue:** Emails going to spam
- **Solution:** Configure SPF/DKIM records for your domain (if using custom domain)
- Ask users to check spam folder

**Issue:** "User already exists" but no email received
- **Solution:** User may have signed up before. Use the resend functionality on verify-email page

**Issue:** Emails not sending in development
- **Solution:** Ensure Site URL in Supabase is set to `http://localhost:3000` (or your dev port)
- Check that redirect URLs include localhost

### 7. Testing Email Sending

To test if emails are being sent:
1. Check Supabase Dashboard → Authentication → Users
2. Look for the user you just created
3. Check if `confirmation_sent_at` timestamp is set
4. If not set, Supabase did not send the email (check configuration)

### 8. Manual Email Resend

If needed, you can manually trigger email resend from Supabase Dashboard:
1. Go to Authentication → Users
2. Find the user
3. Click "Send confirmation email" button

### 9. Code Improvements Made

The following improvements have been added to help diagnose and fix email issues:

1. **Enhanced Logging:**
   - Logs when user is created
   - Logs email confirmation status
   - Logs when confirmation email is sent
   - Warns if email may not have been sent

2. **Resend Functionality:**
   - Users can resend confirmation emails from `/verify-email` page
   - 60-second cooldown to prevent abuse
   - Better error messages

3. **Better Error Handling:**
   - More descriptive error messages
   - Handles common Supabase errors
   - Provides actionable feedback to users

4. **Email Persistence:**
   - Stores email in localStorage for resend functionality
   - Clears after successful verification

### 10. Next Steps if Still Not Working

If emails are still not being sent after checking the above:

1. **Configure Custom SMTP:**
   - Set up SendGrid, AWS SES, or similar service
   - Add SMTP credentials to Supabase Settings → Auth → SMTP Settings

2. **Check Supabase Status:**
   - Visit https://status.supabase.com
   - Check if there are any email service outages

3. **Contact Support:**
   - Check Supabase logs in Dashboard → Logs → Auth
   - Look for email sending errors
   - Contact Supabase support if needed

4. **Alternative: Disable Email Confirmation (Development Only):**
   - In Supabase Dashboard → Settings → Auth
   - Disable "Enable email confirmations" (NOT recommended for production)


