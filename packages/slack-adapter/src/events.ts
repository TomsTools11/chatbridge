import crypto from 'crypto';

export interface SlackEventRequest {
  body: any;
  headers: Record<string, string>;
}

/**
 * Verify Slack request signature
 */
export function verifySlackRequest(
  request: SlackEventRequest,
  signingSecret: string
): boolean {
  const timestamp = request.headers['x-slack-request-timestamp'];
  const signature = request.headers['x-slack-signature'];

  if (!timestamp || !signature) {
    return false;
  }

  // Prevent replay attacks
  const currentTime = Math.floor(Date.now() / 1000);
  if (Math.abs(currentTime - parseInt(timestamp)) > 60 * 5) {
    return false;
  }

  const body = typeof request.body === 'string' ? request.body : JSON.stringify(request.body);
  const sigBaseString = `v0:${timestamp}:${body}`;
  const mySignature =
    'v0=' +
    crypto.createHmac('sha256', signingSecret).update(sigBaseString, 'utf8').digest('hex');

  return crypto.timingSafeEqual(Buffer.from(mySignature), Buffer.from(signature));
}

/**
 * Check if a Slack message event should be processed
 * Filters out bot messages, edits, deletes, etc.
 */
export function shouldProcessMessage(event: any): boolean {
  // Ignore messages from bots
  if (event.bot_id || event.subtype === 'bot_message') {
    return false;
  }

  // Ignore message edits and deletes
  if (event.subtype === 'message_changed' || event.subtype === 'message_deleted') {
    return false;
  }

  // Ignore other subtypes (file shares are handled separately)
  if (event.subtype && event.subtype !== 'file_share') {
    return false;
  }

  return true;
}

/**
 * Extract thread timestamp from Slack event
 * Returns thread_ts if it exists, otherwise returns ts (root message)
 */
export function extractThreadTs(event: any): string {
  return event.thread_ts || event.ts;
}

/**
 * Check if message is a thread reply
 */
export function isThreadReply(event: any): boolean {
  return !!event.thread_ts && event.thread_ts !== event.ts;
}
