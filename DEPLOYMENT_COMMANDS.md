# 🚀 Vercel Deployment Commands Cheat Sheet

## Quick Reference

### Deploy Commands

```bash
# Deploy signup site
npm run deploy:signup

# Deploy main web app
npm run deploy:web

# Deploy both at once
npm run deploy:all

# Push to trigger automatic deployment
git push origin main
```

---

## Initial Setup (One Time Only)

### Install Vercel CLI
```bash
npm install -g vercel
```

### Login to Vercel
```bash
vercel login
```

### Create Projects via Dashboard
1. Visit: https://vercel.com/new
2. Import repository
3. Create `vibesbnb-signup` project
4. Create `vibesbnb-web` project

---

## Vercel CLI Commands

### Project Management
```bash
# Link to a project
vercel link --project=vibesbnb-signup

# Check current project
cat .vercel/project.json

# List all deployments
vercel list

# List projects
vercel projects list
```

### Deployment
```bash
# Deploy to production
vercel --prod

# Deploy preview
vercel

# Deploy specific project
vercel --prod --scope=vibesbnb-signup

# Deploy with specific token
vercel --prod --token=YOUR_TOKEN
```

### Environment Variables
```bash
# Add environment variable
vercel env add NEXT_PUBLIC_API_URL production

# List environment variables
vercel env ls

# Pull environment variables to local
vercel env pull .env.local

# Remove environment variable
vercel env rm NEXT_PUBLIC_API_URL production
```

### Logs & Monitoring
```bash
# View deployment logs
vercel logs <deployment-url>

# Stream logs in real-time
vercel logs <deployment-url> --follow

# View build logs
vercel logs <deployment-url> --build
```

### Rollback & Management
```bash
# Rollback to previous deployment
vercel rollback

# Remove a deployment
vercel remove <deployment-url>

# Promote deployment to production
vercel promote <deployment-url>
```

### Domains
```bash
# List domains
vercel domains ls

# Add domain to project
vercel domains add signup.vibesbnb.com

# Remove domain
vercel domains rm signup.vibesbnb.com
```

---

## Git Workflow

### Automatic Deployments
```bash
# Production deployment (main branch)
git add .
git commit -m "feat: add new feature"
git push origin main
# ✅ Auto-deploys to both projects

# Preview deployment (feature branch)
git checkout -b feature/new-feature
git add .
git commit -m "feat: work in progress"
git push origin feature/new-feature
# ✅ Creates preview deployments
```

### Manual Deployment Trigger
```bash
# Trigger deployment without code changes
git commit --allow-empty -m "trigger deployment"
git push origin main
```

---

## Local Testing

### Build & Test Locally
```bash
# Build the project
npm run build

# Test production build
npm run start

# Run in development
npm run dev
```

### Test Specific Pages
```bash
# Visit in browser after running dev or start:
http://localhost:3000/coming-soon
http://localhost:3000/early-access?category=host
http://localhost:3000/thank-you?category=host
```

---

## Environment Variables Reference

### Required for Both Projects
```bash
NEXT_PUBLIC_API_URL=https://api.vibesbnb.com
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
```

### Additional for Main Web Project
```bash
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
NEXT_PUBLIC_SOCKET_URL=wss://api.vibesbnb.com
```

### Set via CLI
```bash
# Add single variable
vercel env add NEXT_PUBLIC_API_URL production
# Enter value when prompted

# Add from file
vercel env add NEXT_PUBLIC_API_URL production < .env.production
```

---

## Troubleshooting Commands

### Check Build Status
```bash
# View recent deployments
vercel list

# Get deployment info
vercel inspect <deployment-url>

# Check project settings
vercel project ls
```

### Debug Build Issues
```bash
# Test build locally
cd apps/web
npm run build

# View detailed logs
vercel logs <deployment-url> --follow

# Pull production environment
vercel env pull .env.production --environment=production
```

### Clear & Retry
```bash
# Clear Vercel cache
rm -rf .vercel
rm -rf apps/web/.vercel

# Re-link project
cd apps/web
vercel link --project=vibesbnb-signup

# Redeploy
vercel --prod --force
```

---

## Advanced Commands

### Deploy Specific Branch
```bash
# Deploy feature branch to production
git checkout feature/new-feature
vercel --prod --force
```

### Deploy with Custom Build Command
```bash
vercel --prod --build-env NODE_ENV=production
```

### Deploy to Specific Region
```bash
# Set in vercel.json
{
  "regions": ["sfo1", "iad1"]
}
```

### Inspect Deployment
```bash
# Get deployment details
vercel inspect <deployment-url>

# Get deployment ID
vercel list --meta

# View deployment source
vercel inspect <deployment-url> --source
```

---

## CI/CD Integration

### GitHub Actions
```yaml
# .github/workflows/deploy.yml
name: Deploy to Vercel
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Deploy to Vercel
        run: |
          npm install -g vercel
          vercel --prod --token=${{ secrets.VERCEL_TOKEN }}
```

### Environment Secrets
```bash
# Add to GitHub Secrets:
VERCEL_TOKEN=<your-vercel-token>
VERCEL_ORG_ID=<your-org-id>
VERCEL_PROJECT_ID=<your-project-id>
```

---

## Monitoring Commands

### Real-Time Monitoring
```bash
# Watch deployments
watch -n 5 vercel list

# Stream logs
vercel logs <deployment-url> --follow

# Check status
vercel inspect <deployment-url>
```

### Performance
```bash
# View analytics (requires Pro plan)
vercel analytics

# View web vitals
# Visit: https://vercel.com/dashboard/analytics
```

---

## Quick Fixes

### Deployment Stuck
```bash
# Cancel deployment
vercel cancel <deployment-url>

# Retry with force
vercel --prod --force
```

### Environment Variables Not Working
```bash
# Pull and verify
vercel env pull .env.local --environment=production
cat .env.local

# Re-add variable
vercel env rm VARIABLE_NAME production
vercel env add VARIABLE_NAME production

# Redeploy
vercel --prod
```

### Domain Issues
```bash
# Remove and re-add domain
vercel domains rm signup.vibesbnb.com
vercel domains add signup.vibesbnb.com

# Verify DNS
vercel domains inspect signup.vibesbnb.com
```

---

## Useful URLs

| Purpose | URL |
|---------|-----|
| Dashboard | https://vercel.com/dashboard |
| New Project | https://vercel.com/new |
| Analytics | https://vercel.com/dashboard/analytics |
| Settings | https://vercel.com/dashboard/settings |
| Docs | https://vercel.com/docs |
| Status | https://vercel-status.com |

---

## Keyboard Shortcuts (Dashboard)

| Key | Action |
|-----|--------|
| `G` + `D` | Go to Dashboard |
| `G` + `P` | Go to Projects |
| `C` | Create New Project |
| `/` | Search |
| `?` | Show Help |

---

## Pro Tips

1. **Use aliases**: Create project aliases for quick switching
2. **Save tokens**: Store Vercel token in environment for CI/CD
3. **Preview branches**: Always test in preview before production
4. **Monitor costs**: Check usage in Settings → Usage
5. **Protect main**: Set up branch protection to require reviews

---

## Common Workflows

### New Feature Development
```bash
# Create feature branch
git checkout -b feature/new-feature

# Make changes
# ... edit files ...

# Deploy preview
git push origin feature/new-feature
# ✅ Vercel creates preview URL

# Review preview
# Visit preview URL

# Merge to main
git checkout main
git merge feature/new-feature
git push origin main
# ✅ Auto-deploys to production
```

### Hotfix Deployment
```bash
# Quick fix
git checkout -b hotfix/urgent-fix
# ... make fix ...
git commit -am "fix: urgent issue"

# Deploy immediately
cd apps/web
vercel --prod --force

# Then merge
git checkout main
git merge hotfix/urgent-fix
git push origin main
```

---

**Last Updated**: November 2025

