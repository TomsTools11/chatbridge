// Common types used across the application

export interface ParsedEmail {
  messageId: string;
  from: string;
  to: string[];
  cc?: string[];
  subject: string;
  text?: string;
  html?: string;
  inReplyTo?: string;
  references?: string[];
  date: Date;
  attachments?: EmailAttachment[];
  headers?: Record<string, string>;
}

export interface EmailAttachment {
  filename: string;
  contentType: string;
  size: number;
  content: Buffer;
  contentId?: string;
}

export interface SlackMessage {
  ts: string;
  threadTs?: string;
  channel: string;
  user: string;
  text: string;
  blocks?: any[];
  files?: SlackFile[];
  teamId: string;
}

export interface SlackFile {
  id: string;
  name: string;
  mimetype: string;
  size: number;
  urlPrivate: string;
  urlPrivateDownload: string;
}

export interface NormalizedMessage {
  content: string;
  html?: string;
  blocks?: any[];
  attachments?: MessageAttachment[];
  metadata?: Record<string, any>;
}

export interface MessageAttachment {
  id: string;
  filename: string;
  url: string;
  size: number;
  mimeType: string;
}

export interface MessageContext {
  traceId: string;
  direction: 'email→slack' | 'slack→email';
  workspaceId?: string;
  channelId?: string;
  aliasId?: string;
  timestamp: Date;
}

export interface DeliveryResult {
  success: boolean;
  messageId?: string;
  error?: Error;
  retryable?: boolean;
}
