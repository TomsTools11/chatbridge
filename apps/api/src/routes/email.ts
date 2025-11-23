import { Router } from 'express';
import { parseEmail, parseSESWebhook } from '@chatbridge/email-adapter';
import { generateTraceId } from '@chatbridge/shared';
import type { Services } from '../services';

export function createEmailRoutes(services: Services): Router {
  const router = Router();

  // SES webhook for inbound emails
  router.post('/ses', async (req, res) => {
    try {
      const rawBody = req.body.toString('utf8');
      const payload = JSON.parse(rawBody);

      services.logger.info({ type: payload.Type }, 'Received SES webhook');

      // Handle SNS subscription confirmation
      if (payload.Type === 'SubscriptionConfirmation') {
        services.logger.info({ subscribeUrl: payload.SubscribeURL }, 'SNS subscription confirmation');
        // In production, auto-confirm by fetching SubscribeURL
        return res.status(200).send('Subscription confirmation received');
      }

      // Handle notification
      if (payload.Type === 'Notification') {
        const message = parseSESWebhook(payload);

        if (message.notificationType === 'Received' && message.content) {
          // Parse email content
          const email = await parseEmail(message.content);

          // Queue for processing
          await services.emailToSlackQueue.add(
            {
              email,
              traceId: generateTraceId(),
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
            { messageId: email.messageId, from: email.from.address },
            'Email queued for processing'
          );
        }
      }

      res.status(200).send('OK');
    } catch (error: any) {
      services.logger.error({ error: error.message }, 'Email webhook processing failed');
      res.status(500).send('Processing failed');
    }
  });

  return router;
}
