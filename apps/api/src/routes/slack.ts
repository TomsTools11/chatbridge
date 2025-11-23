import { Router } from 'express';
import { prisma } from '@chatbridge/database';
import { SlackOAuth } from '@chatbridge/slack-adapter';
import { verifySlackRequest, shouldProcessMessage } from '@chatbridge/slack-adapter';
import type { Services } from '../services';

export function createSlackRoutes(services: Services): Router {
  const router = Router();

  const slackOAuth = new SlackOAuth({
    clientId: process.env.SLACK_CLIENT_ID!,
    clientSecret: process.env.SLACK_CLIENT_SECRET!,
    redirectUri: `${process.env.API_URL}/slack/oauth/callback`,
  });

  // OAuth installation URL
  router.get('/install', (_req, res) => {
    const scopes = [
      'channels:history',
      'channels:read',
      'chat:write',
      'files:read',
      'files:write',
      'users:read',
      'users:read.email',
    ];

    const url = slackOAuth.generateInstallUrl(
      `${process.env.API_URL}/slack/oauth/callback`,
      scopes
    );

    res.redirect(url);
  });

  // OAuth callback
  router.get('/oauth/callback', async (req, res) => {
    try {
      const { code } = req.query;

      if (!code || typeof code !== 'string') {
        return res.status(400).send('Missing code parameter');
      }

      // Exchange code for tokens
      const installation = await slackOAuth.handleCallback(
        code,
        `${process.env.API_URL}/slack/oauth/callback`
      );

      // Store workspace in database
      await prisma.slackWorkspace.create({
        data: {
          teamId: installation.teamId,
          teamName: installation.teamName,
          accessToken: installation.accessToken, // Should be encrypted in production
          botUserId: installation.botUserId,
          scopes: installation.scopes,
          status: 'ACTIVE',
          installedBy: installation.installedBy,
          user: {
            connectOrCreate: {
              where: { id: installation.installedBy },
              create: {
                id: installation.installedBy,
                email: `slack-${installation.installedBy}@temp.com`,
                role: 'MEMBER',
              },
            },
          },
        },
      });

      services.logger.info({ teamId: installation.teamId }, 'Slack workspace installed');

      // Redirect to dashboard
      res.redirect(`${process.env.DASHBOARD_URL}?installed=true`);
    } catch (error: any) {
      services.logger.error({ error: error.message }, 'OAuth callback failed');
      res.status(500).send('Installation failed');
    }
  });

  // Slack Events API webhook
  router.post('/events', async (req, res) => {
    try {
      const rawBody = req.body.toString('utf8');
      const payload = JSON.parse(rawBody);

      // Handle URL verification challenge
      if (payload.type === 'url_verification') {
        return res.json({ challenge: payload.challenge });
      }

      // Verify request signature
      const isValid = verifySlackRequest(
        {
          body: rawBody,
          headers: req.headers as Record<string, string>,
        },
        process.env.SLACK_SIGNING_SECRET!
      );

      if (!isValid) {
        services.logger.warn('Invalid Slack signature');
        return res.status(401).send('Invalid signature');
      }

      // Acknowledge receipt immediately
      res.status(200).send();

      // Process event asynchronously
      if (payload.event && payload.event.type === 'message') {
        const event = payload.event;

        // Check if we should process this message
        if (!shouldProcessMessage(event)) {
          return;
        }

        // Queue for processing
        await services.slackToEmailQueue.add(
          {
            event,
            teamId: payload.team_id,
          },
          {
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 2000,
            },
          }
        );

        services.logger.info(
          { channel: event.channel, ts: event.ts },
          'Slack message queued for processing'
        );
      }
    } catch (error: any) {
      services.logger.error({ error: error.message }, 'Slack event processing failed');
    }
  });

  return router;
}
