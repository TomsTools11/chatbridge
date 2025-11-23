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

// Channel alias creation schema
export const createChannelAliasSchema = z.object({
  workspaceId: z.string().uuid(),
  channelId: z.string(),
  channelName: z.string(),
  isPrivate: z.boolean().default(false),
  recipients: z.array(z.string().email()).default([]),
});

// Email webhook payload schema (SES)
export const sesWebhookSchema = z.object({
  Type: z.string(),
  MessageId: z.string(),
  Message: z.string(),
});

export type SlackMessageEvent = z.infer<typeof slackMessageEventSchema>;
export type CreateChannelAliasInput = z.infer<typeof createChannelAliasSchema>;
export type SESWebhookPayload = z.infer<typeof sesWebhookSchema>;
