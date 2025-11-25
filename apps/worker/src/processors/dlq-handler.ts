import { Job } from 'bull';
import { db } from '@chatbridge/database';
import { getNotificationService } from '../services/notification';
import logger from '../utils/logger';

/**
 * Handle jobs that have exceeded max retry attempts
 * This is called when a job moves to the failed queue
 */
export async function handleDeadLetterQueue(job: Job): Promise<void> {
  const jobLogger = logger.child({ jobId: job.id, queue: job.queue.name });

  jobLogger.error(
    {
      attemptsMade: job.attemptsMade,
      failedReason: job.failedReason,
      data: job.data,
    },
    'Job moved to DLQ after max retries'
  );

  const notificationService = getNotificationService();

  try {
    // Determine job type and extract relevant info
    const isEmailToSlack = job.queue.name.includes('email-to-slack');
    const isSlackToEmail = job.queue.name.includes('slack-to-email');

    // Log to audit log
    await db.auditLog.create({
      data: {
        action: 'MESSAGE_FAILED_PERMANENTLY',
        metadata: {
          jobId: job.id,
          queue: job.queue.name,
          direction: isEmailToSlack
            ? 'EMAIL_TO_SLACK'
            : isSlackToEmail
            ? 'SLACK_TO_EMAIL'
            : 'UNKNOWN',
          attemptsMade: job.attemptsMade,
          failedReason: job.failedReason,
          jobData: job.data,
          timestamp: new Date().toISOString(),
        },
        userId: null, // System action
      },
    });

    // Send alert notification
    if (isEmailToSlack && job.data.email) {
      const email = job.data.email;

      await notificationService.sendAlert({
        type: 'email_failed',
        severity: 'critical',
        title: 'Email Processing Failed Permanently',
        message: `Email from ${email.from?.address} failed after ${job.attemptsMade} attempts`,
        details: {
          messageId: email.messageId,
          from: email.from?.address,
          subject: email.subject,
          failedReason: job.failedReason,
          attempts: job.attemptsMade,
        },
      });

      // Update message log to permanently failed
      await db.messageLog.updateMany({
        where: {
          emailMessageId: email.messageId,
          direction: 'EMAIL_TO_SLACK',
        },
        data: {
          status: 'FAILED',
          errorMessage: `Permanently failed after ${job.attemptsMade} attempts: ${job.failedReason}`,
        },
      });
    } else if (isSlackToEmail && job.data.event) {
      const event = job.data.event;

      await notificationService.sendAlert({
        type: 'slack_failed',
        severity: 'critical',
        title: 'Slack Message Processing Failed Permanently',
        message: `Slack message in channel ${event.channel} failed after ${job.attemptsMade} attempts`,
        details: {
          channel: event.channel,
          ts: event.ts,
          user: event.user,
          failedReason: job.failedReason,
          attempts: job.attemptsMade,
        },
      });

      // Update message log to permanently failed
      await db.messageLog.updateMany({
        where: {
          slackMessageTs: event.ts,
          direction: 'SLACK_TO_EMAIL',
        },
        data: {
          status: 'FAILED',
          errorMessage: `Permanently failed after ${job.attemptsMade} attempts: ${job.failedReason}`,
        },
      });
    } else {
      // Generic system error
      await notificationService.sendAlert({
        type: 'system_error',
        severity: 'critical',
        title: 'Worker Job Failed Permanently',
        message: `Job ${job.id} in queue ${job.queue.name} failed permanently`,
        details: {
          jobId: job.id,
          queue: job.queue.name,
          failedReason: job.failedReason,
          attempts: job.attemptsMade,
        },
      });
    }

    jobLogger.info('DLQ handling completed, notifications sent');
  } catch (error: any) {
    jobLogger.error(
      { error: error.message },
      'Error handling DLQ job - notification may have failed'
    );
  }
}

/**
 * Retry a failed job manually
 */
export async function retryFailedJob(
  jobId: string,
  queueName: string
): Promise<void> {
  logger.info({ jobId, queueName }, 'Manually retrying failed job');

  // This function can be called from an API endpoint to retry failed jobs
  // Implementation would require access to the Bull queue instance
  // For now, this is a placeholder for future implementation

  await db.auditLog.create({
    data: {
      action: 'MESSAGE_RETRY_REQUESTED',
      metadata: {
        jobId,
        queueName,
        timestamp: new Date().toISOString(),
      },
      userId: null,
    },
  });
}
