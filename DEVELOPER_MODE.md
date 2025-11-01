# Developer Mode - Bypass Coming Soon Wall

## Quick Access to All Pages During Development

While the "Coming Soon" mode is active for users, you as a developer can access all pages using Developer Mode.

## How to Enable Developer Mode

### Method 1: Browser Console (Quick)

1. Open your site: https://vibesbnb.vercel.app or http://localhost:3000
2. Press `F12` to open Developer Tools
3. Go to **Console** tab
4. Paste and run:

```javascript
// Enable developer mode
localStorage.setItem('vibesbnb_dev_mode', 'true');
location.reload();
```

**You'll see**: `🔓 Developer Mode: Active - All routes accessible` in the console

Now you can access **any page**:
- http://localhost:3000/
- http://localhost:3000/search
- http://localhost:3000/listings/123
- http://localhost:3000/dashboard
- http://localhost:3000/host/dashboard
- http://localhost:3000/admin/dashboard
- etc.

### Method 2: Disable Developer Mode

When you want to test the "Coming Soon" experience:

```javascript
// Disable developer mode
localStorage.removeItem('vibesbnb_dev_mode');
location.reload();
```

All routes except `/coming-soon`, `/early-access`, and `/thank-you` will be blocked again.

### Method 3: Create Bookmarklet (One-Click Toggle)

Create a bookmark with this JavaScript:

**Enable Dev Mode:**
```javascript
javascript:(function(){localStorage.setItem('vibesbnb_dev_mode','true');location.reload();})();
```

**Disable Dev Mode:**
```javascript
javascript:(function(){localStorage.removeItem('vibesbnb_dev_mode');location.reload();})();
```

## Development Workflow

### When Working Locally

1. Start your dev server: `npm run dev`
2. Open http://localhost:3000
3. Enable developer mode (run script above)
4. Work on any page you want
5. Refresh to see changes

### When Testing Production

1. Open https://vibesbnb.vercel.app
2. Enable developer mode
3. Test all pages
4. Disable developer mode to test user experience

## What Users See vs What You See

| Route | Users | Developer Mode |
|-------|-------|----------------|
| `/` | → Redirected to `/coming-soon` | ✅ Home page |
| `/coming-soon` | ✅ Allowed | ✅ Allowed |
| `/early-access` | ✅ Allowed | ✅ Allowed |
| `/thank-you` | ✅ Allowed | ✅ Allowed |
| `/search` | → Redirected to `/coming-soon` | ✅ Search page |
| `/listings/*` | → Redirected to `/coming-soon` | ✅ Listing pages |
| `/dashboard` | → Redirected to `/coming-soon` | ✅ User dashboard |
| `/host/*` | → Redirected to `/coming-soon` | ✅ Host pages |
| `/admin/*` | → Redirected to `/coming-soon` | ✅ Admin pages |
| **All other routes** | → Redirected to `/coming-soon` | ✅ Accessible |

## Useful Console Commands

### Check Current Mode
```javascript
localStorage.getItem('vibesbnb_dev_mode') === 'true' 
  ? console.log('🔓 Developer Mode: ON') 
  : console.log('🔒 Coming Soon Mode: ON');
```

### Toggle Mode
```javascript
// Toggle developer mode
if (localStorage.getItem('vibesbnb_dev_mode') === 'true') {
  localStorage.removeItem('vibesbnb_dev_mode');
  console.log('🔒 Developer Mode: Disabled');
} else {
  localStorage.setItem('vibesbnb_dev_mode', 'true');
  console.log('🔓 Developer Mode: Enabled');
}
location.reload();
```

## Important Notes

### Security
- Developer mode only exists in the browser (localStorage)
- It does NOT bypass actual authentication/authorization
- It only bypasses the "Coming Soon" redirect
- Backend API still requires proper authentication

### Team Development
Each developer needs to enable developer mode on their own machine/browser. It's not shared or synced.

### Before Launch (April 20, 2026)
When you're ready to remove the "Coming Soon" mode entirely:

1. Open `apps/web/src/components/auth/AuthGuard.tsx`
2. Either:
   - **Option A**: Remove the `AuthGuard` from `apps/web/src/app/LayoutContent.tsx`
   - **Option B**: Change `ALLOWED_ROUTES` to include all routes
   - **Option C**: Delete the entire `AuthGuard` component

## Troubleshooting

### Issue: Developer mode not working
**Solution**: 
1. Check console for `🔓 Developer Mode: Active` message
2. Hard refresh: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
3. Clear localStorage and set again:
   ```javascript
   localStorage.clear();
   localStorage.setItem('vibesbnb_dev_mode', 'true');
   location.reload();
   ```

### Issue: Still seeing "Coming Soon" page
**Solution**: Make sure you're setting the flag BEFORE navigating:
```javascript
localStorage.setItem('vibesbnb_dev_mode', 'true');
location.reload(); // Must reload!
```

### Issue: Lost developer mode after clearing cache
**Solution**: localStorage is cleared when you clear browser data. Just run the enable script again.

## For Production Testing

### Test as Real User (Recommended)
1. Open **Incognito/Private Window**
2. Go to https://vibesbnb.vercel.app
3. You'll see the coming soon experience exactly as users see it
4. No need to disable developer mode in your regular browser

### Test Developer Mode in Production
1. Open https://vibesbnb.vercel.app in regular browser
2. Enable developer mode
3. Test all pages work correctly
4. Check that header/footer show properly
5. Verify all functionality

---

## Quick Reference Card

**Enable:**
```javascript
localStorage.setItem('vibesbnb_dev_mode', 'true'); location.reload();
```

**Disable:**
```javascript
localStorage.removeItem('vibesbnb_dev_mode'); location.reload();
```

**Check:**
```javascript
console.log('Dev Mode:', localStorage.getItem('vibesbnb_dev_mode'));
```

Happy developing! 🚀

