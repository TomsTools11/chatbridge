import { Router } from 'express';
import { db } from '@chatbridge/database';
import { listMessagesQuerySchema } from '@chatbridge/shared';
import type { Services } from '../services';

export function createMessageRoutes(services: Services): Router {
  const router = Router();

  /**
   * GET /api/messages
   * List message logs with pagination and filtering
   */
  router.get('/', async (req, res) => {
    try {
      const query = listMessagesQuerySchema.parse(req.query);
      const { page, limit, direction, status, channelAliasId, workspaceId } =
        query;

      const skip = (page - 1) * limit;

      const where: any = {};
      if (direction) {
        where.direction = direction;
      }
      if (status) {
        where.status = status;
      }
      if (channelAliasId) {
        where.channelAliasId = channelAliasId;
      }
      if (workspaceId) {
        where.workspaceId = workspaceId;
      }

      const [messages, total] = await Promise.all([
        db.messageLog.findMany({
          where,
          skip,
          take: limit,
          include: {
            channelAlias: {
              select: {
                slackChannelName: true,
                emailAddress: true,
              },
            },
            workspace: {
              select: {
                teamName: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        }),
        db.messageLog.count({ where }),
      ]);

      res.json({
        data: messages,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({
          error: 'Invalid query parameters',
          details: error.errors,
        });
      }

      services.logger.error(
        { error: error.message },
        'Failed to list messages'
      );
      res.status(500).json({ error: 'Failed to list messages' });
    }
  });

  /**
   * GET /api/messages/:id
   * Get a single message log by ID
   */
  router.get('/:id', async (req, res) => {
    try {
      const { id } = req.params;

      const message = await db.messageLog.findUnique({
        where: { id },
        include: {
          channelAlias: {
            select: {
              id: true,
              slackChannelId: true,
              slackChannelName: true,
              emailAddress: true,
            },
          },
          workspace: {
            select: {
              id: true,
              teamName: true,
              teamId: true,
            },
          },
        },
      });

      if (!message) {
        return res.status(404).json({ error: 'Message not found' });
      }

      res.json(message);
    } catch (error: any) {
      services.logger.error({ error: error.message }, 'Failed to get message');
      res.status(500).json({ error: 'Failed to get message' });
    }
  });

  /**
   * POST /api/messages/:id/retry
   * Retry a failed message
   */
  router.post('/:id/retry', async (req, res) => {
    try {
      const { id } = req.params;

      const message = await db.messageLog.findUnique({
        where: { id },
      });

      if (!message) {
        return res.status(404).json({ error: 'Message not found' });
      }

      if (message.status !== 'FAILED') {
        return res.status(400).json({
          error: 'Only failed messages can be retried',
          currentStatus: message.status,
        });
      }

      // Determine which queue to add to
      const queueName =
        message.direction === 'EMAIL_TO_SLACK'
          ? 'email-to-slack'
          : 'slack-to-email';

      // Re-queue the message
      if (message.direction === 'EMAIL_TO_SLACK' && message.emailMessageId) {
        // For email→Slack, we'd need the original email data
        // This is a simplified version - in production, you'd want to store
        // the original message data or fetch it from SES
        services.logger.warn(
          { messageId: id },
          'Email retry not fully implemented - requires original email data'
        );

        return res.status(501).json({
          error: 'Email message retry not implemented',
          reason: 'Original email data not stored',
        });
      } else if (
        message.direction === 'SLACK_TO_EMAIL' &&
        message.slackMessageTs
      ) {
        // For Slack→Email, we'd need the original Slack event
        services.logger.warn(
          { messageId: id },
          'Slack message retry not fully implemented - requires original event data'
        );

        return res.status(501).json({
          error: 'Slack message retry not implemented',
          reason: 'Original Slack event data not stored',
        });
      }

      // Update status to pending
      await db.messageLog.update({
        where: { id },
        data: {
          status: 'PENDING',
          errorMessage: null,
        },
      });

      services.logger.info({ messageId: id, queue: queueName }, 'Message retry queued');

      res.json({
        message: 'Message queued for retry',
        messageId: id,
        queue: queueName,
      });
    } catch (error: any) {
      services.logger.error({ error: error.message }, 'Failed to retry message');
      res.status(500).json({ error: 'Failed to retry message' });
    }
  });

  /**
   * GET /api/messages/stats
   * Get message statistics
   */
  router.get('/stats/summary', async (req, res) => {
    try {
      const { timeRange } = req.query;

      // Calculate date range (default to last 24 hours)
      const now = new Date();
      let startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      if (timeRange === '7d') {
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      } else if (timeRange === '30d') {
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      }

      const [
        totalMessages,
        deliveredMessages,
        failedMessages,
        emailToSlackCount,
        slackToEmailCount,
      ] = await Promise.all([
        db.messageLog.count({
          where: { createdAt: { gte: startDate } },
        }),
        db.messageLog.count({
          where: {
            status: 'DELIVERED',
            createdAt: { gte: startDate },
          },
        }),
        db.messageLog.count({
          where: {
            status: 'FAILED',
            createdAt: { gte: startDate },
          },
        }),
        db.messageLog.count({
          where: {
            direction: 'EMAIL_TO_SLACK',
            createdAt: { gte: startDate },
          },
        }),
        db.messageLog.count({
          where: {
            direction: 'SLACK_TO_EMAIL',
            createdAt: { gte: startDate },
          },
        }),
      ]);

      const successRate =
        totalMessages > 0
          ? ((deliveredMessages / totalMessages) * 100).toFixed(2)
          : '0.00';

      res.json({
        timeRange: timeRange || '24h',
        startDate,
        stats: {
          total: totalMessages,
          delivered: deliveredMessages,
          failed: failedMessages,
          pending: totalMessages - deliveredMessages - failedMessages,
          successRate: `${successRate}%`,
        },
        byDirection: {
          emailToSlack: emailToSlackCount,
          slackToEmail: slackToEmailCount,
        },
      });
    } catch (error: any) {
      services.logger.error({ error: error.message }, 'Failed to get stats');
      res.status(500).json({ error: 'Failed to get stats' });
    }
  });

  return router;
}
