import { createClient, RedisClientType } from 'redis';
import logger from '../utils/logger';

export class IdempotencyService {
  private client: RedisClientType;
  private connected: boolean = false;

  constructor() {
    this.client = createClient({
      url: process.env.REDIS_URL,
    });

    this.client.on('error', (err) => {
      logger.error({ err }, 'Redis client error');
    });

    this.client.on('connect', () => {
      logger.info('Redis client connected');
      this.connected = true;
    });
  }

  async connect(): Promise<void> {
    if (!this.connected) {
      await this.client.connect();
    }
  }

  async disconnect(): Promise<void> {
    if (this.connected) {
      await this.client.quit();
      this.connected = false;
    }
  }

  /**
   * Check if an email message has already been processed
   */
  async isEmailProcessed(messageId: string): Promise<boolean> {
    const key = `idempotent:email:${messageId}`;
    const exists = await this.client.exists(key);
    return exists === 1;
  }

  /**
   * Mark an email message as processed
   * TTL: 7 days (604800 seconds)
   */
  async markEmailProcessed(messageId: string, data?: any): Promise<void> {
    const key = `idempotent:email:${messageId}`;
    const value = data ? JSON.stringify(data) : 'processed';
    await this.client.setEx(key, 604800, value);
  }

  /**
   * Check if a Slack message has already been processed
   */
  async isSlackMessageProcessed(
    channelId: string,
    timestamp: string
  ): Promise<boolean> {
    const key = `idempotent:slack:${channelId}:${timestamp}`;
    const exists = await this.client.exists(key);
    return exists === 1;
  }

  /**
   * Mark a Slack message as processed
   * TTL: 7 days (604800 seconds)
   */
  async markSlackMessageProcessed(
    channelId: string,
    timestamp: string,
    data?: any
  ): Promise<void> {
    const key = `idempotent:slack:${channelId}:${timestamp}`;
    const value = data ? JSON.stringify(data) : 'processed';
    await this.client.setEx(key, 604800, value);
  }

  /**
   * Get cached data for a processed message
   */
  async getCachedData(key: string): Promise<any | null> {
    const data = await this.client.get(key);
    if (!data) return null;
    try {
      return JSON.parse(data);
    } catch {
      return data;
    }
  }
}

// Singleton instance
let idempotencyService: IdempotencyService | null = null;

export function getIdempotencyService(): IdempotencyService {
  if (!idempotencyService) {
    idempotencyService = new IdempotencyService();
  }
  return idempotencyService;
}
