# Railway Deployment Guide

## Prerequisites

- Railway account ([railway.app](https://railway.app))
- GitHub repository connected to Railway
- This codebase pushed to GitHub

---

## Initial Setup

### 1. Create Railway Project

```bash
# Install Railway CLI (optional, but helpful)
npm install -g @railway/cli

# Login to Railway
railway login

# Link to your project (or create via dashboard)
railway link
```

### 2. Add Required Services

In your Railway dashboard, add these services to your project:

#### PostgreSQL Database
1. Click **"New"** → **"Database"** → **"PostgreSQL"**
2. Railway will auto-provision and provide `DATABASE_URL`
3. No additional configuration needed

#### Redis
1. Click **"New"** → **"Database"** → **"Redis"**
2. Railway will auto-provision and provide `REDIS_URL`
3. No additional configuration needed

#### API Service (this repo)
1. Click **"New"** → **"GitHub Repo"**
2. Select `TomsTools11/chatbridge`
3. Railway will auto-detect the monorepo structure

---

## Environment Variables

In Railway dashboard, go to your **API service** → **Variables** and add:

### Required Variables

```bash
# Database (auto-provided by Railway)
DATABASE_URL=${{Postgres.DATABASE_URL}}
REDIS_URL=${{Redis.REDIS_URL}}

# Slack App Credentials (from api.slack.com/apps)
SLACK_CLIENT_ID=your_client_id_here
SLACK_CLIENT_SECRET=your_client_secret_here
SLACK_SIGNING_SECRET=your_signing_secret_here
SLACK_STATE_SECRET=generate_with_openssl_rand_hex_32

# AWS SES
SES_REGION=us-east-1
SES_ACCESS_KEY_ID=your_aws_access_key
SES_SECRET_ACCESS_KEY=your_aws_secret_key
SES_DOMAIN=bridge.yourapp.com

# AWS S3 (for attachments)
S3_BUCKET=chatbridge-attachments
S3_REGION=us-east-1
S3_ACCESS_KEY_ID=your_s3_access_key
S3_SECRET_ACCESS_KEY=your_s3_secret_key

# Security
ENCRYPTION_KEY=generate_with_openssl_rand_hex_32
JWT_SECRET=generate_with_openssl_rand_hex_32

# Application URLs (will be provided by Railway)
API_URL=${{RAILWAY_PUBLIC_DOMAIN}}
DASHBOARD_URL=https://yourdashboard.railway.app
PORT=3000

# Environment
NODE_ENV=production
LOG_LEVEL=info

# Features
VIRUS_SCAN_ENABLED=false
SOCKET_MODE=false
```

### Generate Secrets

```bash
# Generate ENCRYPTION_KEY
openssl rand -hex 32

# Generate JWT_SECRET
openssl rand -hex 32

# Generate SLACK_STATE_SECRET
openssl rand -hex 32
```

---

## Branch Configuration

### Production (main branch)

1. In Railway dashboard → **API service** → **Settings**
2. Under **Source**, ensure branch is set to `main`
3. Check **"Auto Deploy"** is enabled
4. Every push to `main` will deploy to production

### Preview (develop branch)

1. In Railway dashboard → **API service** → **Settings** → **Environments**
2. Click **"New Environment"** → Name it `Preview`
3. Set branch to `develop`
4. Enable **"Auto Deploy"**
5. This creates a separate preview environment for testing

Railway will give each environment its own URL:
- Production: `https://chatbridge-production.up.railway.app`
- Preview: `https://chatbridge-preview.up.railway.app`

---

## Domain Setup (Optional)

### Custom Domain for Production

1. In Railway → **API service** → **Settings** → **Networking**
2. Click **"Generate Domain"** or **"Custom Domain"**
3. Add your domain: `api.yourapp.com`
4. Update DNS records as instructed by Railway
5. Update `API_URL` environment variable

---

## Database Migrations

Railway will automatically run migrations on deploy if you add this to your build command:

Update `railway.toml`:

```toml
[build]
builder = "NIXPACKS"
buildCommand = "pnpm install && pnpm db:generate && pnpm db:push && pnpm build"
```

Or run manually via Railway CLI:

```bash
railway run pnpm db:push
```

---

## Monitoring & Logs

### View Logs
```bash
# Via CLI
railway logs

# Or in dashboard → Service → Deployments → Click deployment → View logs
```

### Health Checks

Railway will automatically monitor:
- `GET /health` - Liveness probe
- `GET /health/ready` - Readiness probe (DB + Redis)

Configure in Railway → **Service** → **Settings** → **Health Checks**:
- **Health Check Path**: `/health/ready`
- **Health Check Timeout**: 30s

---

## Slack App Configuration

Once Railway deploys, update your Slack app URLs:

1. Go to [api.slack.com/apps](https://api.slack.com/apps)
2. Select your app
3. **OAuth & Permissions** → Redirect URLs:
   - Production: `https://your-railway-url.up.railway.app/slack/oauth/callback`
   - Preview: `https://your-preview-url.up.railway.app/slack/oauth/callback`
4. **Event Subscriptions** → Request URL:
   - Production: `https://your-railway-url.up.railway.app/slack/events`
   - Preview: `https://your-preview-url.up.railway.app/slack/events`

---

## Deployment Workflow

### Deploy to Preview (develop branch)

```bash
git checkout develop
git add .
git commit -m "feat: new feature"
git push origin develop
# Railway auto-deploys to preview environment
```

### Deploy to Production (main branch)

```bash
git checkout main
git merge develop
git push origin main
# Railway auto-deploys to production
# GitHub Actions runs CI tests first
```

---

## Scaling

### Vertical Scaling (More Resources)

Railway → **Service** → **Settings** → **Resources**:
- Increase Memory (default: 512MB → 1GB or 2GB)
- Increase CPU (shared → dedicated)

### Horizontal Scaling (Multiple Instances)

Railway → **Service** → **Settings** → **Replicas**:
- Set replica count (2-10 instances)
- Railway handles load balancing automatically

---

## Troubleshooting

### Build Fails

Check build logs in Railway dashboard:
```bash
railway logs --deployment <deployment-id>
```

Common issues:
- Missing environment variables
- Prisma client not generated → Add `pnpm db:generate` to build command
- Dependencies not installed → Check `pnpm-lock.yaml` is committed

### Database Connection Fails

1. Verify `DATABASE_URL` is set: `railway variables`
2. Check PostgreSQL service is running
3. Test connection: `railway run pnpm db:studio`

### Redis Connection Fails

1. Verify `REDIS_URL` is set
2. Check Redis service is running
3. Test: `railway run node -e "const redis = require('redis'); redis.createClient(process.env.REDIS_URL).connect().then(() => console.log('✓ Redis OK'))"`

### Slack Webhooks Fail

1. Ensure `SLACK_SIGNING_SECRET` is correct
2. Check Railway URL is publicly accessible
3. Verify Slack app Request URL matches Railway domain
4. Check logs for signature verification errors

---

## Cost Optimization

Railway pricing is based on:
- **Compute**: $10/month per service (API)
- **Databases**: $5/month for PostgreSQL + $5/month for Redis
- **Free tier**: $5 credit/month

**Total estimated cost**: ~$15-20/month for MVP

### Tips to Reduce Costs:
1. Use shared PostgreSQL for dev/preview
2. Scale down resources when not in use
3. Use Railway's sleep feature for preview environments
4. Monitor usage in Railway dashboard

---

## Next Steps After Deployment

1. ✅ Verify health endpoints work
2. ✅ Install Slack app via `/slack/install`
3. ✅ Create first channel alias via API or dashboard
4. ✅ Test email → Slack flow
5. ✅ Monitor logs for errors
6. ✅ Set up Sentry for error tracking (optional)

---

## Railway CLI Commands

```bash
# View status
railway status

# View logs
railway logs

# Run commands in Railway environment
railway run pnpm db:studio

# SSH into container
railway shell

# View environment variables
railway variables

# Open dashboard
railway open
```
