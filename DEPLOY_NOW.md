# Deploy ChatBridge to Railway - Quick Start

Follow these steps to deploy ChatBridge to Railway in the next 15-20 minutes.

## Step 1: Install Railway CLI (if not installed)

```bash
npm install -g @railway/cli
```

## Step 2: Login to Railway

```bash
railway login
```

This will open your browser to authenticate.

## Step 3: Create New Project

```bash
# From the chatbridge directory
cd /path/to/chatbridge
railway init
```

Choose "Create new project" and name it `chatbridge`.

## Step 4: Add Databases

### Add PostgreSQL:
```bash
railway add -d postgresql
```

### Add Redis:
```bash
railway add -d redis
```

## Step 5: Set Environment Variables

Go to Railway dashboard: https://railway.app/dashboard

For each service (API, Worker, Dashboard), add these variables:

### API Service Variables:
```
NODE_ENV=production
SLACK_CLIENT_ID=<your-slack-client-id>
SLACK_CLIENT_SECRET=<your-slack-client-secret>
SLACK_SIGNING_SECRET=<your-slack-signing-secret>
AWS_SES_REGION=us-east-1
AWS_ACCESS_KEY_ID=<your-aws-key>
AWS_SECRET_ACCESS_KEY=<your-aws-secret>
BRIDGE_EMAIL_FROM=bridge@yourapp.com
ENCRYPTION_KEY=<generate with: openssl rand -hex 32>
JWT_SECRET=<generate with: openssl rand -hex 32>
```

### Worker Service Variables:
(Same as API service variables)

### Dashboard Service Variables:
```
NEXT_PUBLIC_API_URL=<your-api-url-from-railway>
```

## Step 6: Link GitHub Repository

1. Go to Railway dashboard
2. Click on your project
3. Click "New Service"
4. Select "GitHub Repo"
5. Connect your GitHub account
6. Select the `chatbridge` repository
7. Railway will auto-detect and deploy

**OR** Deploy manually:

```bash
# Deploy API
railway up

# Deploy will happen automatically from GitHub
```

## Step 7: Configure Service Roots

In Railway dashboard, for each service:

1. **API Service**: Set root directory to `apps/api`
2. **Worker Service**: Set root directory to `apps/worker`
3. **Dashboard Service**: Set root directory to `apps/admin-dashboard`

## Step 8: Run Migrations

```bash
# Connect to API service and run migrations
railway run --service api pnpm db:push
```

## Step 9: Get Your URLs

```bash
railway domain
```

You'll get URLs like:
- API: `https://chatbridge-api-production.up.railway.app`
- Dashboard: `https://chatbridge-dashboard-production.up.railway.app`

## Step 10: Configure Slack App

1. Go to https://api.slack.com/apps
2. Create new app (if you haven't)
3. **OAuth & Permissions** → Add redirect URL:
   ```
   https://your-api-url.railway.app/slack/oauth/callback
   ```
4. **Event Subscriptions** → Request URL:
   ```
   https://your-api-url.railway.app/slack/events
   ```
5. **Scopes**: Add these bot token scopes:
   - `channels:history`
   - `channels:read`
   - `chat:write`
   - `files:read`
   - `files:write`
   - `users:read`
   - `users:read.email`

## Step 11: Test It!

1. Visit your dashboard: `https://your-dashboard-url.railway.app`
2. Install Slack app: `https://your-api-url.railway.app/slack/install`
3. Create a channel alias in the dashboard
4. Send a test email to the alias
5. Watch it appear in Slack!

---

## Troubleshooting

**Deployment failed?**
```bash
railway logs
```

**Can't connect to database?**
- Check DATABASE_URL is set
- Check PostgreSQL service is running

**Slack webhook not working?**
- Verify signing secret matches
- Check API logs: `railway logs --service api`

**Dashboard shows "Failed to fetch"?**
- Check NEXT_PUBLIC_API_URL is set correctly
- Make sure API service is running

---

## Quick Commands

```bash
# View all services
railway status

# View logs
railway logs --service api
railway logs --service worker
railway logs --service admin-dashboard

# Open dashboard
railway open

# Run command in service
railway run --service api <command>
```

---

## Need Help?

- Check logs: `railway logs`
- Railway docs: https://docs.railway.app
- Slack API docs: https://api.slack.com
- GitHub issues: https://github.com/TomsTools11/chatbridge/issues

**Your ChatBridge will be live in minutes!** 🚀
