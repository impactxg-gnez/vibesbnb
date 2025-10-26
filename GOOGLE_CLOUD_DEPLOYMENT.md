# Deploy VibesBNB API to Google Cloud Run

## Prerequisites

1. **Google Cloud Account** - Sign up at https://cloud.google.com (Free tier: $300 credit for 90 days)
2. **Install Google Cloud CLI** - https://cloud.google.com/sdk/docs/install

## Step-by-Step Deployment

### 1. Install Google Cloud CLI (gcloud)

**For Windows (PowerShell as Administrator):**
```powershell
(New-Object Net.WebClient).DownloadFile("https://dl.google.com/dl/cloudsdk/channels/rapid/GoogleCloudSDKInstaller.exe", "$env:Temp\GoogleCloudSDKInstaller.exe")
& $env:Temp\GoogleCloudSDKInstaller.exe
```

After installation, restart your terminal.

### 2. Initialize gcloud

```bash
# Login to Google Cloud
gcloud auth login

# Create a new project (or use existing one)
gcloud projects create vibesbnb-api --name="VibesBNB API"

# Set the project
gcloud config set project vibesbnb-api

# Enable required APIs
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable containerregistry.googleapis.com
```

### 3. Build and Deploy

**From the project root directory:**

```bash
# Build the Docker image and push to Google Container Registry
gcloud builds submit --tag gcr.io/vibesbnb-api/api apps/api

# Deploy to Cloud Run
gcloud run deploy vibesbnb-api \
  --image gcr.io/vibesbnb-api/api \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --memory 1Gi \
  --cpu 1 \
  --port 8080 \
  --max-instances 10
```

### 4. Set Environment Variables

```bash
gcloud run services update vibesbnb-api \
  --region us-central1 \
  --set-env-vars="NODE_ENV=production,APP_URL=https://your-frontend-url.vercel.app"
```

**For sensitive variables (recommended):**

```bash
# Firebase credentials
gcloud run services update vibesbnb-api \
  --region us-central1 \
  --set-env-vars="FIREBASE_PROJECT_ID=your-project-id,FIREBASE_CLIENT_EMAIL=your-email,FIREBASE_PRIVATE_KEY=your-key"

# Add all other environment variables
gcloud run services update vibesbnb-api \
  --region us-central1 \
  --set-env-vars="STRIPE_SECRET_KEY=sk_test_...,STRIPE_WEBHOOK_SECRET=whsec_...,JWT_SECRET=your-secret,REFRESH_TOKEN_SECRET=your-secret"
```

### 5. Get Your API URL

After deployment, you'll get a URL like:
```
https://vibesbnb-api-xxxxxxxxxx-uc.a.run.app
```

### 6. Test Your API

```bash
curl https://vibesbnb-api-xxxxxxxxxx-uc.a.run.app/api/v1
```

## Update Deployment

When you push changes to GitHub, redeploy with:

```bash
# Pull latest code
git pull origin main

# Rebuild and redeploy
gcloud builds submit --tag gcr.io/vibesbnb-api/api apps/api && \
gcloud run deploy vibesbnb-api \
  --image gcr.io/vibesbnb-api/api \
  --platform managed \
  --region us-central1
```

## Useful Commands

```bash
# View logs
gcloud run services logs read vibesbnb-api --region us-central1

# View service details
gcloud run services describe vibesbnb-api --region us-central1

# List all services
gcloud run services list

# Delete service
gcloud run services delete vibesbnb-api --region us-central1
```

## Cost Estimate

**Google Cloud Run Free Tier (per month):**
- 2 million requests
- 360,000 GB-seconds of memory
- 180,000 vCPU-seconds

**Your app with 1Gi memory, 1 CPU:**
- ~150 hours/month of runtime (well within free tier)
- Should handle ~100,000+ requests/month for free

## Automatic CI/CD (Optional)

Create `.github/workflows/deploy-gcp.yml`:

```yaml
name: Deploy to Cloud Run

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - id: 'auth'
        uses: 'google-github-actions/auth@v1'
        with:
          credentials_json: '${{ secrets.GCP_SA_KEY }}'
      
      - name: 'Set up Cloud SDK'
        uses: 'google-github-actions/setup-gcloud@v1'
      
      - name: 'Build and Deploy'
        run: |
          gcloud builds submit --tag gcr.io/vibesbnb-api/api apps/api
          gcloud run deploy vibesbnb-api \
            --image gcr.io/vibesbnb-api/api \
            --platform managed \
            --region us-central1
```

## Troubleshooting

**Build fails with out of memory:**
- Cloud Build has 3GB RAM by default, should be plenty

**Service won't start:**
```bash
gcloud run services logs read vibesbnb-api --region us-central1 --limit 50
```

**Port binding issues:**
- Make sure your app listens on `0.0.0.0:8080` (already configured in main.ts)

## Next Steps

1. ✅ Deploy API to Cloud Run
2. ✅ Set all environment variables
3. ✅ Deploy frontend to Vercel
4. ✅ Update frontend API URL to your Cloud Run URL
5. ✅ Test the full application!

