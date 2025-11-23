export const MESSAGE_DIRECTION = {
  EMAIL_TO_SLACK: 'email→slack',
  SLACK_TO_EMAIL: 'slack→email',
} as const;

export const MESSAGE_STATUS = {
  PENDING: 'PENDING',
  DELIVERED: 'DELIVERED',
  FAILED: 'FAILED',
  RETRYING: 'RETRYING',
} as const;

export const WORKSPACE_STATUS = {
  ACTIVE: 'ACTIVE',
  DISCONNECTED: 'DISCONNECTED',
  ERROR: 'ERROR',
} as const;

export const ALIAS_STATUS = {
  ACTIVE: 'ACTIVE',
  PAUSED: 'PAUSED',
  DELETED: 'DELETED',
} as const;

// Redis key prefixes
export const REDIS_KEYS = {
  IDEMPOTENCY: 'idempotent',
  RATE_LIMIT_WORKSPACE: 'ratelimit:workspace',
  RATE_LIMIT_EMAIL: 'ratelimit:email',
  RATE_LIMIT_SLACK: 'ratelimit:slack',
} as const;

// Retry configuration
export const RETRY_CONFIG = {
  MAX_ATTEMPTS: 5,
  INITIAL_DELAY: 1000, // 1 second
  MAX_DELAY: 30000, // 30 seconds
  BACKOFF_MULTIPLIER: 2,
} as const;

// File size limits
export const FILE_LIMITS = {
  MAX_EMAIL_ATTACHMENT_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_SLACK_FILE_SIZE: 1024 * 1024 * 1024, // 1GB (Slack limit)
} as const;

// Idempotency cache TTL (7 days in seconds)
export const IDEMPOTENCY_TTL = 7 * 24 * 60 * 60;

// Rate limits
export const RATE_LIMITS = {
  SLACK_API_PER_SECOND: 1,
  EMAIL_PER_MINUTE: 100,
  WORKSPACE_PER_MINUTE: 100,
} as const;
