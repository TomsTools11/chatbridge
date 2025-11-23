export interface SESConfig {
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  domain: string;
}

export interface EmailMessage {
  from: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  replyTo?: string;
  subject: string;
  text?: string;
  html?: string;
  attachments?: EmailAttachment[];
  headers?: Record<string, string>;
  references?: string[];
  inReplyTo?: string;
}

export interface EmailAttachment {
  filename: string;
  content: Buffer;
  contentType: string;
  size: number;
  contentId?: string;
}

export interface ParsedEmail {
  messageId: string;
  from: {
    name?: string;
    address: string;
  };
  to: Array<{
    name?: string;
    address: string;
  }>;
  cc?: Array<{
    name?: string;
    address: string;
  }>;
  subject: string;
  text?: string;
  html?: string;
  inReplyTo?: string;
  references?: string[];
  date: Date;
  attachments?: EmailAttachment[];
  headers: Map<string, string>;
}

export interface SESWebhookPayload {
  Type: string;
  MessageId: string;
  Message: string;
}

export interface SESMessage {
  notificationType: string;
  mail: {
    messageId: string;
    timestamp: string;
    source: string;
    destination: string[];
  };
  content?: string;
}
