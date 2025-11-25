import { Router } from 'express';
import { db } from '@chatbridge/database';
import { SlackClient } from '@chatbridge/slack-adapter';
import type { Services } from '../services';

export function createWorkspaceRoutes(services: Services): Router {
  const router = Router();

  /**
   * GET /api/workspaces
   * List all connected Slack workspaces
   */
  router.get('/', async (req, res) => {
    try {
      const workspaces = await db.slackWorkspace.findMany({
        select: {
          id: true,
          teamId: true,
          teamName: true,
          botUserId: true,
          status: true,
          installedBy: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              aliases: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      res.json(workspaces);
    } catch (error: any) {
      services.logger.error(
        { error: error.message },
        'Failed to list workspaces'
      );
      res.status(500).json({ error: 'Failed to list workspaces' });
    }
  });

  /**
   * GET /api/workspaces/:id
   * Get a single workspace with details
   */
  router.get('/:id', async (req, res) => {
    try {
      const { id } = req.params;

      const workspace = await db.slackWorkspace.findUnique({
        where: { id },
        select: {
          id: true,
          teamId: true,
          teamName: true,
          botUserId: true,
          status: true,
          installedBy: true,
          createdAt: true,
          updatedAt: true,
          aliases: {
            select: {
              id: true,
              slackChannelId: true,
              slackChannelName: true,
              emailAddress: true,
              isActive: true,
              createdAt: true,
            },
            orderBy: {
              createdAt: 'desc',
            },
          },
          _count: {
            select: {
              aliases: true,
              messageLogs: true,
            },
          },
        },
      });

      if (!workspace) {
        return res.status(404).json({ error: 'Workspace not found' });
      }

      res.json(workspace);
    } catch (error: any) {
      services.logger.error({ error: error.message }, 'Failed to get workspace');
      res.status(500).json({ error: 'Failed to get workspace' });
    }
  });

  /**
   * GET /api/workspaces/:id/channels
   * List all channels in a workspace (from Slack API)
   */
  router.get('/:id/channels', async (req, res) => {
    try {
      const { id } = req.params;
      const includePrivate = req.query.includePrivate === 'true';

      const workspace = await db.slackWorkspace.findUnique({
        where: { id },
      });

      if (!workspace) {
        return res.status(404).json({ error: 'Workspace not found' });
      }

      // Initialize Slack client
      const slackClient = new SlackClient({
        botToken: workspace.accessToken,
        teamId: workspace.teamId,
        logger: services.logger,
      });

      // Get channels (public and optionally private)
      const slackChannels = await slackClient.listChannels(includePrivate);

      const channels = slackChannels.map((ch) => ({
        id: ch.id,
        name: ch.name,
        isPrivate: ch.isPrivate,
        isMember: ch.isMember,
      }));

      // Get existing aliases to mark which channels already have aliases
      const existingAliases = await db.channelAlias.findMany({
        where: { workspaceId: workspace.id },
        select: { slackChannelId: true },
      });

      const aliasedChannelIds = new Set(
        existingAliases.map((a) => a.slackChannelId)
      );

      const channelsWithAliasInfo = channels.map((ch) => ({
        ...ch,
        hasAlias: aliasedChannelIds.has(ch.id),
      }));

      res.json(channelsWithAliasInfo);
    } catch (error: any) {
      services.logger.error(
        { error: error.message },
        'Failed to list channels'
      );
      res.status(500).json({ error: 'Failed to list channels' });
    }
  });

  /**
   * DELETE /api/workspaces/:id
   * Disconnect a workspace
   */
  router.delete('/:id', async (req, res) => {
    try {
      const { id } = req.params;

      const workspace = await db.slackWorkspace.findUnique({
        where: { id },
      });

      if (!workspace) {
        return res.status(404).json({ error: 'Workspace not found' });
      }

      // Deactivate all aliases for this workspace
      await db.channelAlias.updateMany({
        where: { workspaceId: id },
        data: { isActive: false },
      });

      // Mark workspace as inactive
      await db.slackWorkspace.update({
        where: { id },
        data: { status: 'INACTIVE' },
      });

      services.logger.info(
        { workspaceId: id, teamId: workspace.teamId },
        'Workspace disconnected'
      );

      res.status(204).send();
    } catch (error: any) {
      services.logger.error(
        { error: error.message },
        'Failed to disconnect workspace'
      );
      res.status(500).json({ error: 'Failed to disconnect workspace' });
    }
  });

  return router;
}
