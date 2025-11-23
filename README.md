# Chat Bridge MVP - Email ↔ Slack

A bidirectional messaging bridge that allows email users to participate in Slack conversations seamlessly.

## Project Structure

```
chatbridgemvp/
├── apps/
│   ├── api/                    # Express API server
│   ├── admin-dashboard/        # Next.js admin UI (TODO)
│   └── worker/                 # Background job processor (TODO)
├── packages/
│   ├── database/               # Prisma schema & client
│   ├── email-adapter/          # Email integration (SES)
│   ├── slack-adapter/          # Slack Bot SDK integration
│   ├── normalizer/             # Message normalization (TODO)
│   └── shared/                 # Common utilities & types
└── infrastructure/             # Deployment configs (TODO)
```

## Features

- **Bidirectional messaging**: Email ↔ Slack with thread preservation
- **Slack OAuth**: Multi-workspace support
- **Channel aliases**: Unique email addresses per Slack channel
- **Attachment handling**: File sync between email and Slack
- **Message normalization**: HTML ↔ Slack markdown conversion
- **Idempotency**: Prevent duplicate messages
- **Retry logic**: Automatic retry with exponential backoff
- **Audit logging**: Track all message flows and admin actions

## Tech Stack

- **Runtime**: Node.js 20+ with TypeScript
- **Monorepo**: Turborepo + pnpm workspaces
- **Database**: PostgreSQL with Prisma ORM
- **Queue**: Bull with Redis for background jobs
- **Email**: AWS SES for sending/receiving
- **Storage**: AWS S3 for attachments
- **API**: Express.js with Pino logging

## Prerequisites

- Node.js 20+
- pnpm 8+
- PostgreSQL 14+
- Redis 6+
- AWS account (for SES)
- Slack workspace (for development)

## Setup

### 1. Install dependencies

```bash
pnpm install
```

### 2. Set up environment variables

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

- `DATABASE_URL`: PostgreSQL connection string
- `REDIS_URL`: Redis connection string
- `SLACK_CLIENT_ID`, `SLACK_CLIENT_SECRET`, `SLACK_SIGNING_SECRET`: From Slack app
- `SES_*`: AWS SES credentials
- `ENCRYPTION_KEY`, `JWT_SECRET`: Generate with `openssl rand -hex 32`

### 3. Initialize database

```bash
# Generate Prisma client
pnpm db:generate

# Push schema to database (development)
pnpm db:push

# Or run migrations (production)
pnpm db:migrate

# Optional: seed with demo data
cd packages/database
pnpm db:seed
```

### 4. Start development servers

```bash
# Start all services
pnpm dev

# Or start individual services
cd apps/api
pnpm dev
```

## Slack App Configuration

1. Create a Slack app at [api.slack.com/apps](https://api.slack.com/apps)
2. Configure OAuth scopes:
   - `channels:history`
   - `channels:read`
   - `chat:write`
   - `files:read`
   - `files:write`
   - `users:read`
   - `users:read.email`
3. Enable Events API:
   - Request URL: `https://your-domain.com/slack/events`
   - Subscribe to: `message.channels`
4. Install app to your workspace via `/slack/install`

## AWS SES Configuration

1. Verify your domain in SES
2. Set up inbound email receiving rules:
   - Action: SNS topic
   - Topic: POST to `https://your-domain.com/webhooks/email/ses`
3. Configure SMTP credentials for outbound sending

## API Endpoints

### Health

- `GET /health` - Basic liveness check
- `GET /health/ready` - Readiness check (DB + Redis)

### Slack

- `GET /slack/install` - OAuth installation URL
- `GET /slack/oauth/callback` - OAuth callback handler
- `POST /slack/events` - Slack Events API webhook

### Email

- `POST /webhooks/email/ses` - SES inbound email webhook

## Development

### Run tests

```bash
pnpm test
```

### Lint code

```bash
pnpm lint
```

### Build for production

```bash
pnpm build
```

### Database management

```bash
# Open Prisma Studio
pnpm db:studio

# Create migration
cd packages/database
pnpm db:migrate

# Reset database (caution!)
pnpm db:push --force-reset
```

## Architecture

### Message Flow: Email → Slack

1. SES receives email → SNS webhook
2. API parses email and queues job
3. Worker processes:
   - Lookup alias → channel mapping
   - Check idempotency (Redis)
   - Resolve thread via conversation_map
   - Normalize content (HTML → Slack mrkdwn)
   - Process attachments
   - Post to Slack
   - Update message_log

### Message Flow: Slack → Email

1. Slack Events API → webhook
2. API verifies signature and queues job
3. Worker processes:
   - Lookup channel → alias mapping
   - Check idempotency (Redis)
   - Resolve thread via conversation_map
   - Normalize content (mrkdwn → HTML)
   - Download Slack files
   - Send via SES
   - Update message_log

## Next Steps

1. **Implement Worker** (`apps/worker`):
   - Email → Slack processor
   - Slack → Email processor
   - Attachment service
   - Retry logic with DLQ

2. **Build Admin Dashboard** (`apps/admin-dashboard`):
   - Workspace management
   - Channel alias creation
   - Message log viewer
   - Audit log

3. **Message Normalizer** (`packages/normalizer`):
   - Advanced HTML ↔ markdown conversion
   - Signature/quote detection
   - Mention mapping

4. **Testing**:
   - Unit tests for adapters
   - Integration tests for flows
   - E2E tests with real Slack/SES

5. **Deployment**:
   - Docker containers
   - Railway/Render deployment
   - CI/CD pipeline

## License

Proprietary - All rights reserved
