#!/bin/bash

# Deploy VibesBNB Main Web App to Vercel
# Usage: npm run deploy:web

echo "🚀 Deploying VibesBNB Main Web App..."
echo ""

cd apps/web

# Check if vercel is installed
if ! command -v vercel &> /dev/null
then
    echo "❌ Vercel CLI not found. Installing..."
    npm install -g vercel
fi

# Link to web project if not already linked
if [ ! -f ".vercel/project.json" ]; then
    echo "🔗 Linking to Vercel project..."
    vercel link --project=vibesbnb-web --yes
fi

# Deploy to production
echo "📦 Building and deploying..."
vercel --prod --yes

echo ""
echo "✅ Main web app deployed successfully!"
echo "📊 Check deployment at: https://vercel.com/dashboard"

