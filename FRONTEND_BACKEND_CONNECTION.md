# Frontend-Backend Connection Setup

## ✅ Backend Configuration Complete

Your backend API is live and configured for your frontend:
- **Backend URL:** `https://vibesbnb-api-431043141075.us-central1.run.app`
- **Frontend URL:** `https://vibesbnb-web.vercel.app`
- **CORS:** Configured to allow requests from your frontend

## 🔧 Configure Frontend in Vercel

### Option 1: Via Vercel Dashboard (Recommended)

1. Go to https://vercel.com/dashboard
2. Select your **vibesbnb-web** project
3. Click **Settings** → **Environment Variables**
4. Add a new environment variable:
   - **Name:** `NEXT_PUBLIC_API_URL`
   - **Value:** `https://vibesbnb-api-431043141075.us-central1.run.app/api/v1`
   - **Environment:** Select all (Production, Preview, Development)
5. Click **Save**
6. Go to **Deployments** → Click the 3 dots on latest deployment → **Redeploy**
7. Check "Use existing Build Cache" and click **Redeploy**

### Option 2: Via Vercel CLI

```bash
# Install Vercel CLI (if not already installed)
npm i -g vercel

# Login to Vercel
vercel login

# Navigate to your web app directory
cd apps/web

# Set the environment variable
vercel env add NEXT_PUBLIC_API_URL
# When prompted, enter: https://vibesbnb-api-431043141075.us-central1.run.app/api/v1
# Select: Production, Preview, Development (all)

# Redeploy
vercel --prod
```

### Option 3: Update .env.production and Push

If your repo is connected to Vercel:

1. Create or update `apps/web/.env.production`:
   ```
   NEXT_PUBLIC_API_URL=https://vibesbnb-api-431043141075.us-central1.run.app/api/v1
   ```

2. Commit and push:
   ```bash
   git add apps/web/.env.production
   git commit -m "Configure production API URL"
   git push
   ```

3. Vercel will automatically redeploy

## ✅ Test the Connection

After redeploying, test your application:

### 1. Open your frontend
Visit: https://vibesbnb-web.vercel.app

### 2. Open Browser DevTools
- Press F12
- Go to **Console** tab
- Go to **Network** tab

### 3. Try to interact with the app
- Click "Sign Up" or "Login"
- Try to search for listings
- Watch the Network tab for API calls

### 4. Verify API calls
You should see requests to:
- `https://vibesbnb-api-431043141075.us-central1.run.app/api/v1/auth/register`
- `https://vibesbnb-api-431043141075.us-central1.run.app/api/v1/auth/login`
- `https://vibesbnb-api-431043141075.us-central1.run.app/api/v1/listings`

## 🧪 Quick API Test

You can test the API directly from your browser console:

```javascript
// Test listings endpoint
fetch('https://vibesbnb-api-431043141075.us-central1.run.app/api/v1/listings')
  .then(r => r.json())
  .then(console.log);

// Test register endpoint (will create a user)
fetch('https://vibesbnb-api-431043141075.us-central1.run.app/api/v1/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'test@example.com',
    password: 'Test123!@#',
    firstName: 'Test',
    lastName: 'User'
  })
})
.then(r => r.json())
.then(console.log);
```

## 🔍 Troubleshooting

### CORS Errors
If you see CORS errors in the console:
- Verify the backend `APP_URL` is set correctly
- Check that the frontend is making requests to the correct backend URL

### 404 Errors
If API calls return 404:
- Verify `NEXT_PUBLIC_API_URL` includes `/api/v1` at the end
- Check that the environment variable is set in Vercel

### 500 Errors
If API calls return 500:
- Check backend logs: `gcloud run services logs read vibesbnb-api --region us-central1 --limit 50`
- Verify Firebase is working properly

### Environment Variable Not Working
- Make sure to **redeploy** after setting environment variables
- Environment variables are only loaded during build time for `NEXT_PUBLIC_*` variables
- Clear cache when redeploying if needed

## 📊 Monitor Your App

### Backend Logs
```bash
# View recent logs
gcloud run services logs read vibesbnb-api --region us-central1 --limit 100

# Follow logs in real-time (may not work in Cloud Run)
gcloud run services logs tail vibesbnb-api --region us-central1
```

### Check Backend Status
```bash
curl https://vibesbnb-api-431043141075.us-central1.run.app/api/v1/listings
```

## 🎉 What's Next?

Once the connection is working:

1. **Test Registration & Login**
   - Create a test account
   - Verify authentication works

2. **Add Sample Data**
   - You can use the seed script: `npm run seed` (in the API directory)
   - Or manually add listings through the admin panel

3. **Optional: Add More Services**
   - Stripe for payments
   - AWS S3 for image uploads
   - SendGrid for emails
   - Redis for job queues

4. **Set Production JWT Secrets**
   ```bash
   # Generate secure secrets (run in terminal)
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   
   # Update in Cloud Run
   gcloud run services update vibesbnb-api --region us-central1 \
     --update-env-vars="JWT_SECRET=<generated-secret>,JWT_REFRESH_SECRET=<generated-secret>"
   ```

---

**Need help?** Check the logs or test the endpoints manually. Your full-stack app is now live! 🚀

