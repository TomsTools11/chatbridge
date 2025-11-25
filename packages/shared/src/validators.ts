import { z } from 'zod';

// Slack message event schema
export const slackMessageEventSchema = z.object({
  type: z.literal('message'),
  subtype: z.string().optional(),
  channel: z.string(),
  user: z.string(),
  text: z.string(),
  ts: z.string(),
  thread_ts: z.string().optional(),
  files: z.array(z.any()).optional(),
  bot_id: z.string().optional(),
  team: z.string().optional(),
});

// Channel alias schemas
export const createChannelAliasSchema = z.object({
  workspaceId: z.string().uuid(),
  slackChannelId: z.string().min(1, 'Channel ID is required'),
  slackChannelName: z.string().optional(),
  emailAddress: z.string().email('Invalid email address'),
  isPrivate: z.boolean().default(false),
  recipients: z.array(z.string().email()).min(1, 'At least one recipient required'),
});

export const updateChannelAliasSchema = z.object({
  slackChannelName: z.string().optional(),
  emailAddress: z.string().email().optional(),
  recipients: z.array(z.string().email()).optional(),
  isActive: z.boolean().optional(),
});

export const listAliasesQuerySchema = z.object({
  page: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 1)),
  limit: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 20)),
  workspaceId: z.string().uuid().optional(),
  isActive: z.string().optional().transform((val) => val === 'true'),
});

// Message log schemas
export const listMessagesQuerySchema = z.object({
  page: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 1)),
  limit: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 50)),
  direction: z.enum(['EMAIL_TO_SLACK', 'SLACK_TO_EMAIL']).optional(),
  status: z.enum(['PENDING', 'DELIVERED', 'FAILED']).optional(),
  channelAliasId: z.string().uuid().optional(),
  workspaceId: z.string().uuid().optional(),
});

// Email webhook payload schema (SES)
export const sesWebhookSchema = z.object({
  Type: z.string(),
  MessageId: z.string(),
  Message: z.string(),
});

// Type exports
export type SlackMessageEvent = z.infer<typeof slackMessageEventSchema>;
export type CreateChannelAliasInput = z.infer<typeof createChannelAliasSchema>;
export type UpdateChannelAliasInput = z.infer<typeof updateChannelAliasSchema>;
export type ListAliasesQuery = z.infer<typeof listAliasesQuerySchema>;
export type ListMessagesQuery = z.infer<typeof listMessagesQuerySchema>;
export type SESWebhookPayload = z.infer<typeof sesWebhookSchema>;
