import { simpleParser } from 'mailparser';
import type { ParsedEmail, EmailAttachment, SESWebhookPayload, SESMessage } from './types';

/**
 * Parse raw email content into structured format
 */
export async function parseEmail(rawEmail: string | Buffer): Promise<ParsedEmail> {
  const parsed = await simpleParser(rawEmail);

  const attachments: EmailAttachment[] = [];
  if (parsed.attachments && parsed.attachments.length > 0) {
    for (const att of parsed.attachments) {
      attachments.push({
        filename: att.filename || 'unnamed',
        content: att.content,
        contentType: att.contentType,
        size: att.size,
        contentId: att.contentId,
      });
    }
  }

  return {
    messageId: parsed.messageId || '',
    from: {
      name: parsed.from?.value[0]?.name,
      address: parsed.from?.value[0]?.address || '',
    },
    to: (parsed.to?.value || []).map((addr) => ({
      name: addr.name,
      address: addr.address || '',
    })),
    cc: (parsed.cc?.value || []).map((addr) => ({
      name: addr.name,
      address: addr.address || '',
    })),
    subject: parsed.subject || '',
    text: parsed.text,
    html: parsed.html ? String(parsed.html) : undefined,
    inReplyTo: parsed.inReplyTo,
    references: parsed.references,
    date: parsed.date || new Date(),
    attachments,
    headers: parsed.headers,
  };
}

/**
 * Parse SES webhook payload
 */
export function parseSESWebhook(payload: SESWebhookPayload): SESMessage {
  const message = JSON.parse(payload.Message);
  return message as SESMessage;
}

/**
 * Extract plain text from HTML
 */
export function extractTextFromHtml(html: string): string {
  // Remove script and style tags
  let text = html.replace(/<script[^>]*>.*?<\/script>/gi, '');
  text = text.replace(/<style[^>]*>.*?<\/style>/gi, '');

  // Replace common tags with newlines
  text = text.replace(/<br\s*\/?>/gi, '\n');
  text = text.replace(/<\/p>/gi, '\n\n');
  text = text.replace(/<\/div>/gi, '\n');
  text = text.replace(/<\/h[1-6]>/gi, '\n\n');

  // Remove all remaining HTML tags
  text = text.replace(/<[^>]+>/g, '');

  // Decode HTML entities
  text = text.replace(/&nbsp;/g, ' ');
  text = text.replace(/&lt;/g, '<');
  text = text.replace(/&gt;/g, '>');
  text = text.replace(/&amp;/g, '&');
  text = text.replace(/&quot;/g, '"');

  // Clean up whitespace
  text = text.replace(/\n{3,}/g, '\n\n');
  text = text.trim();

  return text;
}

/**
 * Strip email signatures
 */
export function stripSignature(text: string): string {
  const signaturePatterns = [
    /\n--\s*\n/,
    /\n---+\s*\n/,
    /\nSent from my iPhone/i,
    /\nSent from my Android/i,
    /\nGet Outlook for/i,
    /\nThanks,?\s*\n/i,
    /\nBest regards,?\s*\n/i,
    /\nRegards,?\s*\n/i,
  ];

  let stripped = text;
  for (const pattern of signaturePatterns) {
    const match = stripped.match(pattern);
    if (match && match.index) {
      stripped = stripped.substring(0, match.index);
    }
  }

  return stripped.trim();
}

/**
 * Strip quoted text from reply emails
 */
export function stripQuotedText(text: string): string {
  const lines = text.split('\n');
  const result: string[] = [];

  let inQuote = false;
  for (const line of lines) {
    // Check for quote markers
    if (
      line.match(/^On .+ wrote:/) ||
      line.match(/^From:.+Sent:/) ||
      line.startsWith('>') ||
      line.match(/^-----Original Message-----/)
    ) {
      inQuote = true;
      break;
    }

    if (!inQuote) {
      result.push(line);
    }
  }

  return result.join('\n').trim();
}

/**
 * Clean email content for display
 */
export function cleanEmailContent(text: string): string {
  let cleaned = stripQuotedText(text);
  cleaned = stripSignature(cleaned);
  return cleaned;
}
