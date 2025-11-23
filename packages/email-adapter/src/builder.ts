import type { EmailMessage } from './types';

/**
 * Build MIME email message
 */
export function buildMimeMessage(message: EmailMessage): string {
  const boundary = `----=_Part_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  const headers: string[] = [];

  // Required headers
  headers.push(`From: ${message.from}`);
  headers.push(`To: ${message.to.join(', ')}`);

  if (message.cc && message.cc.length > 0) {
    headers.push(`Cc: ${message.cc.join(', ')}`);
  }

  if (message.replyTo) {
    headers.push(`Reply-To: ${message.replyTo}`);
  }

  headers.push(`Subject: ${message.subject}`);
  headers.push(`Date: ${new Date().toUTCString()}`);
  headers.push(`Message-ID: <${generateMessageId(message.from)}>`);

  // Thread headers
  if (message.inReplyTo) {
    headers.push(`In-Reply-To: ${message.inReplyTo}`);
  }

  if (message.references && message.references.length > 0) {
    headers.push(`References: ${message.references.join(' ')}`);
  }

  // Custom headers
  if (message.headers) {
    for (const [key, value] of Object.entries(message.headers)) {
      headers.push(`${key}: ${value}`);
    }
  }

  // MIME headers
  headers.push(`MIME-Version: 1.0`);
  headers.push(`Content-Type: multipart/alternative; boundary="${boundary}"`);

  const parts: string[] = [headers.join('\r\n'), ''];

  // Text part
  if (message.text) {
    parts.push(`--${boundary}`);
    parts.push('Content-Type: text/plain; charset=UTF-8');
    parts.push('Content-Transfer-Encoding: 8bit');
    parts.push('');
    parts.push(message.text);
    parts.push('');
  }

  // HTML part
  if (message.html) {
    parts.push(`--${boundary}`);
    parts.push('Content-Type: text/html; charset=UTF-8');
    parts.push('Content-Transfer-Encoding: 8bit');
    parts.push('');
    parts.push(message.html);
    parts.push('');
  }

  // Attachments (simplified - would need more robust handling)
  if (message.attachments && message.attachments.length > 0) {
    for (const attachment of message.attachments) {
      parts.push(`--${boundary}`);
      parts.push(`Content-Type: ${attachment.contentType}`);
      parts.push('Content-Transfer-Encoding: base64');
      parts.push(`Content-Disposition: attachment; filename="${attachment.filename}"`);
      parts.push('');
      parts.push(attachment.content.toString('base64'));
      parts.push('');
    }
  }

  parts.push(`--${boundary}--`);

  return parts.join('\r\n');
}

/**
 * Generate unique message ID
 */
export function generateMessageId(from: string): string {
  const domain = from.split('@')[1] || 'example.com';
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  return `${timestamp}.${random}@${domain}`;
}

/**
 * Build email HTML with proper formatting
 */
export function buildEmailHtml(content: string, metadata?: {
  channelName?: string;
  senderName?: string;
  footer?: string;
}): string {
  const styles = `
    <style>
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        line-height: 1.6;
        color: #333;
        max-width: 600px;
        margin: 0 auto;
        padding: 20px;
      }
      .header {
        border-bottom: 2px solid #4A154B;
        padding-bottom: 10px;
        margin-bottom: 20px;
      }
      .channel {
        color: #4A154B;
        font-weight: bold;
      }
      .content {
        margin: 20px 0;
      }
      .footer {
        border-top: 1px solid #ddd;
        padding-top: 10px;
        margin-top: 20px;
        font-size: 12px;
        color: #666;
      }
      code {
        background: #f4f4f4;
        padding: 2px 4px;
        border-radius: 3px;
        font-family: monospace;
      }
      pre {
        background: #f4f4f4;
        padding: 10px;
        border-radius: 5px;
        overflow-x: auto;
      }
    </style>
  `;

  let html = `<!DOCTYPE html><html><head>${styles}</head><body>`;

  if (metadata?.channelName || metadata?.senderName) {
    html += `<div class="header">`;
    if (metadata.channelName) {
      html += `<div>Posted in <span class="channel">#${metadata.channelName}</span></div>`;
    }
    if (metadata.senderName) {
      html += `<div>By ${metadata.senderName}</div>`;
    }
    html += `</div>`;
  }

  html += `<div class="content">${content}</div>`;

  if (metadata?.footer) {
    html += `<div class="footer">${metadata.footer}</div>`;
  } else {
    html += `<div class="footer">Reply to this email to respond in Slack.</div>`;
  }

  html += `</body></html>`;

  return html;
}
