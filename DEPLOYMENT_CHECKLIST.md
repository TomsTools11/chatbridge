# Railway Deployment Checklist

Use this checklist when deploying to Railway.

---

## Pre-Deployment Setup ✅

- [x] Code pushed to GitHub (`main` and `develop` branches)
- [x] GitHub Actions CI/CD workflows configured
- [x] Railway configuration files added (railway.toml, nixpacks.toml)
- [x] Environment variables documented in .env.example

---

## Railway Initial Setup

### 1. Create Railway Project

- [ ] Go to [railway.app](https://railway.app) and create account
- [ ] Click **"New Project"**
- [ ] Select **"Deploy from GitHub repo"**
- [ ] Choose `TomsTools11/chatbridge`
- [ ] Railway will create the project

### 2. Add Database Services

#### PostgreSQL
- [ ] In project → Click **"New"** → **"Database"** → **"PostgreSQL"**
- [ ] Railway auto-provisions
- [ ] Copy `DATABASE_URL` variable reference: `${{Postgres.DATABASE_URL}}`

#### Redis
- [ ] In project → Click **"New"** → **"Database"** → **"Redis"**
- [ ] Railway auto-provisions
- [ ] Copy `REDIS_URL` variable reference: `${{Redis.REDIS_URL}}`

### 3. Configure API Service

- [ ] Click on your **chatbridge** service (the GitHub repo)
- [ ] Go to **Settings** → **General**
- [ ] Set **Root Directory**: Leave empty (monorepo auto-detected)
- [ ] Set **Build Command**: `pnpm install && pnpm db:generate && pnpm build`
- [ ] Set **Start Command**: `cd apps/api && node dist/index.js`

---

## Environment Variables Setup

Go to your API service → **Variables** tab:

### Auto-configured by Railway
- [ ] `DATABASE_URL` = `${{Postgres.DATABASE_URL}}`
- [ ] `REDIS_URL` = `${{Redis.REDIS_URL}}`
- [ ] `PORT` = `3000`

### Slack App (get from api.slack.com/apps)
- [ ] `SLACK_CLIENT_ID` = (from Slack app)
- [ ] `SLACK_CLIENT_SECRET` = (from Slack app)
- [ ] `SLACK_SIGNING_SECRET` = (from Slack app)
- [ ] `SLACK_STATE_SECRET` = (generate with: `openssl rand -hex 32`)

### AWS SES
- [ ] `SES_REGION` = `us-east-1`
- [ ] `SES_ACCESS_KEY_ID` = (from AWS)
- [ ] `SES_SECRET_ACCESS_KEY` = (from AWS)
- [ ] `SES_DOMAIN` = `bridge.yourapp.com`

### AWS S3
- [ ] `S3_BUCKET` = `chatbridge-attachments`
- [ ] `S3_REGION` = `us-east-1`
- [ ] `S3_ACCESS_KEY_ID` = (from AWS)
- [ ] `S3_SECRET_ACCESS_KEY` = (from AWS)

### Security
- [ ] `ENCRYPTION_KEY` = (generate with: `openssl rand -hex 32`)
- [ ] `JWT_SECRET` = (generate with: `openssl rand -hex 32`)

### Application URLs
- [ ] `API_URL` = `https://${{RAILWAY_PUBLIC_DOMAIN}}`
- [ ] `DASHBOARD_URL` = (set later when dashboard is deployed)

### Environment
- [ ] `NODE_ENV` = `production`
- [ ] `LOG_LEVEL` = `info`
- [ ] `VIRUS_SCAN_ENABLED` = `false`
- [ ] `SOCKET_MODE` = `false`

---

## Branch Configuration

### Production Environment (main branch)
- [ ] API service → **Settings** → **Source**
- [ ] Branch: `main`
- [ ] Check **"Auto Deploy"** is enabled
- [ ] Click **"Generate Domain"** for public URL

### Preview Environment (develop branch)
- [ ] Project → **Environments** → **"New Environment"**
- [ ] Name: `Preview`
- [ ] Connect to GitHub branch: `develop`
- [ ] Enable **"Auto Deploy"**
- [ ] Click **"Generate Domain"** for preview URL

---

## Slack App Configuration

Update your Slack app at [api.slack.com/apps](https://api.slack.com/apps):

### OAuth & Permissions
- [ ] Redirect URLs → Add:
  - Production: `https://your-railway-domain.up.railway.app/slack/oauth/callback`
  - Preview: `https://your-preview-domain.up.railway.app/slack/oauth/callback`

### Event Subscriptions
- [ ] Enable Events
- [ ] Request URL:
  - Production: `https://your-railway-domain.up.railway.app/slack/events`
  - Preview: `https://your-preview-domain.up.railway.app/slack/events`
- [ ] Subscribe to bot events: `message.channels`

### Verify URLs
- [ ] Test OAuth flow: Visit `/slack/install`
- [ ] Test events endpoint: Slack will verify when you save the URL

---

## Database Setup

### Run Initial Migration
```bash
# Option 1: Via Railway dashboard
# Go to API service → Deployments → Latest → More → Shell
railway shell
pnpm db:push

# Option 2: Via Railway CLI
railway run pnpm db:push
```

### Seed Database (Optional)
```bash
railway run pnpm --filter @chatbridge/database db:seed
```

---

## Health Checks

### Configure Railway Health Checks
- [ ] API service → **Settings** → **Health Check**
- [ ] Path: `/health/ready`
- [ ] Timeout: `30` seconds
- [ ] Interval: `30` seconds

### Test Endpoints
- [ ] `GET https://your-railway-domain.up.railway.app/health`
- [ ] `GET https://your-railway-domain.up.railway.app/health/ready`

Both should return `200 OK`

---

## Deployment Verification

### Check Deployment Status
- [ ] Railway dashboard shows green checkmark
- [ ] View logs for any errors
- [ ] Check build logs completed successfully

### Test Core Functionality
- [ ] Health endpoint returns OK
- [ ] Slack OAuth redirect works
- [ ] Database connection successful (readiness check passes)
- [ ] Redis connection successful

### Test Slack Integration
- [ ] Visit `/slack/install` → Authorizes successfully
- [ ] Check database has workspace record
- [ ] Slack Events URL verified (green checkmark in Slack app settings)

---

## Monitoring Setup

### View Logs
```bash
# Via Railway CLI
railway logs

# Or in Railway dashboard
Service → Deployments → Click deployment → View logs
```

### Set Up Alerts (Optional)
- [ ] Railway → Project Settings → Notifications
- [ ] Add Slack webhook for deployment alerts
- [ ] Add email for error alerts

---

## Custom Domain (Optional)

### Production Domain
- [ ] Railway → API service → **Settings** → **Networking**
- [ ] Click **"Custom Domain"**
- [ ] Add domain: `api.yourapp.com`
- [ ] Update DNS records per Railway instructions
- [ ] Wait for SSL certificate to provision (automatic)
- [ ] Update `API_URL` environment variable to custom domain

---

## Cost Estimation

| Service | Cost |
|---------|------|
| API (Starter plan) | $5/month |
| PostgreSQL | $5/month |
| Redis | $5/month |
| **Total** | **~$15/month** |

Railway offers **$5 free credit/month**, so actual cost: **~$10/month**

---

## Troubleshooting

### Build Fails
- [ ] Check build logs in Railway dashboard
- [ ] Verify `pnpm-lock.yaml` is committed
- [ ] Ensure `pnpm db:generate` is in build command
- [ ] Check all dependencies are listed in package.json

### Database Connection Error
- [ ] Verify `DATABASE_URL` variable is set correctly
- [ ] Check PostgreSQL service is running (green status)
- [ ] Try restarting API service
- [ ] Check database logs for connection errors

### Slack Webhook Verification Fails
- [ ] Ensure `SLACK_SIGNING_SECRET` is correct
- [ ] Check Railway URL is publicly accessible
- [ ] Verify endpoint returns `200` status
- [ ] Check logs for signature verification errors
- [ ] Make sure webhook URL has `https://` (not `http://`)

### Redis Connection Error
- [ ] Verify `REDIS_URL` is set
- [ ] Check Redis service is running
- [ ] Try restarting API service

---

## Post-Deployment Tasks

### Immediate
- [ ] Test Slack installation flow
- [ ] Create first channel alias (via API or future dashboard)
- [ ] Send test email to alias
- [ ] Verify message appears in Slack

### Short-term
- [ ] Set up error monitoring (Sentry)
- [ ] Configure log aggregation
- [ ] Set up uptime monitoring (UptimeRobot, BetterStack)
- [ ] Document API endpoints

### Medium-term
- [ ] Build admin dashboard
- [ ] Implement worker for background jobs
- [ ] Add comprehensive testing
- [ ] Set up staging environment

---

## Rollback Plan

If deployment fails:

### Rollback to Previous Version
```bash
# Via Railway dashboard
Service → Deployments → Previous deployment → "Rollback to this version"
```

### Rollback via GitHub
```bash
# Revert commit on main branch
git checkout main
git revert HEAD
git push origin main
# Railway will auto-deploy previous version
```

---

## Next Steps After Successful Deployment

1. ✅ Verify all health checks pass
2. ✅ Install Slack app to test workspace
3. ✅ Build Worker application for background jobs
4. ✅ Build Admin Dashboard for alias management
5. ✅ Set up AWS SES for email receiving
6. ✅ Configure SNS webhook to Railway URL
7. ✅ Test end-to-end email → Slack flow
8. ✅ Invite beta testers

---

## Support Resources

- **Railway Docs**: https://docs.railway.app
- **Railway Discord**: https://discord.gg/railway
- **Your Repo**: https://github.com/TomsTools11/chatbridge
- **Setup Guide**: See `RAILWAY_SETUP.md` in repo
