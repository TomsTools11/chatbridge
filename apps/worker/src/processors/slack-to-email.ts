import { Job } from 'bull';
import { db } from '@chatbridge/database';
import { SlackClient } from '@chatbridge/slack-adapter';
import { SESClient, buildEmailHtml } from '@chatbridge/email-adapter';
import { slackToHtml } from '@chatbridge/slack-adapter';
import { getIdempotencyService } from '../services/idempotency';
import { getThreadResolverService } from '../services/thread-resolver';
import { getAttachmentHandlerService } from '../services/attachment-handler';
import { getNotificationService } from '../services/notification';
import logger from '../utils/logger';

interface SlackToEmailJob {
  event: {
    type: 'message';
    channel: string;
    user: string;
    text: string;
    ts: string;
    thread_ts?: string;
    files?: Array<{
      id: string;
      name: string;
      mimetype: string;
      size: number;
      url_private: string;
      url_private_download: string;
    }>;
  };
  teamId: string;
}

/**
 * Process Slack → Email message conversion
 */
export async function processSlackToEmail(
  job: Job<SlackToEmailJob>
): Promise<void> {
  const { event, teamId } = job.data;
  const traceId = `slack-${event.channel}-${event.ts}`;
  const jobLogger = logger.child({ traceId, jobId: job.id, ts: event.ts });

  jobLogger.info(
    { channel: event.channel, user: event.user, teamId },
    'Processing Slack → Email'
  );

  const idempotency = getIdempotencyService();
  const threadResolver = getThreadResolverService();
  const attachmentHandler = getAttachmentHandlerService();
  const notificationService = getNotificationService();

  try {
    // Connect idempotency service
    await idempotency.connect();

    // 1. Check idempotency - have we processed this Slack message before?
    const isProcessed = await idempotency.isSlackMessageProcessed(
      event.channel,
      event.ts
    );

    if (isProcessed) {
      jobLogger.info('Slack message already processed (idempotent skip)');
      return;
    }

    // 2. Find workspace
    const workspace = await db.slackWorkspace.findUnique({
      where: { teamId },
    });

    if (!workspace) {
      jobLogger.warn({ teamId }, 'Workspace not found');
      throw new Error(`Workspace not found: ${teamId}`);
    }

    // 3. Find channel alias for this channel
    const channelAlias = await db.channelAlias.findFirst({
      where: {
        slackChannelId: event.channel,
        workspaceId: workspace.id,
        isActive: true,
      },
    });

    if (!channelAlias) {
      jobLogger.warn(
        { channel: event.channel },
        'No active channel alias found for Slack channel'
      );
      throw new Error(`No channel alias found for channel: ${event.channel}`);
    }

    jobLogger.info(
      {
        aliasId: channelAlias.id,
        emailAddress: channelAlias.emailAddress,
      },
      'Found channel alias'
    );

    // 4. Initialize Slack client
    const slackClient = new SlackClient({
      botToken: workspace.accessToken,
      teamId: workspace.teamId,
      logger: jobLogger,
    });

    // 5. Get user info for sender name
    const userInfo = await slackClient.getUser(event.user);
    const senderName = userInfo?.realName || userInfo?.name || 'Slack User';
    const senderEmail = userInfo?.email;

    jobLogger.info({ senderName, senderEmail }, 'Retrieved sender info');

    // 6. Resolve thread - find or create conversation mapping
    const threadTs = event.thread_ts || event.ts; // Use message ts if not in thread

    const { emailThreadId, recipients, conversationMap } =
      await threadResolver.resolveSlackToEmailThread({
        slackThreadTs: threadTs,
        slackChannelId: event.channel,
        channelAliasId: channelAlias.id,
        senderEmail,
      });

    jobLogger.info(
      {
        conversationId: conversationMap.id,
        emailThreadId,
        recipients,
        isNewThread: !emailThreadId,
      },
      'Resolved conversation thread'
    );

    // Check if there are recipients
    if (!recipients || recipients.length === 0) {
      jobLogger.warn('No recipients found for email');
      throw new Error('No recipients configured for this channel alias');
    }

    // 7. Normalize content - convert Slack markdown to HTML
    const htmlContent = slackToHtml(event.text);

    // Build email HTML with proper styling
    const emailHtml = buildEmailHtml({
      from: senderName,
      content: htmlContent,
      footer: `This message was sent from Slack via ChatBridge`,
    });

    // 8. Process attachments
    const processedAttachments: Array<{
      filename: string;
      content: Buffer;
      contentType: string;
    }> = [];

    if (event.files && event.files.length > 0) {
      jobLogger.info({ count: event.files.length }, 'Processing attachments');

      for (const file of event.files) {
        const result = await attachmentHandler.processSlackAttachment(
          slackClient,
          {
            id: file.id,
            name: file.name,
            mimetype: file.mimetype,
            size: file.size,
            url_private: file.url_private,
          }
        );

        if (!result.safe) {
          jobLogger.warn(
            { filename: file.name, error: result.error },
            'Unsafe attachment detected'
          );

          // Notify about virus detection
          if (result.error?.includes('virus scan')) {
            await notificationService.notifyVirusDetected({
              filename: file.name,
              source: 'slack',
              scanResult: result.error,
            });
          }

          continue;
        }

        if (result.fileBuffer) {
          processedAttachments.push({
            filename: file.name,
            content: result.fileBuffer,
            contentType: file.mimetype,
          });
        }
      }
    }

    // 9. Initialize SES client
    if (!process.env.AWS_SES_REGION) {
      throw new Error('AWS_SES_REGION not configured');
    }

    const sesClient = new SESClient({
      region: process.env.AWS_SES_REGION,
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    });

    // 10. Prepare email headers for threading
    const emailHeaders: Record<string, string> = {};

    if (emailThreadId) {
      // This is a reply - add threading headers
      emailHeaders['In-Reply-To'] = emailThreadId;
      emailHeaders['References'] = emailThreadId;
    }

    // 11. Send email
    const fromEmail =
      process.env.BRIDGE_EMAIL_FROM || channelAlias.emailAddress;

    const sendResult = await sesClient.sendEmail({
      from: `${senderName} via Slack <${fromEmail}>`,
      to: recipients,
      subject: emailThreadId
        ? `Re: Slack conversation in #${channelAlias.slackChannelName || event.channel}`
        : `Slack message from ${senderName}`,
      html: emailHtml,
      text: event.text,
      attachments: processedAttachments.map((att) => ({
        filename: att.filename,
        content: att.content,
        contentType: att.contentType,
      })),
      headers: emailHeaders,
    });

    const emailMessageId = sendResult.messageId;

    jobLogger.info({ emailMessageId, recipients }, 'Email sent successfully');

    // 12. Update conversation mapping if this was a new email thread
    if (!emailThreadId && emailMessageId) {
      await threadResolver.updateEmailThreadId(
        conversationMap.id,
        emailMessageId,
        emailMessageId
      );
    } else if (emailMessageId) {
      await threadResolver.addEmailMessageId(conversationMap.id, emailMessageId);
    }

    // 13. Log message delivery
    await db.messageLog.create({
      data: {
        direction: 'SLACK_TO_EMAIL',
        status: 'DELIVERED',
        slackMessageTs: event.ts,
        emailMessageId: emailMessageId || undefined,
        channelAliasId: channelAlias.id,
        workspaceId: workspace.id,
        metadata: {
          sender: senderName,
          recipients,
          traceId,
        },
      },
    });

    // 14. Mark as processed in Redis
    await idempotency.markSlackMessageProcessed(event.channel, event.ts, {
      emailMessageId,
      conversationId: conversationMap.id,
      processedAt: new Date().toISOString(),
    });

    jobLogger.info('Slack → Email processing completed successfully');
  } catch (error: any) {
    jobLogger.error(
      { error: error.message },
      'Slack → Email processing failed'
    );

    // Log failed delivery
    try {
      await db.messageLog.create({
        data: {
          direction: 'SLACK_TO_EMAIL',
          status: 'FAILED',
          slackMessageTs: event.ts,
          errorMessage: error.message,
          metadata: {
            channel: event.channel,
            user: event.user,
            traceId,
          },
        },
      });
    } catch (dbError: any) {
      jobLogger.error(
        { error: dbError.message },
        'Failed to log error to database'
      );
    }

    // Notify about failure
    await notificationService.notifyEmailDeliveryFailed({
      emailMessageId: event.ts,
      recipient: 'unknown',
      error: error.message,
    });

    throw error;
  } finally {
    // Cleanup
    await idempotency.disconnect();
  }
}
