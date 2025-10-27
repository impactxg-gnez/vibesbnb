# ✅ Backend Deployment Complete!

Your VibesBNB API is now live on Google Cloud Run!

**API URL:** `https://vibesbnb-api-431043141075.us-central1.run.app`

## 🎯 Next Steps

### 1. Configure Backend Environment Variables

Your API is running but needs Firebase credentials and other secrets to be fully functional.

#### Set Environment Variables in Cloud Run:

```bash
# Navigate to your project
cd F:\VibesBNB

# Set Firebase credentials (REQUIRED for database)
gcloud run services update vibesbnb-api --region us-central1 \
  --set-env-vars="FIREBASE_PROJECT_ID=your-firebase-project-id,FIREBASE_CLIENT_EMAIL=your-service-account@project.iam.gserviceaccount.com,FIREBASE_STORAGE_BUCKET=your-project.appspot.com"

# Set Firebase private key (note: you may need to escape newlines)
gcloud run services update vibesbnb-api --region us-central1 \
  --update-env-vars="FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\nYOUR_KEY_HERE\n-----END PRIVATE KEY-----\n"

# Set your frontend URL (for CORS)
gcloud run services update vibesbnb-api --region us-central1 \
  --update-env-vars="APP_URL=https://your-vercel-app.vercel.app"
```

#### How to Get Firebase Credentials:

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project (or create a new one)
3. Go to Project Settings (gear icon) → Service Accounts
4. Click "Generate New Private Key"
5. Download the JSON file
6. Extract the values:
   - `project_id` → `FIREBASE_PROJECT_ID`
   - `client_email` → `FIREBASE_CLIENT_EMAIL`
   - `private_key` → `FIREBASE_PRIVATE_KEY`
   - Storage bucket: `your-project-id.appspot.com` → `FIREBASE_STORAGE_BUCKET`

### 2. Update Frontend to Use Live Backend

In your Vercel deployment, set the environment variable:

```
NEXT_PUBLIC_API_URL=https://vibesbnb-api-431043141075.us-central1.run.app/api/v1
```

**In Vercel Dashboard:**
1. Go to your project → Settings → Environment Variables
2. Add: `NEXT_PUBLIC_API_URL` = `https://vibesbnb-api-431043141075.us-central1.run.app/api/v1`
3. Redeploy your frontend

### 3. Test the Connection

Once both are configured:

1. Open your frontend in the browser
2. Try to register/login
3. Check the Network tab to see API calls

### 4. Optional: Set Up Additional Services

#### Stripe (for Payments):
```bash
gcloud run services update vibesbnb-api --region us-central1 \
  --update-env-vars="STRIPE_SECRET_KEY=sk_test_xxx,STRIPE_WEBHOOK_SECRET=whsec_xxx"
```

#### AWS S3 (for File Uploads):
```bash
gcloud run services update vibesbnb-api --region us-central1 \
  --update-env-vars="AWS_ACCESS_KEY_ID=xxx,AWS_SECRET_ACCESS_KEY=xxx,AWS_S3_BUCKET=vibesbnb-media,AWS_REGION=us-east-1"
```

#### Redis (for Job Queue - via Upstash or Redis Labs):
```bash
gcloud run services update vibesbnb-api --region us-central1 \
  --update-env-vars="REDIS_HOST=xxx.upstash.io,REDIS_PORT=6379,REDIS_PASSWORD=xxx"
```

## 🔄 Redeploying Updates

When you make code changes:

```bash
# Build and push new image
gcloud builds submit --config cloudbuild.yaml --timeout=15m .

# Deploy new version
gcloud run deploy vibesbnb-api --image gcr.io/vibesbnb-api-476309/api --platform managed --region us-central1
```

## 📊 Monitoring

View logs:
```bash
gcloud run services logs read vibesbnb-api --region us-central1 --limit 100
```

View service details:
```bash
gcloud run services describe vibesbnb-api --region us-central1
```

## 💰 Cost

With Google Cloud Run's free tier:
- 2 million requests/month
- 360,000 GB-seconds of memory
- 180,000 vCPU-seconds

Your current configuration (1GB memory, 1 CPU) should stay within free tier for development/testing.

## 🐛 Troubleshooting

**API returns 500 errors:**
- Check if Firebase credentials are set correctly
- View logs: `gcloud run services logs read vibesbnb-api --region us-central1`

**CORS errors in frontend:**
- Make sure `APP_URL` is set to your Vercel URL
- Check that CORS is enabled in `main.ts`

**Timeout during deployment:**
- Increase timeout: `gcloud run deploy vibesbnb-api --timeout=300`

## 📝 Important Files Modified

- `apps/api/tsconfig.json` - Fixed to use compiled shared package
- `apps/api/src/messaging/messaging.module.ts` - Added JwtModule import
- `apps/api/src/firebase/firebase.service.ts` - Made Firebase optional for testing

## ✨ What's Working

- ✅ API deployed and accessible
- ✅ All routes initialized
- ✅ Authentication endpoints ready
- ✅ CORS configured
- ✅ WebSocket gateway ready
- ✅ Swagger docs (disabled in production)

## 🚀 What Needs Configuration

- ⚠️ Firebase credentials (for database operations)
- ⚠️ Frontend URL in backend CORS
- ⚠️ Backend URL in frontend API client
- ⚠️ Optional: Stripe, S3, Redis, SendGrid, Twilio

---

**Need help?** Check the logs or refer to [Google Cloud Run Documentation](https://cloud.google.com/run/docs)

