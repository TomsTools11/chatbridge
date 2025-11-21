# Product Requirements Document: Messaging Bridge App MVP
#side-projects
---
### PRD: Email ↔ Google Chat Bridge MVP
* Version: 0.2 (MVP – Google Chat focus)
* Owner: Tom
* Sources: Viability Report and Research Notes.
⠀
### 1) Summary
Build a reliable, email‑first, bidirectional bridge between email and Google Chat, with early support for Microsoft Teams channels as the fast follower. Treat email users as first‑class participants in Google Chat conversations. Prioritize delivery reliability, threading fidelity, attachment handling (via Drive links if needed), and admin controls. Defer “all chat apps” until after MVP.

### 2) Goals and Non‑Goals
* Goals
  * Allow an external participant on email to fully participate in Google Chat spaces or DMs.
  * Preserve message threading, quoted context, and attachments across systems.
  * Deliver near‑real‑time sync in both directions with idempotency and replay safety.
  * Enable low‑friction setup: connect one hosted mailbox (or Gmail/Google Workspace), OAuth to Google Chat, basic admin log.
* Non‑Goals (MVP)
  * Universal “all chat apps” support.
  * Deep CS/helpdesk workflows, analytics dashboards, AI features.
  * Enterprise compliance pack beyond basic audit log.
⠀
### 3) Target users and jobs to be done
* Primary users
  * Internal team members who live in Google Chat but must collaborate with email‑only clients.
  * Email participants who refuse or cannot join Google Chat.
* Admins
  * Google Workspace admins or space managers who configure spaces/aliases and require basic auditability.
* Jobs
  * Participate in a Google Chat thread from email without losing context.
  * Keep full history and attachments inside Google Chat.
  * Set up in under 20 minutes and know messages won’t be lost.
⠀
### 4) MVP scope
* Platforms
  * Email: Gmail or hosted mailbox (SES/SendGrid) for send and receive.
  * Google Chat: spaces and DMs (1:1), thread replies where available.
  * Fast follower: Microsoft Teams standard channels receive/post (limited features).
* Core features
  * Per‑space (or per‑conversation) email alias that routes to a Google Chat space or DM.
  * Bidirectional message relay with threading mapping between email and Chat threads.
  * Attachment ingestion and delivery with Drive link fallback for large files.
  * Email‑native quoting cleanup and signature trimming.
  * Basic admin panel: connect Google Chat, set up aliases, view health, minimal audit log.
* Reliability baseline
  * ≥95% end‑to‑end delivery success in private beta.
  * <1% duplicate message rate.
  * Idempotent processing with safe retries and at‑least‑once queues.

⠀Out of scope (MVP): reactions/emoji sync, edit/delete sync, advanced routing rules, multi‑workspace mapping, DLP/legal hold, cross‑chat relays beyond Google Chat/Teams.

### 5) User stories
* As a Google Chat user, I can generate an email address for a space so external email replies appear threaded in that space.
* As an email participant, I can reply to an email and my message appears in the correct Google Chat thread with prior context.
* As an admin, I can connect Google Chat and a mailbox, create aliases, and test routing in under 20 minutes.
* As a Chat user, I can initiate an email to an external address from a thread, and the recipient experiences a normal email with proper reply‑to.
* As an admin, I can see a basic audit trail for delivered, failed, and retried messages.
⠀
### 6) Detailed functional requirements
* Routing and identity
  * Each Google Chat space/DM can have one or more unique inbound email addresses.
  * Outbound emails use a bridged From/Reply‑To that routes replies back into the correct Chat thread or DM.
  * Identity mapping:
    * Email → Chat: display sender name and email in the Chat message header.
    * Chat → Email: From uses space alias or user‑specific alias; include space/user context in footer.
* Threading
  * Maintain thread mapping:
    * Email → Chat: Use In‑Reply‑To/References and custom headers to map to Chat threadKey/threadId.
    * Chat → Email: Preserve Subject with Re: semantics; include hidden header for conversation id.
  * Collapse quoted text and signatures for readability in Chat; provide “View full email” expansion.
* Content normalization
  * Email HTML → Google Chat text/markdown; support basic bold/italic, links, code.
  * Google Chat → MIME HTML email with simple formatting.
  * Mentions/links:
    * Preserve URLs; ignore Chat user mentions in outbound email unless mapping to email exists.
* Attachments
  * Upload smaller files directly when supported; for large files, upload to Drive and post a permissioned link with filename and size.
  * Virus scan pipeline prior to link sharing.
  * Fallback to links for unsupported types.
* Admin and setup
  * OAuth with Google Workspace scopes for Chat API; optional Gmail/Graph for customer mailbox.
  * Minimal dashboard:
    * Connections view, alias management, space mapping, health status, event log.
    * Test message button.
* Telemetry and retries
  * End‑to‑end trace id; message log with statuses; dedupe keys for exactly‑once UX.
  * Dead‑letter queue and operator notification.
* Security and privacy (MVP)
  * Store minimal metadata; encrypt at rest and in transit.
  * Role‑based access: admin vs member for dashboard.
  * Default retention 30 days with JSON export.
⠀
### 7) Non‑functional requirements
* Reliability: ≥99.9% uptime target post‑beta; ≥95% delivery success in MVP pilots.
* Performance: Median E2E latency < 5s for Email ↔ Chat; P95 < 15s.
* Scalability: 10k messages/day per tenant.
* Observability: Correlated logs, metrics, health endpoints.
* Compliance posture: Basic audit log and export at MVP; SOC2 later.
⠀
### 8) Architecture (MVP reference)
* Ingest
  * Email: Webhook via SES/SendGrid or Gmail push/IMAP; outbound via SES/SendGrid or Gmail API.
  * Google Chat: Chat REST API for createMessage in spaces and DMs; event webhooks for message created (via Chat app or Pub/Sub if applicable).
  * Teams (fast follower): Microsoft Graph channel messages.
* Services
  * Normalization service: HTML↔Chat text, signature and quote handling, attachment pipeline.
  * Router: mapping rules, dedupe, idempotency keys, dispatch.
  * Attachment service: S3/Drive hybrid, scan, signed links.
* Data
  * Postgres: users, connections, space‑alias maps, conversation_map, message_log, audit_log.
  * Redis/RabbitMQ: queues and idempotency cache.
* Ops
  * Scheduled replays; dead‑letter review UI.
⠀
### 9) Data model (MVP tables)
* users(id, email, role, created_at)
* connections(id, tenant_id, type[chat|mail|teams], status, secrets_ref)
* space_alias(id, chat_space_id, alias_email, state, created_by)
* conversation_map(id, platform_type, chat_thread_id, email_thread_id, last_seen_at)
* message_log(id, conversation_id, direction[email→chat|chat→email], source_msg_id, dest_msg_id, status, error_code, retry_count, trace_id, created_at)
* audit_log(id, actor, action, subject, metadata, created_at)
* file_object(id, storage_key, filename, size, mime, sha256, scan_status, created_at)
⠀
### 10) External integrations
* Google Chat: OAuth scopes, spaces.messages.create, space/thread addressing, cards for previews.
* Email: SES/SendGrid or Gmail API for outbound; inbound via webhook/IMAP/Gmail push.
* Teams (post‑MVP toggle): Microsoft Graph create/list channel messages.
* Optional accelerators: unified messaging API later; avoid lock‑in at MVP.
⠀
### 11) Configuration and routing rules (MVP)
* Per‑space alias creation.
* Default routing: All inbound emails to alias → space thread; new subject creates new thread.
* Outbound from Chat:
  * App command or card action “Email this thread” to initial recipient(s); replies stay threaded.
* Basic keyword filters and attachment allowlist deferred to Post‑MVP.
⠀
### 12) UX notes
* Google Chat messages from email show:
  * Header line: “From: Name <~[email@example.com](mailto:email@example.com)~>”.
  * Cleaned body without long signatures and quoted blocks; “View full email” link expansion.
* Email messages from Chat include:
  * Subject reflecting space/thread title.
  * Intro line “Posted in Space by Name”; footer “Reply to this email to respond in Google Chat.”
* Admin onboarding wizard:
  * 3 steps: Connect Google Chat → Create first alias → Send test.

⠀
### 13) Metrics and success criteria
* Setup: Median setup time < 20 minutes for first space.
* Reliability: ≥95% delivery success, <1% duplicate rate in beta.
* Performance: Median end‑to‑end latency < 5s.
* Adoption: 5 pilot teams, ≥3 paying design partners within 60 days.
* Satisfaction: Email participant and Workspace admin NPS ≥ 8.
⠀
### 14) Rollout plan
* Week 1–2: Prototype threading and attachment flows with Google Chat only; click‑through demo for email users.
* Week 3–4: MVP build with per‑space alias, reply‑to mapping, attachments, minimal admin log.
* Week 5–6: Private beta with 5 teams; instrument telemetry; hit reliability targets; triage edge cases.
* After beta: Publish as a Google Chat app listing; begin Teams channel integration as fast follower. 
⠀
### 15) Risks and mitigations
* Email client variability breaks quoting/signatures
  * Mitigation: Heuristics plus signature detection; allow “view raw email.”
* Google Chat API limits or eventing model gaps
  * Mitigation: Backoff, buffering, feature flags; keep adapters thin.
* Compliance asks creep into MVP
  * Mitigation: Offer audit log and export only; document enterprise roadmap post‑MVP.
* Duplicate or lost messages under retry
  * Mitigation: Strong idempotency keys, dedupe cache, reconciliation.
⠀
### 16) Open questions
* Mail connectivity: Hosted bridge domain only at MVP, or also customer‑owned domains for DKIM/SPF?
* Identity mapping: User‑specific aliases vs shared space identity for outbound email?
* Threading: Preferred mapping for Chat threadKey vs message grouping when threads aren’t explicit?
* Storage retention: Default 30 days sufficient for pilots, or do pilots require 90?
⠀
### 17) Post‑MVP backlog (prioritized)
1. Teams channel support GA.
2. Reactions summary and limited sync.
3. Advanced routing rules and keyword filters.
4. Admin exports, retention policies, and SSO.
5. CRM webhooks and Zapier/Make connector.
6. Analytics dashboard and SLA reporting.
7. AI assist: categorization, reply suggestions, language translation.