import { Job } from 'bull';
import { db } from '@chatbridge/database';
import { SlackClient } from '@chatbridge/slack-adapter';
import {
  cleanEmailContent,
  extractTextFromHtml,
} from '@chatbridge/email-adapter';
import { htmlToSlack, createEmailMessageBlocks } from '@chatbridge/slack-adapter';
import { getIdempotencyService } from '../services/idempotency';
import { getThreadResolverService } from '../services/thread-resolver';
import { getAttachmentHandlerService } from '../services/attachment-handler';
import { getNotificationService } from '../services/notification';
import logger from '../utils/logger';

interface EmailToSlackJob {
  email: {
    messageId: string;
    from: {
      name?: string;
      address: string;
    };
    to: Array<{
      name?: string;
      address: string;
    }>;
    cc?: Array<{
      name?: string;
      address: string;
    }>;
    subject: string;
    text?: string;
    html?: string;
    inReplyTo?: string;
    references?: string[];
    date: Date;
    attachments?: Array<{
      filename: string;
      contentType: string;
      size: number;
      content: Buffer;
      contentId?: string;
    }>;
    headers?: any;
  };
  traceId: string;
}

/**
 * Process email → Slack message conversion
 */
export async function processEmailToSlack(
  job: Job<EmailToSlackJob>
): Promise<void> {
  const { email, traceId } = job.data;
  const jobLogger = logger.child({ traceId, jobId: job.id, messageId: email.messageId });

  jobLogger.info(
    { from: email.from.address, to: email.to.map((t) => t.address) },
    'Processing email → Slack'
  );

  const idempotency = getIdempotencyService();
  const threadResolver = getThreadResolverService();
  const attachmentHandler = getAttachmentHandlerService();
  const notificationService = getNotificationService();

  try {
    // Connect idempotency service
    await idempotency.connect();

    // 1. Check idempotency - have we processed this email before?
    const isProcessed = await idempotency.isEmailProcessed(email.messageId);
    if (isProcessed) {
      jobLogger.info('Email already processed (idempotent skip)');
      return;
    }

    // 2. Find channel alias by recipient email
    // Check all "to" addresses to find a matching alias
    let channelAlias = null;
    let recipientEmail = '';

    for (const recipient of email.to) {
      channelAlias = await db.channelAlias.findFirst({
        where: {
          emailAddress: recipient.address,
          isActive: true,
        },
        include: {
          workspace: true,
        },
      });

      if (channelAlias) {
        recipientEmail = recipient.address;
        break;
      }
    }

    if (!channelAlias) {
      jobLogger.warn(
        { to: email.to.map((t) => t.address) },
        'No active channel alias found for recipients'
      );
      throw new Error('No channel alias found for email recipients');
    }

    jobLogger.info(
      {
        aliasId: channelAlias.id,
        channel: channelAlias.slackChannelId,
        workspace: channelAlias.workspace.teamName,
      },
      'Found channel alias'
    );

    // 3. Extract email thread ID from headers
    const emailThreadId = email.inReplyTo || email.references?.[0] || null;

    // 4. Resolve thread - find or create conversation mapping
    const { threadTs, conversationMap } =
      await threadResolver.resolveEmailToSlackThread({
        emailThreadId,
        emailMessageId: email.messageId,
        channelAliasId: channelAlias.id,
        slackChannelId: channelAlias.slackChannelId,
      });

    jobLogger.info(
      {
        conversationId: conversationMap.id,
        threadTs,
        isNewThread: !threadTs,
      },
      'Resolved conversation thread'
    );

    // 5. Normalize content
    // Prefer text content, fall back to HTML
    let content = email.text || '';
    if (!content && email.html) {
      content = extractTextFromHtml(email.html);
    }

    // Clean signatures and quoted text
    content = cleanEmailContent(content);

    // Convert to Slack markdown
    const slackContent = email.html ? htmlToSlack(email.html) : content;

    // Create message blocks
    const fromName = email.from.name || email.from.address;
    const blocks = createEmailMessageBlocks(
      fromName,
      email.subject,
      slackContent
    );

    // 6. Process attachments
    const processedAttachments: Array<{
      filename: string;
      content: Buffer;
      safe: boolean;
    }> = [];

    if (email.attachments && email.attachments.length > 0) {
      jobLogger.info(
        { count: email.attachments.length },
        'Processing attachments'
      );

      for (const attachment of email.attachments) {
        // Skip inline images (content-id attachments)
        if (attachment.contentId) {
          continue;
        }

        const result = await attachmentHandler.processEmailAttachment({
          filename: attachment.filename,
          contentType: attachment.contentType,
          content: attachment.content,
          size: attachment.size,
        });

        if (!result.safe) {
          jobLogger.warn(
            { filename: attachment.filename, error: result.error },
            'Unsafe attachment detected'
          );

          // Notify about virus detection
          if (result.error?.includes('virus scan')) {
            await notificationService.notifyVirusDetected({
              filename: attachment.filename,
              source: 'email',
              scanResult: result.error,
            });
          }

          continue;
        }

        processedAttachments.push({
          filename: attachment.filename,
          content: attachment.content,
          safe: true,
        });
      }
    }

    // 7. Initialize Slack client
    const slackClient = new SlackClient(channelAlias.workspace.accessToken);

    // 8. Post message to Slack
    let slackTs: string;

    if (processedAttachments.length > 0) {
      // Upload files and post message
      const fileIds: string[] = [];

      for (const attachment of processedAttachments) {
        try {
          const uploadResult = await slackClient.uploadFile({
            channels: channelAlias.slackChannelId,
            filename: attachment.filename,
            content: attachment.content,
            threadTs: threadTs || undefined,
          });

          if (uploadResult.file?.id) {
            fileIds.push(uploadResult.file.id);
          }
        } catch (error: any) {
          jobLogger.error(
            { error: error.message, filename: attachment.filename },
            'Failed to upload attachment to Slack'
          );
        }
      }

      // Post message with text
      const result = await slackClient.postMessage({
        channel: channelAlias.slackChannelId,
        blocks,
        text: `Email from ${fromName}: ${email.subject}`,
        threadTs: threadTs || undefined,
      });

      slackTs = result.ts;
    } else {
      // Just post message
      const result = await slackClient.postMessage({
        channel: channelAlias.slackChannelId,
        blocks,
        text: `Email from ${fromName}: ${email.subject}`,
        threadTs: threadTs || undefined,
      });

      slackTs = result.ts;
    }

    jobLogger.info({ slackTs, threadTs }, 'Posted message to Slack');

    // 9. Update conversation mapping if this was a new thread
    if (!threadTs) {
      await threadResolver.updateSlackThreadTs(conversationMap.id, slackTs);
    }

    // 10. Log message delivery
    await db.messageLog.create({
      data: {
        direction: 'EMAIL_TO_SLACK',
        status: 'DELIVERED',
        emailMessageId: email.messageId,
        slackMessageTs: slackTs,
        channelAliasId: channelAlias.id,
        workspaceId: channelAlias.workspaceId,
        metadata: {
          from: email.from.address,
          subject: email.subject,
          traceId,
        },
      },
    });

    // 11. Mark as processed in Redis
    await idempotency.markEmailProcessed(email.messageId, {
      slackTs,
      conversationId: conversationMap.id,
      processedAt: new Date().toISOString(),
    });

    jobLogger.info('Email → Slack processing completed successfully');
  } catch (error: any) {
    jobLogger.error({ error: error.message }, 'Email → Slack processing failed');

    // Log failed delivery
    try {
      await db.messageLog.create({
        data: {
          direction: 'EMAIL_TO_SLACK',
          status: 'FAILED',
          emailMessageId: email.messageId,
          errorMessage: error.message,
          metadata: {
            from: email.from.address,
            subject: email.subject,
            traceId,
          },
        },
      });
    } catch (dbError: any) {
      jobLogger.error({ error: dbError.message }, 'Failed to log error to database');
    }

    // Notify about failure
    await notificationService.notifySlackMessageFailed({
      channelId: 'unknown',
      error: error.message,
    });

    throw error;
  } finally {
    // Cleanup
    await idempotency.disconnect();
  }
}
