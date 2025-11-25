import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import pino from 'pino';
import { createHealthRoutes } from './routes/health';
import { createSlackRoutes } from './routes/slack';
import { createEmailRoutes } from './routes/email';
import { createAliasRoutes } from './routes/aliases';
import { createWorkspaceRoutes } from './routes/workspaces';
import { createMessageRoutes } from './routes/messages';
import { errorHandler } from './middleware/error-handler';
import { initializeServices } from './services';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
});

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(pinoHttp({ logger }));

// Raw body for webhooks (SES/Slack signature verification)
app.use('/webhooks', express.raw({ type: 'application/json', limit: '10mb' }));

// JSON body parser for API routes
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Initialize services
const services = initializeServices(logger);

// Routes
app.use('/health', createHealthRoutes(services));
app.use('/slack', createSlackRoutes(services));
app.use('/webhooks/email', createEmailRoutes(services));

// Admin API routes
app.use('/api/aliases', createAliasRoutes(services));
app.use('/api/workspaces', createWorkspaceRoutes(services));
app.use('/api/messages', createMessageRoutes(services));

// Error handling
app.use(errorHandler);

// Start server
app.listen(port, () => {
  logger.info({ port }, 'API server started');
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});
