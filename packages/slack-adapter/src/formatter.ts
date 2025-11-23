/**
 * Convert Slack mrkdwn to HTML
 */
export function slackToHtml(text: string): string {
  let html = text;

  // Bold: *text* -> <strong>text</strong>
  html = html.replace(/\*([^*]+)\*/g, '<strong>$1</strong>');

  // Italic: _text_ -> <em>text</em>
  html = html.replace(/_([^_]+)_/g, '<em>$1</em>');

  // Strike: ~text~ -> <s>text</s>
  html = html.replace(/~([^~]+)~/g, '<s>$1</s>');

  // Inline code: `text` -> <code>text</code>
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Code block: ```text``` -> <pre>text</pre>
  html = html.replace(/```([^`]+)```/g, '<pre>$1</pre>');

  // Links: <http://url|text> -> <a href="url">text</a>
  html = html.replace(/<(https?:\/\/[^|>]+)\|([^>]+)>/g, '<a href="$1">$2</a>');

  // Links without text: <http://url> -> <a href="url">url</a>
  html = html.replace(/<(https?:\/\/[^>]+)>/g, '<a href="$1">$1</a>');

  // Line breaks
  html = html.replace(/\n/g, '<br>');

  return html;
}

/**
 * Convert HTML to Slack mrkdwn
 */
export function htmlToSlack(html: string): string {
  let mrkdwn = html;

  // Remove HTML tags and convert to mrkdwn
  mrkdwn = mrkdwn.replace(/<strong>(.*?)<\/strong>/g, '*$1*');
  mrkdwn = mrkdwn.replace(/<b>(.*?)<\/b>/g, '*$1*');
  mrkdwn = mrkdwn.replace(/<em>(.*?)<\/em>/g, '_$1_');
  mrkdwn = mrkdwn.replace(/<i>(.*?)<\/i>/g, '_$1_');
  mrkdwn = mrkdwn.replace(/<s>(.*?)<\/s>/g, '~$1~');
  mrkdwn = mrkdwn.replace(/<code>(.*?)<\/code>/g, '`$1`');
  mrkdwn = mrkdwn.replace(/<pre>(.*?)<\/pre>/gs, '```$1```');
  mrkdwn = mrkdwn.replace(/<a href="([^"]+)">([^<]+)<\/a>/g, '<$1|$2>');
  mrkdwn = mrkdwn.replace(/<br\s*\/?>/g, '\n');

  // Remove remaining HTML tags
  mrkdwn = mrkdwn.replace(/<[^>]+>/g, '');

  // Decode HTML entities
  mrkdwn = mrkdwn.replace(/&lt;/g, '<');
  mrkdwn = mrkdwn.replace(/&gt;/g, '>');
  mrkdwn = mrkdwn.replace(/&amp;/g, '&');
  mrkdwn = mrkdwn.replace(/&quot;/g, '"');

  return mrkdwn;
}

/**
 * Create Slack blocks for email message display
 */
export function createEmailMessageBlocks(
  from: string,
  subject: string,
  content: string
): any[] {
  return [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*From:* ${from}\n*Subject:* ${subject}`,
      },
    },
    {
      type: 'divider',
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: content,
      },
    },
    {
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: '📧 Via Email Bridge',
        },
      ],
    },
  ];
}

/**
 * Strip email signatures and quoted text
 */
export function stripEmailSignature(text: string): string {
  // Common signature delimiters
  const signaturePatterns = [
    /\n--\s*\n/,
    /\n---+\s*\n/,
    /\nSent from my iPhone/i,
    /\nSent from my Android/i,
    /\nGet Outlook for/i,
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
 * Strip quoted text from emails (On ... wrote:)
 */
export function stripQuotedText(text: string): string {
  const quotePatterns = [
    /\n\s*On .+ wrote:/,
    /\n\s*From:.+\nSent:/,
    /\n\s*>{1,}.*/g,
  ];

  let stripped = text;
  for (const pattern of quotePatterns) {
    const match = stripped.match(pattern);
    if (match && match.index) {
      stripped = stripped.substring(0, match.index);
    }
  }

  return stripped.trim();
}

/**
 * Clean email content for Slack display
 */
export function cleanEmailContent(html: string): string {
  // Strip signatures and quoted text
  let text = stripEmailSignature(html);
  text = stripQuotedText(text);

  // Convert to Slack format
  return htmlToSlack(text);
}
