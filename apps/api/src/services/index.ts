import { createClient } from 'redis';
import Queue from 'bull';
import { prisma } from '@chatbridge/database';
import type { Logger } from 'pino';

export interface Services {
  logger: Logger;
  redis: ReturnType<typeof createClient>;
  emailToSlackQueue: Queue.Queue;
  slackToEmailQueue: Queue.Queue;
}

export function initializeServices(logger: Logger): Services {
  // Initialize Redis
  const redis = createClient({
    url: process.env.REDIS_URL,
  });

  redis.on('error', (err) => {
    logger.error({ err }, 'Redis connection error');
  });

  redis.connect().catch((err) => {
    logger.error({ err }, 'Failed to connect to Redis');
    process.exit(1);
  });

  // Initialize Bull queues
  const emailToSlackQueue = new Queue('email-to-slack', process.env.REDIS_URL!);
  const slackToEmailQueue = new Queue('slack-to-email', process.env.REDIS_URL!);

  emailToSlackQueue.on('error', (err) => {
    logger.error({ err }, 'Email-to-Slack queue error');
  });

  slackToEmailQueue.on('error', (err) => {
    logger.error({ err }, 'Slack-to-Email queue error');
  });

  logger.info('Services initialized');

  return {
    logger,
    redis,
    emailToSlackQueue,
    slackToEmailQueue,
  };
}
