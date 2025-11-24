# Development Session Notes - Email ↔ Slack Bridge MVP

**Last Updated**: 2025-11-23
**Session**: Initial MVP Setup & GitHub/Railway Configuration

---

## What We Built Today

### ✅ Complete Foundation (100%)

**1. Monorepo Architecture**
- Turborepo + pnpm workspaces configuration
- TypeScript setup across all packages
- Build pipeline with proper caching
- Development scripts ready

**2. Database Layer** (`packages/database/`)
- Complete Prisma schema with 8 models:
  - `User` - Admin users with roles
  - `SlackWorkspace` - Connected Slack teams with OAuth tokens
  - `EmailConnection` - SES/SendGrid configurations
  - `ChannelAlias` - Email addresses mapped to Slack channels
  - `ConversationMap` - Bidirectional thread mapping (email ↔ Slack)
  - `MessageLog` - Delivery tracking with retry status
  - `AuditLog` - Admin action history
  - `FileObject` - Attachment metadata with virus scan status
- Database client with singleton pattern
- Health check utilities
- Seed script for demo data

**3. Slack Integration** (`packages/slack-adapter/`)
- Full Slack Web API client wrapper
- OAuth 2.0 installation flow (multi-workspace support)
- Events API webhook handling with signature verification
- Message formatting (Slack mrkdwn ↔ HTML bidirectional)
- User/channel information retrieval
- File upload/download
- Signature and quote stripping utilities
- Message filtering (bots, edits, deletes)

**4. Email Integration** (`packages/email-adapter/`)
- AWS SES client for sending emails
- MIME email parser (using mailparser)
- Email builder with proper threading headers (In-Reply-To, References)
- SES webhook payload parsing
- HTML text extraction
- Signature and quoted text removal
- Thread ID extraction from headers

**5. Shared Utilities** (`packages/shared/`)
- TypeScript types for messages, attachments, contexts
- Custom error classes (SlackAPIError, EmailDeliveryError, etc.)
- Zod validators for API inputs
- Utility functions:
  - Trace ID generation
  - Email alias generation
  - Retry logic with exponential backoff
  - Email parsing helpers
- Constants (Redis keys, rate limits, file size limits)

**6. API Server** (`apps/api/`)
- Express.js application with TypeScript
- Middleware: CORS, Helmet, Pino logging, error handling
- Health check endpoints (`/health`, `/health/ready`)
- Slack OAuth routes:
  - `GET /slack/install` - OAuth installation URL
  - `GET /slack/oauth/callback` - OAuth callback handler
  - `POST /slack/events` - Events API webhook with signature verification
- Email webhook:
  - `POST /webhooks/email/ses` - SES inbound email handler
- Bull queue initialization for background jobs
- Redis integration for idempotency
- Structured logging with request correlation

**7. CI/CD & Deployment**
- GitHub Actions workflows:
  - `ci.yml` - Lint, type check, tests (PostgreSQL + Redis)
  - `deploy-production.yml` - Auto-deploy on push to `main`
  - `deploy-preview.yml` - Auto-deploy on push to `develop`
- Railway configuration:
  - `railway.toml` - Service configuration
  - `nixpacks.toml` - Build optimization (Node 20 + pnpm)
  - Environment variable templates
- Git branches:
  - `main` - Production
  - `develop` - Preview/staging

**8. Documentation**
- `README.md` - Full architecture, features, setup guide
- `QUICKSTART.md` - Step-by-step getting started
- `PROJECT_STATUS.md` - Detailed completion status and roadmap
- `RAILWAY_SETUP.md` - Complete Railway deployment guide
- `DEPLOYMENT_CHECKLIST.md` - Interactive deployment checklist
- `.env.example` - All required environment variables

---

## Current Status

### Repository
- **GitHub**: https://github.com/TomsTools11/chatbridge
- **Branches**: `main` (production), `develop` (preview)
- **Last commit**: Added deployment checklist
- **CI/CD**: Active and ready

### What Works Now
✅ API server starts locally
✅ Database schema ready for migrations
✅ Slack OAuth flow implemented
✅ Email parsing ready
✅ Message queuing configured
✅ Health checks functional

### What's NOT Built Yet
❌ Worker application (processes queued messages)
❌ Admin dashboard (Next.js UI)
❌ Message normalizer (advanced content conversion)
❌ Actual message processing logic
❌ Attachment virus scanning
❌ Tests

---

## Critical Next Steps (Priority Order)

### 🔥 PHASE 1: Core Functionality (Week 1-2)
**Status**: NOT STARTED

#### 1.1 Build Worker Application (`apps/worker/`)
**Why**: The API just queues messages - worker processes them

Must implement:
- **Email → Slack Processor**:
  1. Dequeue job from `email-to-slack` Bull queue
  2. Lookup `ChannelAlias` by recipient email
  3. Check idempotency in Redis (`idempotent:email:{messageId}`)
  4. Resolve thread:
     - Extract thread ID from email headers (In-Reply-To/References)
     - Query `ConversationMap` for existing Slack thread_ts
     - Create new conversation if none exists
  5. Normalize content:
     - Use `cleanEmailContent()` from email-adapter
     - Convert HTML → Slack mrkdwn with `htmlToSlack()`
     - Create blocks with `createEmailMessageBlocks()`
  6. Process attachments:
     - Download from email
     - Virus scan (VirusTotal API or ClamAV)
     - Upload to Slack or S3
  7. Post to Slack:
     - Use SlackClient.postMessage()
     - Include thread_ts for replies
     - Add metadata for tracking
  8. Update database:
     - Insert/update `ConversationMap`
     - Insert `MessageLog` with status
  9. Cache in Redis for idempotency

- **Slack → Email Processor**:
  1. Dequeue job from `slack-to-email` Bull queue
  2. Lookup `ChannelAlias` by channel_id
  3. Check idempotency in Redis (`idempotent:slack:{ts}`)
  4. Resolve thread and recipients:
     - Query `ConversationMap` by slack_thread_ts
     - Get participant emails from conversation
     - If new thread, use alias.recipients (configured per alias)
  5. Get Slack user info for sender name
  6. Normalize content:
     - Convert mrkdwn → HTML with `slackToHtml()`
     - Build email HTML with `buildEmailHtml()`
  7. Process attachments:
     - Download from Slack CDN
     - Virus scan
     - Attach to email or upload to S3
  8. Send email:
     - Build MIME with proper headers (References, In-Reply-To)
     - Send via SES
     - Store returned Message-ID
  9. Update database:
     - Insert/update `ConversationMap`
     - Insert `MessageLog`
  10. Cache in Redis

- **DLQ Handler**:
  - Process failed jobs after max retries
  - Log to database with error details
  - Send alert (email/Slack notification)

**Files to create**:
```
apps/worker/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts (Bull processor setup)
│   ├── processors/
│   │   ├── email-to-slack.ts
│   │   ├── slack-to-email.ts
│   │   └── dlq-handler.ts
│   ├── services/
│   │   ├── idempotency.ts (Redis checks)
│   │   ├── thread-resolver.ts (conversation mapping)
│   │   ├── attachment-handler.ts (virus scan, upload)
│   │   └── notification.ts (alerts)
│   └── utils/
│       └── logger.ts
```

#### 1.2 Add Admin API Endpoints
**Why**: Need API to create/manage aliases without database access

Routes to add to `apps/api/src/routes/`:

```typescript
// routes/aliases.ts
POST   /api/aliases          - Create channel alias
GET    /api/aliases          - List all aliases (paginated)
GET    /api/aliases/:id      - Get single alias
PATCH  /api/aliases/:id      - Update alias (pause/resume, edit recipients)
DELETE /api/aliases/:id      - Delete alias

// routes/workspaces.ts
GET    /api/workspaces       - List connected workspaces
GET    /api/workspaces/:id   - Get workspace details
GET    /api/workspaces/:id/channels - List channels in workspace
DELETE /api/workspaces/:id   - Disconnect workspace

// routes/messages.ts
GET    /api/messages         - Message log (paginated, filterable)
GET    /api/messages/:id     - Get message details
POST   /api/messages/:id/retry - Retry failed message

// routes/audit.ts
GET    /api/audit            - Audit log (paginated, filterable)
```

#### 1.3 Test End-to-End Flow
1. Start local services (Postgres, Redis)
2. Start API: `cd apps/api && pnpm dev`
3. Start Worker: `cd apps/worker && pnpm dev`
4. Use ngrok to expose webhooks
5. Install Slack app to test workspace
6. Create channel alias via API: `POST /api/aliases`
7. Send test email to alias
8. Verify message appears in Slack
9. Reply in Slack thread
10. Verify email sent to participants

---

### 🎨 PHASE 2: Admin Dashboard (Week 2-3)
**Status**: NOT STARTED

Create Next.js app in `apps/admin-dashboard/`:

**Pages needed**:
- `/` - Dashboard home (stats, health)
- `/workspaces` - Manage Slack workspaces
- `/aliases` - Create/manage channel aliases
- `/messages` - Message log viewer with filters
- `/audit` - Audit log viewer
- `/settings` - Email connection config

**Key features**:
- Authentication (NextAuth with email/password)
- shadcn/ui components
- Real-time stats (SWR or React Query)
- Onboarding wizard for new users

---

### 🧪 PHASE 3: Testing & AWS Setup (Week 3-4)
**Status**: NOT STARTED

**Testing**:
- Unit tests for adapters
- Integration tests for processors
- E2E tests with real Slack workspace
- Load testing (1000 messages)

**AWS SES**:
- Domain verification
- Inbound receiving rules (SNS → API webhook)
- DKIM/SPF configuration
- Bounce/complaint handling

**Deployment**:
- Railway production deployment
- Environment variable setup
- Database migrations
- Monitoring (Sentry, logs)

---

### 🚀 PHASE 4: Beta Launch (Week 4-6)
**Status**: NOT STARTED

- Recruit 5 pilot teams
- Onboarding support
- Feedback collection
- Bug fixes and iteration

---

## Technical Decisions Made

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Chat platform | Slack (not Google Chat) | Better APIs, larger market, easier distribution |
| Channel scope | Channels only (no DMs) | Simpler for MVP, add DMs later |
| Email domain | Shared bridge domain | `alias@bridge.yourapp.com` (not custom domains yet) |
| Channel types | Public + Private | Bot just needs invitation |
| Recipient strategy | Only existing thread participants | For Slack→Email, only send to users already in email thread |
| Enterprise Grid | Supported from day 1 | Enable org-wide deployment |
| Database | PostgreSQL | Strong consistency for conversation mapping |
| Queue | Bull + Redis | Proven reliability, good observability |
| Email provider | AWS SES | Cost-effective, 50k emails/month free |
| Deployment | Railway | Easy setup, auto-scaling, affordable (~$15/month) |

---

## Environment Setup Reference

### Local Development
```bash
# Prerequisites
- Node.js 20+
- pnpm 8+
- PostgreSQL 14+ (Docker: see QUICKSTART.md)
- Redis 6+ (Docker: see QUICKSTART.md)

# Install
pnpm install

# Database
pnpm db:generate
pnpm db:push

# Start API
cd apps/api
pnpm dev

# Start Worker (when built)
cd apps/worker
pnpm dev
```

### Railway Production
See `DEPLOYMENT_CHECKLIST.md` for step-by-step guide.

**Required Services**:
- PostgreSQL (Railway managed)
- Redis (Railway managed)
- API service (auto-deployed from GitHub)
- Worker service (TODO - will deploy when built)

**Environment Variables** (see `.env.example`):
- Slack: CLIENT_ID, CLIENT_SECRET, SIGNING_SECRET
- AWS: SES + S3 credentials
- Security: ENCRYPTION_KEY, JWT_SECRET
- URLs: API_URL, DASHBOARD_URL

---

## Key Files Reference

### Configuration
- `turbo.json` - Turborepo build pipeline
- `pnpm-workspace.yaml` - Workspace definition
- `.env.example` - Environment variables template
- `railway.toml` - Railway deployment config
- `nixpacks.toml` - Build optimization

### Database
- `packages/database/prisma/schema.prisma` - Full schema
- `packages/database/src/index.ts` - Prisma client

### Adapters
- `packages/slack-adapter/src/client.ts` - Slack API wrapper
- `packages/slack-adapter/src/oauth.ts` - OAuth flow
- `packages/slack-adapter/src/formatter.ts` - mrkdwn ↔ HTML
- `packages/email-adapter/src/ses-client.ts` - SES wrapper
- `packages/email-adapter/src/parser.ts` - Email parsing
- `packages/email-adapter/src/builder.ts` - MIME building

### API
- `apps/api/src/index.ts` - Express server
- `apps/api/src/routes/slack.ts` - OAuth + webhooks
- `apps/api/src/routes/email.ts` - SES webhook
- `apps/api/src/routes/health.ts` - Health checks

### Documentation
- `README.md` - Architecture overview
- `QUICKSTART.md` - Getting started
- `PROJECT_STATUS.md` - Detailed status
- `RAILWAY_SETUP.md` - Railway guide
- `DEPLOYMENT_CHECKLIST.md` - Deployment steps
- `SESSION_NOTES.md` - This file

---

## Open Questions / Pending Decisions

1. **Virus Scanning**: VirusTotal API (easier) or ClamAV Docker (more control)?
   - Recommendation: VirusTotal API for MVP

2. **Worker Deployment**: Same container as API or separate Railway service?
   - Recommendation: Separate service for independent scaling

3. **Authentication**: Email/password or Slack OAuth for admin dashboard?
   - Recommendation: Email/password for MVP, add Slack OAuth later

4. **File Storage**: S3 for all files or use Slack CDN for Slack attachments?
   - Recommendation: S3 for email attachments, Slack CDN for Slack files

5. **Monitoring**: Just Sentry or add Prometheus + Grafana?
   - Recommendation: Sentry for errors + simple Prometheus metrics

---

## Known Issues / Tech Debt

- [ ] No tests written yet
- [ ] Prisma client should be generated in Docker build (not at runtime)
- [ ] Environment variables not encrypted in database (ENCRYPTION_KEY not used yet)
- [ ] No rate limiting implemented (just constants defined)
- [ ] Bull queue doesn't have Redis connection pooling configured
- [ ] Error handling needs standardization across packages
- [ ] Logging format not consistent (some use Pino, some use console)
- [ ] No graceful shutdown for Bull queues in API server

---

## When You Return

### To Resume Development:

1. **Pull latest code**:
   ```bash
   cd /Users/tpanos/TProjects/chatbridgemvp
   git pull origin main
   ```

2. **Review this file** for context

3. **Check PROJECT_STATUS.md** for detailed TODO list

4. **Next immediate task**: Build Worker Application
   - Start with `apps/worker/package.json`
   - Implement email→slack processor first
   - Test locally before deploying

5. **If deploying to Railway**:
   - Follow `DEPLOYMENT_CHECKLIST.md` step-by-step
   - Set up PostgreSQL + Redis services first
   - Configure environment variables
   - Let Railway auto-deploy from GitHub

### Quick Start Commands:
```bash
# Start local development
docker-compose up -d     # Start Postgres + Redis (if you create docker-compose.yml)
pnpm install
pnpm db:generate
pnpm db:push
cd apps/api && pnpm dev

# Deploy to Railway
# Follow DEPLOYMENT_CHECKLIST.md

# View logs
git log --oneline
railway logs (if Railway CLI installed)
```

---

## Metrics to Track (When Live)

### Reliability Targets
- Message delivery success: ≥95%
- Duplicate message rate: <1%
- Median E2E latency: <5s
- P95 E2E latency: <15s
- Uptime: ≥99.9%

### Setup Targets
- Median onboarding time: <20 minutes
- Installation success rate: >90%

### Adoption Targets
- Pilot teams: 5
- Messages/day: 1,000+
- Email participant NPS: ≥8

---

## Contact / Support

- **GitHub Issues**: https://github.com/TomsTools11/chatbridge/issues
- **Railway Docs**: https://docs.railway.app
- **Slack API Docs**: https://api.slack.com
- **AWS SES Docs**: https://docs.aws.amazon.com/ses

---

**You can pick up exactly where we left off by reading this file!** 🚀

All code is committed and pushed to GitHub. The foundation is solid and ready for the next phase.
