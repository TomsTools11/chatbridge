# ChatBridge - Railway Deployment Guide

This guide will help you deploy ChatBridge to Railway in production.

## Prerequisites

1. Railway account: https://railway.app
2. Railway CLI installed: `npm i -g @railway/cli`
3. GitHub repository connected to Railway

## Architecture

The deployment consists of 5 Railway services:

1. **PostgreSQL** - Database (Railway managed)
2. **Redis** - Queue and cache (Railway managed)
3. **API** - Express server for webhooks and REST API
4. **Worker** - Bull queue processor
5. **Admin Dashboard** - Next.js web interface

## Deployment Steps

### Step 1: Create Railway Project

```bash
# Login to Railway
railway login

# Create new project (or link existing)
railway init

# This will create a new project in Railway
```

### Step 2: Add PostgreSQL Database

```bash
# In Railway dashboard or CLI:
railway add --database postgresql

# Get the connection string
railway variables

# Note: DATABASE_URL will be automatically set
```

### Step 3: Add Redis

```bash
# In Railway dashboard or CLI:
railway add --database redis

# Get the connection string
railway variables

# Note: REDIS_URL will be automatically set
```

### Step 4: Set Environment Variables

You need to set these environment variables in Railway for ALL services:

**Required for all services:**
```bash
NODE_ENV=production
DATABASE_URL=${DATABASE_URL}  # Auto-set by Railway
REDIS_URL=${REDIS_URL}        # Auto-set by Railway
```

**Slack Configuration:**
```bash
SLACK_CLIENT_ID=your-slack-client-id
SLACK_CLIENT_SECRET=your-slack-client-secret
SLACK_SIGNING_SECRET=your-slack-signing-secret
```

**AWS SES Configuration:**
```bash
AWS_SES_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
BRIDGE_EMAIL_FROM=bridge@yourapp.com
```

**Application URLs:**
```bash
API_URL=https://your-api.railway.app
DASHBOARD_URL=https://your-dashboard.railway.app
```

**Security:**
```bash
# Generate with: openssl rand -hex 32
ENCRYPTION_KEY=your-encryption-key
JWT_SECRET=your-jwt-secret
```

**Optional - Alerts:**
```bash
ALERT_EMAIL=alerts@yourapp.com
ALERT_SLACK_WEBHOOK=https://hooks.slack.com/services/xxx
```

**Optional - Virus Scanning:**
```bash
VIRUSTOTAL_API_KEY=your-virustotal-api-key
MAX_FILE_SIZE=10485760
```

### Step 5: Deploy API Service

```bash
# Deploy from root directory
railway up --service api

# Or push to GitHub and Railway will auto-deploy
git push origin main
```

### Step 6: Deploy Worker Service

```bash
# Deploy worker
railway up --service worker
```

### Step 7: Deploy Admin Dashboard

```bash
# Set dashboard-specific env var
railway variables set NEXT_PUBLIC_API_URL=https://your-api.railway.app

# Deploy dashboard
railway up --service admin-dashboard
```

### Step 8: Run Database Migrations

```bash
# Connect to API service
railway run --service api

# Run migrations
pnpm db:push

# Or run seed data (optional)
pnpm db:seed
```

### Step 9: Configure Slack App

1. Go to https://api.slack.com/apps
2. Create new app or update existing
3. **OAuth & Permissions**:
   - Add redirect URL: `https://your-api.railway.app/slack/oauth/callback`
   - Add scopes:
     - `channels:history`
     - `channels:read`
     - `chat:write`
     - `files:read`
     - `files:write`
     - `users:read`
     - `users:read.email`
4. **Event Subscriptions**:
   - Enable events
   - Request URL: `https://your-api.railway.app/slack/events`
   - Subscribe to: `message.channels`
5. **Install to workspace**:
   - Visit: `https://your-api.railway.app/slack/install`

### Step 10: Configure AWS SES

1. **Verify domain** in AWS SES console
2. **Set up receiving rules**:
   - Create receipt rule set
   - Add rule to receive emails
   - Action: SNS topic
   - Configure SNS to POST to: `https://your-api.railway.app/webhooks/email/ses`
3. **Configure DKIM/SPF** for your domain
4. **Request production access** (remove sandbox limits)

### Step 11: Test Deployment

1. **Check health**:
   ```bash
   curl https://your-api.railway.app/health
   ```

2. **Open dashboard**:
   ```
   https://your-dashboard.railway.app
   ```

3. **Install Slack app**:
   ```
   https://your-api.railway.app/slack/install
   ```

4. **Create channel alias** via dashboard

5. **Send test email** to alias address

6. **Verify in dashboard** message logs

## Monitoring

### View Logs

```bash
# API logs
railway logs --service api

# Worker logs
railway logs --service worker

# Dashboard logs
railway logs --service admin-dashboard
```

### Check Service Health

```bash
# API health
curl https://your-api.railway.app/health

# Check ready status
curl https://your-api.railway.app/health/ready
```

## Troubleshooting

### Services not starting

Check logs:
```bash
railway logs --service <service-name>
```

Common issues:
- Missing environment variables
- Database not accessible
- Redis connection failed

### Slack webhook fails

- Verify request URL in Slack app settings
- Check signing secret matches
- View API logs for signature verification errors

### Email webhooks not working

- Verify SNS subscription is confirmed
- Check SES receiving rules are active
- Verify webhook URL is correct
- Check API logs for parsing errors

### Worker not processing messages

- Check Redis connection
- Verify Bull queues are running
- Check worker logs for errors
- Verify queue names match API

## Scaling

Railway auto-scales based on load. You can adjust:

```bash
# Scale API replicas
railway scale --service api --replicas 2

# Scale worker replicas
railway scale --service worker --replicas 2
```

## Costs

Estimated monthly costs:
- PostgreSQL: ~$5-10/month
- Redis: ~$5-10/month
- API + Worker + Dashboard: ~$5-15/month
- **Total**: ~$15-35/month

Plus AWS SES costs (very cheap, $0.10 per 1000 emails).

## Support

- Railway docs: https://docs.railway.app
- ChatBridge issues: https://github.com/TomsTools11/chatbridge/issues
- Slack API docs: https://api.slack.com
- AWS SES docs: https://docs.aws.amazon.com/ses

## Security Checklist

- [ ] All secrets are set as environment variables (not in code)
- [ ] DATABASE_URL uses SSL
- [ ] REDIS_URL uses TLS
- [ ] Slack signing secret is verified
- [ ] CORS is configured properly
- [ ] Rate limiting is enabled (if needed)
- [ ] File upload limits are set
- [ ] Virus scanning is enabled (optional)

## Backup

Railway provides automatic backups for PostgreSQL. To create manual backup:

```bash
# Backup database
railway run pg_dump $DATABASE_URL > backup.sql

# Restore
railway run psql $DATABASE_URL < backup.sql
```

---

**Ready to deploy!** Follow the steps above and your ChatBridge will be live.
