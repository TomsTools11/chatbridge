import { nanoid } from 'nanoid';

/**
 * Generate a unique trace ID for request tracking
 */
export function generateTraceId(): string {
  return nanoid();
}

/**
 * Generate a unique email alias
 * Format: {prefix}-{random}@{domain}
 */
export function generateEmailAlias(prefix: string, domain: string): string {
  const random = nanoid(10);
  const sanitizedPrefix = prefix.toLowerCase().replace(/[^a-z0-9-]/g, '-');
  return `${sanitizedPrefix}-${random}@${domain}`;
}

/**
 * Extract thread ID from email headers
 * Uses In-Reply-To or first References header
 */
export function extractEmailThreadId(
  inReplyTo?: string,
  references?: string[]
): string | null {
  if (inReplyTo) {
    return inReplyTo.trim();
  }
  if (references && references.length > 0) {
    return references[0].trim();
  }
  return null;
}

/**
 * Parse email addresses from various formats
 * "John Doe <john@example.com>" -> { name: "John Doe", email: "john@example.com" }
 */
export function parseEmailAddress(address: string): { name?: string; email: string } {
  const match = address.match(/^(?:"?([^"]*)"?\s)?<?([^>]+)>?$/);
  if (match) {
    const [, name, email] = match;
    return { name: name?.trim(), email: email.trim() };
  }
  return { email: address.trim() };
}

/**
 * Sleep for a given number of milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry a function with exponential backoff
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: {
    attempts?: number;
    delay?: number;
    maxDelay?: number;
    backoff?: number;
  } = {}
): Promise<T> {
  const { attempts = 3, delay = 1000, maxDelay = 30000, backoff = 2 } = options;

  let lastError: Error;

  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (i < attempts - 1) {
        const waitTime = Math.min(delay * Math.pow(backoff, i), maxDelay);
        await sleep(waitTime);
      }
    }
  }

  throw lastError!;
}

/**
 * Sanitize text for safe display
 */
export function sanitizeText(text: string): string {
  return text.replace(/[<>]/g, (char) => {
    return char === '<' ? '&lt;' : '&gt;';
  });
}

/**
 * Truncate text to a maximum length
 */
export function truncate(text: string, maxLength: number, suffix = '...'): string {
  if (text.length <= maxLength) {
    return text;
  }
  return text.substring(0, maxLength - suffix.length) + suffix;
}

/**
 * Format file size in human-readable format
 */
export function formatFileSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

/**
 * Check if a string is a valid email address
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}
