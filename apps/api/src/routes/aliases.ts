import { Router } from 'express';
import { db } from '@chatbridge/database';
import {
  createChannelAliasSchema,
  updateChannelAliasSchema,
  listAliasesQuerySchema,
} from '@chatbridge/shared';
import { generateEmailAlias } from '@chatbridge/shared';
import type { Services } from '../services';

export function createAliasRoutes(services: Services): Router {
  const router = Router();

  /**
   * POST /api/aliases
   * Create a new channel alias
   */
  router.post('/', async (req, res) => {
    try {
      const input = createChannelAliasSchema.parse(req.body);

      // Verify workspace exists
      const workspace = await db.slackWorkspace.findUnique({
        where: { id: input.workspaceId },
      });

      if (!workspace) {
        return res.status(404).json({ error: 'Workspace not found' });
      }

      // Check if alias already exists for this channel
      const existing = await db.channelAlias.findFirst({
        where: {
          workspaceId: input.workspaceId,
          slackChannelId: input.slackChannelId,
        },
      });

      if (existing) {
        return res.status(409).json({
          error: 'Channel alias already exists for this channel',
          aliasId: existing.id,
        });
      }

      // Check if email address is already in use
      const emailInUse = await db.channelAlias.findFirst({
        where: { emailAddress: input.emailAddress },
      });

      if (emailInUse) {
        return res.status(409).json({
          error: 'Email address already in use',
        });
      }

      // Create alias
      const alias = await db.channelAlias.create({
        data: {
          workspaceId: input.workspaceId,
          slackChannelId: input.slackChannelId,
          slackChannelName: input.slackChannelName,
          emailAddress: input.emailAddress,
          isPrivate: input.isPrivate,
          recipients: input.recipients,
          isActive: true,
        },
        include: {
          workspace: {
            select: {
              teamName: true,
              teamId: true,
            },
          },
        },
      });

      services.logger.info(
        {
          aliasId: alias.id,
          channelId: alias.slackChannelId,
          emailAddress: alias.emailAddress,
        },
        'Channel alias created'
      );

      res.status(201).json(alias);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({
          error: 'Invalid input',
          details: error.errors,
        });
      }

      services.logger.error({ error: error.message }, 'Failed to create alias');
      res.status(500).json({ error: 'Failed to create alias' });
    }
  });

  /**
   * GET /api/aliases
   * List all channel aliases with pagination and filtering
   */
  router.get('/', async (req, res) => {
    try {
      const query = listAliasesQuerySchema.parse(req.query);
      const { page, limit, workspaceId, isActive } = query;

      const skip = (page - 1) * limit;

      const where: any = {};
      if (workspaceId) {
        where.workspaceId = workspaceId;
      }
      if (isActive !== undefined) {
        where.isActive = isActive;
      }

      const [aliases, total] = await Promise.all([
        db.channelAlias.findMany({
          where,
          skip,
          take: limit,
          include: {
            workspace: {
              select: {
                teamName: true,
                teamId: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        }),
        db.channelAlias.count({ where }),
      ]);

      res.json({
        data: aliases,
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

      services.logger.error({ error: error.message }, 'Failed to list aliases');
      res.status(500).json({ error: 'Failed to list aliases' });
    }
  });

  /**
   * GET /api/aliases/:id
   * Get a single channel alias by ID
   */
  router.get('/:id', async (req, res) => {
    try {
      const { id } = req.params;

      const alias = await db.channelAlias.findUnique({
        where: { id },
        include: {
          workspace: {
            select: {
              teamName: true,
              teamId: true,
            },
          },
          _count: {
            select: {
              conversations: true,
              messageLogs: true,
            },
          },
        },
      });

      if (!alias) {
        return res.status(404).json({ error: 'Alias not found' });
      }

      res.json(alias);
    } catch (error: any) {
      services.logger.error({ error: error.message }, 'Failed to get alias');
      res.status(500).json({ error: 'Failed to get alias' });
    }
  });

  /**
   * PATCH /api/aliases/:id
   * Update a channel alias
   */
  router.patch('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const input = updateChannelAliasSchema.parse(req.body);

      // Check if alias exists
      const existing = await db.channelAlias.findUnique({
        where: { id },
      });

      if (!existing) {
        return res.status(404).json({ error: 'Alias not found' });
      }

      // If updating email address, check if it's already in use
      if (input.emailAddress && input.emailAddress !== existing.emailAddress) {
        const emailInUse = await db.channelAlias.findFirst({
          where: {
            emailAddress: input.emailAddress,
            id: { not: id },
          },
        });

        if (emailInUse) {
          return res.status(409).json({
            error: 'Email address already in use',
          });
        }
      }

      // Update alias
      const alias = await db.channelAlias.update({
        where: { id },
        data: input,
        include: {
          workspace: {
            select: {
              teamName: true,
              teamId: true,
            },
          },
        },
      });

      services.logger.info(
        { aliasId: alias.id, updates: Object.keys(input) },
        'Channel alias updated'
      );

      res.json(alias);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({
          error: 'Invalid input',
          details: error.errors,
        });
      }

      services.logger.error({ error: error.message }, 'Failed to update alias');
      res.status(500).json({ error: 'Failed to update alias' });
    }
  });

  /**
   * DELETE /api/aliases/:id
   * Delete a channel alias
   */
  router.delete('/:id', async (req, res) => {
    try {
      const { id } = req.params;

      // Check if alias exists
      const existing = await db.channelAlias.findUnique({
        where: { id },
      });

      if (!existing) {
        return res.status(404).json({ error: 'Alias not found' });
      }

      // Soft delete by setting isActive to false
      // (Could also hard delete with db.channelAlias.delete)
      await db.channelAlias.update({
        where: { id },
        data: { isActive: false },
      });

      services.logger.info({ aliasId: id }, 'Channel alias deleted');

      res.status(204).send();
    } catch (error: any) {
      services.logger.error({ error: error.message }, 'Failed to delete alias');
      res.status(500).json({ error: 'Failed to delete alias' });
    }
  });

  return router;
}
