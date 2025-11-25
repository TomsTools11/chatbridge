import { db } from '@chatbridge/database';
import { ConversationMap } from '@prisma/client';
import logger from '../utils/logger';

export class ThreadResolverService {
  /**
   * Find or create conversation mapping for email → Slack
   * Returns the Slack thread_ts to reply to
   */
  async resolveEmailToSlackThread(params: {
    emailThreadId: string | null;
    emailMessageId: string;
    channelAliasId: string;
    slackChannelId: string;
  }): Promise<{ threadTs: string | null; conversationMap: ConversationMap }> {
    const { emailThreadId, emailMessageId, channelAliasId, slackChannelId } =
      params;

    // If there's an email thread ID, try to find existing conversation
    if (emailThreadId) {
      const existing = await db.conversationMap.findFirst({
        where: {
          emailThreadId,
          channelAliasId,
        },
        orderBy: {
          lastActivityAt: 'desc',
        },
      });

      if (existing) {
        logger.info(
          { conversationId: existing.id, emailThreadId, slackThreadTs: existing.slackThreadTs },
          'Found existing conversation mapping'
        );

        // Update last activity
        const updated = await db.conversationMap.update({
          where: { id: existing.id },
          data: {
            lastActivityAt: new Date(),
            emailMessageIds: {
              push: emailMessageId,
            },
          },
        });

        return {
          threadTs: existing.slackThreadTs,
          conversationMap: updated,
        };
      }
    }

    // No existing conversation found - create new one
    // This will be a new Slack thread (threadTs will be set after posting)
    logger.info(
      { emailThreadId, emailMessageId, channelAliasId },
      'Creating new conversation mapping'
    );

    const newConversation = await db.conversationMap.create({
      data: {
        emailThreadId: emailThreadId || emailMessageId,
        slackThreadTs: '', // Will be updated after first Slack message is posted
        slackChannelId,
        channelAliasId,
        emailMessageIds: [emailMessageId],
        participants: [],
        lastActivityAt: new Date(),
      },
    });

    return {
      threadTs: null, // No thread yet - this will be a new top-level message
      conversationMap: newConversation,
    };
  }

  /**
   * Update conversation with Slack thread_ts after first message is posted
   */
  async updateSlackThreadTs(
    conversationId: string,
    slackThreadTs: string
  ): Promise<void> {
    await db.conversationMap.update({
      where: { id: conversationId },
      data: { slackThreadTs },
    });

    logger.info(
      { conversationId, slackThreadTs },
      'Updated conversation with Slack thread_ts'
    );
  }

  /**
   * Find or create conversation mapping for Slack → Email
   * Returns email thread information and recipients
   */
  async resolveSlackToEmailThread(params: {
    slackThreadTs: string;
    slackChannelId: string;
    channelAliasId: string;
    senderEmail?: string;
  }): Promise<{
    emailThreadId: string | null;
    recipients: string[];
    conversationMap: ConversationMap;
  }> {
    const { slackThreadTs, slackChannelId, channelAliasId, senderEmail } =
      params;

    // Try to find existing conversation
    const existing = await db.conversationMap.findFirst({
      where: {
        slackThreadTs,
        channelAliasId,
      },
    });

    if (existing) {
      logger.info(
        {
          conversationId: existing.id,
          slackThreadTs,
          emailThreadId: existing.emailThreadId,
        },
        'Found existing conversation mapping'
      );

      // Update last activity and add sender to participants if provided
      const participants = existing.participants as string[];
      const updatedParticipants = senderEmail
        ? Array.from(new Set([...participants, senderEmail]))
        : participants;

      const updated = await db.conversationMap.update({
        where: { id: existing.id },
        data: {
          lastActivityAt: new Date(),
          participants: updatedParticipants,
        },
      });

      return {
        emailThreadId: existing.emailThreadId,
        recipients: participants, // Send to existing participants only
        conversationMap: updated,
      };
    }

    // No existing conversation - create new one
    // Get default recipients from channel alias
    const alias = await db.channelAlias.findUnique({
      where: { id: channelAliasId },
    });

    if (!alias) {
      throw new Error(`Channel alias not found: ${channelAliasId}`);
    }

    const recipients = (alias.recipients as string[]) || [];
    const initialParticipants = senderEmail
      ? [...recipients, senderEmail]
      : recipients;

    logger.info(
      { slackThreadTs, channelAliasId, recipients },
      'Creating new conversation mapping for Slack→Email'
    );

    const newConversation = await db.conversationMap.create({
      data: {
        emailThreadId: null, // Will be set after first email is sent
        slackThreadTs,
        slackChannelId,
        channelAliasId,
        emailMessageIds: [],
        participants: initialParticipants,
        lastActivityAt: new Date(),
      },
    });

    return {
      emailThreadId: null,
      recipients,
      conversationMap: newConversation,
    };
  }

  /**
   * Update conversation with email thread ID after first email is sent
   */
  async updateEmailThreadId(
    conversationId: string,
    emailThreadId: string,
    emailMessageId: string
  ): Promise<void> {
    await db.conversationMap.update({
      where: { id: conversationId },
      data: {
        emailThreadId,
        emailMessageIds: {
          push: emailMessageId,
        },
      },
    });

    logger.info(
      { conversationId, emailThreadId, emailMessageId },
      'Updated conversation with email thread ID'
    );
  }

  /**
   * Add email message ID to conversation tracking
   */
  async addEmailMessageId(
    conversationId: string,
    emailMessageId: string
  ): Promise<void> {
    await db.conversationMap.update({
      where: { id: conversationId },
      data: {
        emailMessageIds: {
          push: emailMessageId,
        },
        lastActivityAt: new Date(),
      },
    });
  }
}

// Singleton instance
let threadResolverService: ThreadResolverService | null = null;

export function getThreadResolverService(): ThreadResolverService {
  if (!threadResolverService) {
    threadResolverService = new ThreadResolverService();
  }
  return threadResolverService;
}
