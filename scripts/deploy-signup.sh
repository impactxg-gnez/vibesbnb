#!/bin/bash

# Deploy VibesBNB Signup Site to Vercel
# Usage: npm run deploy:signup

echo "🚀 Deploying VibesBNB Signup Site..."
echo ""

cd apps/web

# Check if vercel is installed
if ! command -v vercel &> /dev/null
then
    echo "❌ Vercel CLI not found. Installing..."
    npm install -g vercel
fi

# Link to signup project if not already linked
if [ ! -f ".vercel/project.json" ]; then
    echo "🔗 Linking to Vercel project..."
    vercel link --project=vibesbnb-signup --yes
fi

# Deploy to production
echo "📦 Building and deploying..."
vercel --prod --yes

echo ""
echo "✅ Signup site deployed successfully!"
echo "📊 Check deployment at: https://vercel.com/dashboard"

