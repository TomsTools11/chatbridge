import 'dotenv/config';
import Bull from 'bull';
import { processEmailToSlack } from './processors/email-to-slack';
import { processSlackToEmail } from './processors/slack-to-email';
import { handleDeadLetterQueue } from './processors/dlq-handler';
import logger from './utils/logger';

// Validate required environment variables
const requiredEnvVars = [
  'REDIS_URL',
  'DATABASE_URL',
  'AWS_SES_REGION',
  'SLACK_SIGNING_SECRET',
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    logger.error({ envVar }, `Missing required environment variable: ${envVar}`);
    process.exit(1);
  }
}

// Queue configuration
const QUEUE_CONFIG = {
  redis: process.env.REDIS_URL,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential' as const,
      delay: 2000,
    },
    removeOnComplete: {
      age: 86400, // Keep completed jobs for 24 hours
      count: 1000, // Keep last 1000 completed jobs
    },
    removeOnFail: {
      age: 604800, // Keep failed jobs for 7 days
    },
  },
};

// Initialize queues
logger.info('Initializing Bull queues...');

const emailToSlackQueue = new Bull('email-to-slack', QUEUE_CONFIG);
const slackToEmailQueue = new Bull('slack-to-email', QUEUE_CONFIG);

// Process email → Slack jobs
emailToSlackQueue.process(async (job) => {
  logger.info(
    { jobId: job.id, queue: 'email-to-slack' },
    'Processing email-to-slack job'
  );
  await processEmailToSlack(job);
});

// Process Slack → email jobs
slackToEmailQueue.process(async (job) => {
  logger.info(
    { jobId: job.id, queue: 'slack-to-email' },
    'Processing slack-to-email job'
  );
  await processSlackToEmail(job);
});

// Handle failed jobs (DLQ)
emailToSlackQueue.on('failed', async (job, err) => {
  if (job.attemptsMade >= (job.opts.attempts || 3)) {
    logger.error(
      { jobId: job.id, error: err.message },
      'Job permanently failed, moving to DLQ'
    );
    await handleDeadLetterQueue(job);
  }
});

slackToEmailQueue.on('failed', async (job, err) => {
  if (job.attemptsMade >= (job.opts.attempts || 3)) {
    logger.error(
      { jobId: job.id, error: err.message },
      'Job permanently failed, moving to DLQ'
    );
    await handleDeadLetterQueue(job);
  }
});

// Queue event listeners for monitoring
emailToSlackQueue.on('completed', (job) => {
  logger.info({ jobId: job.id }, 'Email→Slack job completed');
});

emailToSlackQueue.on('stalled', (job) => {
  logger.warn({ jobId: job.id }, 'Email→Slack job stalled');
});

emailToSlackQueue.on('error', (error) => {
  logger.error({ error: error.message }, 'Email→Slack queue error');
});

slackToEmailQueue.on('completed', (job) => {
  logger.info({ jobId: job.id }, 'Slack→Email job completed');
});

slackToEmailQueue.on('stalled', (job) => {
  logger.warn({ jobId: job.id }, 'Slack→Email job stalled');
});

slackToEmailQueue.on('error', (error) => {
  logger.error({ error: error.message }, 'Slack→Email queue error');
});

// Graceful shutdown
const shutdown = async () => {
  logger.info('Shutting down worker gracefully...');

  try {
    // Stop accepting new jobs
    await emailToSlackQueue.pause(true);
    await slackToEmailQueue.pause(true);

    logger.info('Queues paused, waiting for active jobs to complete...');

    // Wait for active jobs to complete (with timeout)
    const timeout = 30000; // 30 seconds
    const start = Date.now();

    while (Date.now() - start < timeout) {
      const emailActive = await emailToSlackQueue.getActiveCount();
      const slackActive = await slackToEmailQueue.getActiveCount();

      if (emailActive === 0 && slackActive === 0) {
        break;
      }

      logger.info(
        { emailActive, slackActive },
        'Waiting for active jobs to complete...'
      );
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    // Close queues
    await emailToSlackQueue.close();
    await slackToEmailQueue.close();

    logger.info('Worker shutdown complete');
    process.exit(0);
  } catch (error: any) {
    logger.error({ error: error.message }, 'Error during shutdown');
    process.exit(1);
  }
};

// Handle shutdown signals
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Handle uncaught errors
process.on('unhandledRejection', (reason, promise) => {
  logger.error({ reason }, 'Unhandled promise rejection');
});

process.on('uncaughtException', (error) => {
  logger.error({ error: error.message }, 'Uncaught exception');
  shutdown();
});

// Startup
logger.info(
  {
    nodeEnv: process.env.NODE_ENV,
    redisUrl: process.env.REDIS_URL?.replace(/:[^:]*@/, ':***@'), // Hide password
  },
  'Worker started successfully'
);

// Health check endpoint (optional - for monitoring)
// You could add an HTTP server here for health checks
const checkHealth = async () => {
  try {
    const emailWaiting = await emailToSlackQueue.getWaitingCount();
    const emailActive = await emailToSlackQueue.getActiveCount();
    const emailFailed = await emailToSlackQueue.getFailedCount();

    const slackWaiting = await slackToEmailQueue.getWaitingCount();
    const slackActive = await slackToEmailQueue.getActiveCount();
    const slackFailed = await slackToEmailQueue.getFailedCount();

    logger.info(
      {
        emailToSlack: { waiting: emailWaiting, active: emailActive, failed: emailFailed },
        slackToEmail: { waiting: slackWaiting, active: slackActive, failed: slackFailed },
      },
      'Queue health check'
    );
  } catch (error: any) {
    logger.error({ error: error.message }, 'Health check failed');
  }
};

// Run health check every 60 seconds
setInterval(checkHealth, 60000);

// Run initial health check
checkHealth();
