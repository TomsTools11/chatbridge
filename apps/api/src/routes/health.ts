import { Router } from 'express';
import { prisma, isDatabaseHealthy } from '@chatbridge/database';
import type { Services } from '../services';

export function createHealthRoutes(services: Services): Router {
  const router = Router();

  // Basic liveness check
  router.get('/', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Readiness check
  router.get('/ready', async (_req, res) => {
    try {
      // Check database
      const dbHealthy = await isDatabaseHealthy();
      if (!dbHealthy) {
        return res.status(503).json({
          status: 'unhealthy',
          checks: {
            database: 'down',
          },
        });
      }

      // Check Redis
      let redisHealthy = false;
      try {
        await services.redis.ping();
        redisHealthy = true;
      } catch (error) {
        services.logger.error({ error }, 'Redis health check failed');
      }

      if (!redisHealthy) {
        return res.status(503).json({
          status: 'unhealthy',
          checks: {
            database: 'up',
            redis: 'down',
          },
        });
      }

      res.json({
        status: 'healthy',
        checks: {
          database: 'up',
          redis: 'up',
        },
      });
    } catch (error) {
      services.logger.error({ error }, 'Health check failed');
      res.status(503).json({ status: 'unhealthy', error: 'Health check failed' });
    }
  });

  return router;
}
