#!/bin/bash

# Deploy both VibesBNB projects to Vercel
# Usage: npm run deploy:all

echo "🚀 Deploying Both VibesBNB Projects..."
echo ""
echo "================================================"
echo "📝 This will deploy:"
echo "  1. Signup Site (vibesbnb-signup)"
echo "  2. Main Web App (vibesbnb-web)"
echo "================================================"
echo ""

# Deploy signup site
echo "1️⃣  Deploying Signup Site..."
./scripts/deploy-signup.sh

echo ""
echo "================================================"
echo ""

# Deploy main web app
echo "2️⃣  Deploying Main Web App..."
./scripts/deploy-web.sh

echo ""
echo "================================================"
echo "✅ All deployments complete!"
echo "================================================"

