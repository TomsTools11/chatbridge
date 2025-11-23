# Quick Start Guide

## What We've Built

You now have a fully structured monorepo with:

1. **Database layer** with Prisma (PostgreSQL schema for Slack workspaces, channels, messages, etc.)
2. **Slack adapter** with OAuth, Events API, and message formatting
3. **Email adapter** with SES integration and MIME parsing
4. **Shared utilities** for common types, errors, and helpers
5. **API server** with Express routes for Slack OAuth, webhooks, and email receiving

## Installation & Setup

### Step 1: Install dependencies

```bash
pnpm install
```

### Step 2: Set up local services

You'll need PostgreSQL and Redis running. Using Docker:

```bash
# PostgreSQL
docker run -d \
  --name chatbridge-postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=chatbridge \
  -p 5432:5432 \
  postgres:16

# Redis
docker run -d \
  --name chatbridge-redis \
  -p 6379:6379 \
  redis:7
```

### Step 3: Configure environment

```bash
cp .env.example .env
```

Edit `.env`:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/chatbridge"
REDIS_URL="redis://localhost:6379"

# Get these from your Slack app at api.slack.com/apps
SLACK_CLIENT_ID="your_client_id"
SLACK_CLIENT_SECRET="your_client_secret"
SLACK_SIGNING_SECRET="your_signing_secret"

# Generate these with: openssl rand -hex 32
ENCRYPTION_KEY="your_encryption_key_here"
JWT_SECRET="your_jwt_secret_here"

# AWS SES (can configure later)
SES_REGION="us-east-1"
SES_ACCESS_KEY_ID=""
SES_SECRET_ACCESS_KEY=""
SES_DOMAIN="bridge.yourapp.com"

# URLs
API_URL="http://localhost:3000"
DASHBOARD_URL="http://localhost:3001"

NODE_ENV="development"
LOG_LEVEL="info"
```

### Step 4: Initialize database

```bash
# Generate Prisma client
pnpm db:generate

# Push schema to database
pnpm db:push
```

### Step 5: Start the API server

```bash
cd apps/api
pnpm dev
```

The API will start on `http://localhost:3000`.

### Step 6: Test it works

```bash
# Health check
curl http://localhost:3000/health

# Readiness check
curl http://localhost:3000/health/ready
```

## Creating Your Slack App

1. Go to [api.slack.com/apps](https://api.slack.com/apps)
2. Click "Create New App" → "From scratch"
3. Name it "Email Bridge" and select your workspace
4. Go to **OAuth & Permissions**:
   - Add Bot Token Scopes:
     - `channels:history`
     - `channels:read`
     - `chat:write`
     - `files:read`
     - `files:write`
     - `users:read`
     - `users:read.email`
   - Set Redirect URL: `http://localhost:3000/slack/oauth/callback`
5. Go to **Event Subscriptions**:
   - Enable Events
   - Request URL: `http://localhost:3000/slack/events` (you'll need ngrok for local dev)
   - Subscribe to `message.channels`
6. Copy credentials to `.env`

## Using ngrok for Local Development

Since Slack needs to reach your webhooks, use ngrok:

```bash
# Install ngrok
brew install ngrok

# Start tunnel
ngrok http 3000
```

Update your Slack app URLs to use the ngrok URL (e.g., `https://abc123.ngrok.io/slack/events`).

## Installing to Slack

1. Visit `http://localhost:3000/slack/install` (or your ngrok URL)
2. Authorize the app in your workspace
3. You'll be redirected back and the workspace will be stored in the database

## Next Steps

### Immediate (to get working)

1. **Build the Worker app** to process queued jobs:
   - Email → Slack processor
   - Slack → Email processor

2. **Create admin API endpoints**:
   - `POST /api/aliases` - Create channel alias
   - `GET /api/aliases` - List aliases
   - `GET /api/workspaces` - List workspaces

3. **Test end-to-end flow**:
   - Create a channel alias
   - Send test email to that alias
   - Verify message appears in Slack

### Short-term (next 1-2 weeks)

4. **Admin Dashboard** (Next.js):
   - Workspace management UI
   - Channel alias creator
   - Message log viewer

5. **Message Normalizer**:
   - Better HTML ↔ Slack conversion
   - Smarter signature detection
   - User mention mapping

6. **AWS SES Setup**:
   - Domain verification
   - Inbound email rules
   - SNS topic configuration

### Medium-term (weeks 3-6)

7. **Testing**:
   - Unit tests
   - Integration tests
   - E2E tests

8. **Deployment**:
   - Docker containers
   - Railway/Render deployment
   - Environment configs

9. **Beta Testing**:
   - 5 pilot teams
   - Feedback collection
   - Bug fixes

## Architecture Overview

```
┌─────────────┐         ┌─────────────┐
│   Email     │────────▶│     SES     │
│   Client    │         │   Webhook   │
└─────────────┘         └──────┬──────┘
                               │
                               ▼
                        ┌──────────────┐
                        │  API Server  │
                        │  (Express)   │
                        └──────┬───────┘
                               │
                     ┌─────────┴─────────┐
                     │                   │
                     ▼                   ▼
              ┌─────────────┐     ┌─────────────┐
              │ Bull Queue  │     │   Redis     │
              │ (Email→Slack)│     │(Idempotency)│
              └──────┬──────┘     └─────────────┘
                     │
                     ▼
              ┌─────────────┐
              │   Worker    │
              │  Processor  │
              └──────┬──────┘
                     │
          ┌──────────┴──────────┐
          │                     │
          ▼                     ▼
   ┌─────────────┐      ┌─────────────┐
   │  Normalize  │      │   Slack     │
   │   Content   │      │  Web API    │
   └─────────────┘      └─────────────┘
```

## Troubleshooting

### Database connection fails

```bash
# Check PostgreSQL is running
docker ps | grep postgres

# Test connection
psql postgresql://postgres:postgres@localhost:5432/chatbridge
```

### Redis connection fails

```bash
# Check Redis is running
docker ps | grep redis

# Test connection
redis-cli ping
```

### Prisma errors

```bash
# Regenerate client
cd packages/database
pnpm db:generate

# Reset database (caution: loses data)
pnpm db:push --force-reset
```

### Slack webhook verification fails

- Ensure ngrok is running and URL is updated in Slack app
- Check `SLACK_SIGNING_SECRET` is correct in `.env`
- Verify webhook endpoint is accessible

## Support

For issues or questions:
1. Check the [README.md](README.md) for detailed docs
2. Review the PRD in `product-details/`
3. Check API logs in the console
