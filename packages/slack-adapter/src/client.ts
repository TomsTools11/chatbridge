import { WebClient, ChatPostMessageResponse, FilesUploadV2Response } from '@slack/web-api';
import { SlackAPIError } from '@chatbridge/shared';
import type {
  SlackClientConfig,
  PostMessageParams,
  SlackChannel,
  SlackUser,
  SlackFileInfo,
} from './types';

export class SlackClient {
  private client: WebClient;
  private teamId: string;
  private logger: any;

  constructor(config: SlackClientConfig) {
    this.client = new WebClient(config.botToken);
    this.teamId = config.teamId;
    this.logger = config.logger || console;
  }

  /**
   * Post a message to a Slack channel
   */
  async postMessage(params: PostMessageParams): Promise<ChatPostMessageResponse> {
    try {
      this.logger.info({ channel: params.channel, threadTs: params.threadTs }, 'Posting message to Slack');

      const response = await this.client.chat.postMessage({
        channel: params.channel,
        text: params.text,
        thread_ts: params.threadTs,
        blocks: params.blocks,
        metadata: params.metadata,
      });

      if (!response.ok) {
        throw new Error(`Slack API error: ${response.error}`);
      }

      this.logger.info({ ts: response.ts }, 'Message posted successfully');
      return response;
    } catch (error: any) {
      this.logger.error({ error: error.message }, 'Failed to post message to Slack');
      throw new SlackAPIError(
        `Failed to post message: ${error.message}`,
        error.data?.error || 'unknown_error',
        this.isRetryableError(error)
      );
    }
  }

  /**
   * Get channel information
   */
  async getChannel(channelId: string): Promise<SlackChannel | null> {
    try {
      const response = await this.client.conversations.info({
        channel: channelId,
      });

      if (!response.ok || !response.channel) {
        return null;
      }

      const channel = response.channel as any;
      return {
        id: channel.id,
        name: channel.name,
        isPrivate: channel.is_private || false,
        isMember: channel.is_member || false,
        topic: channel.topic?.value,
        purpose: channel.purpose?.value,
      };
    } catch (error: any) {
      this.logger.error({ error: error.message, channelId }, 'Failed to get channel info');
      return null;
    }
  }

  /**
   * List all channels the bot is a member of
   */
  async listChannels(includePrivate = true): Promise<SlackChannel[]> {
    try {
      const types = includePrivate ? 'public_channel,private_channel' : 'public_channel';
      const response = await this.client.conversations.list({
        types,
        exclude_archived: true,
        limit: 200,
      });

      if (!response.ok || !response.channels) {
        return [];
      }

      return response.channels.map((channel: any) => ({
        id: channel.id,
        name: channel.name,
        isPrivate: channel.is_private || false,
        isMember: channel.is_member || false,
        topic: channel.topic?.value,
        purpose: channel.purpose?.value,
      }));
    } catch (error: any) {
      this.logger.error({ error: error.message }, 'Failed to list channels');
      return [];
    }
  }

  /**
   * Get user information
   */
  async getUser(userId: string): Promise<SlackUser | null> {
    try {
      const response = await this.client.users.info({
        user: userId,
      });

      if (!response.ok || !response.user) {
        return null;
      }

      const user = response.user as any;
      return {
        id: user.id,
        name: user.name,
        realName: user.real_name,
        email: user.profile?.email,
        isBot: user.is_bot || false,
      };
    } catch (error: any) {
      this.logger.error({ error: error.message, userId }, 'Failed to get user info');
      return null;
    }
  }

  /**
   * Download a file from Slack
   */
  async downloadFile(file: SlackFileInfo): Promise<Buffer> {
    try {
      const response = await fetch(file.urlPrivateDownload, {
        headers: {
          Authorization: `Bearer ${this.client.token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to download file: ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (error: any) {
      this.logger.error({ error: error.message, fileId: file.id }, 'Failed to download file');
      throw new SlackAPIError(
        `Failed to download file: ${error.message}`,
        'file_download_error',
        true
      );
    }
  }

  /**
   * Upload a file to Slack
   */
  async uploadFile(
    channel: string,
    file: Buffer,
    filename: string,
    threadTs?: string
  ): Promise<FilesUploadV2Response> {
    try {
      const response = await this.client.files.uploadV2({
        channels: channel,
        file,
        filename,
        thread_ts: threadTs,
      });

      if (!response.ok) {
        throw new Error(`Slack API error: ${response.error}`);
      }

      return response;
    } catch (error: any) {
      this.logger.error({ error: error.message }, 'Failed to upload file to Slack');
      throw new SlackAPIError(
        `Failed to upload file: ${error.message}`,
        error.data?.error || 'unknown_error',
        this.isRetryableError(error)
      );
    }
  }

  /**
   * Test the connection (auth.test)
   */
  async testAuth(): Promise<boolean> {
    try {
      const response = await this.client.auth.test();
      return response.ok === true;
    } catch (error: any) {
      this.logger.error({ error: error.message }, 'Auth test failed');
      return false;
    }
  }

  /**
   * Determine if an error is retryable
   */
  private isRetryableError(error: any): boolean {
    const retryableErrors = [
      'ratelimited',
      'internal_error',
      'service_unavailable',
      'timeout',
    ];
    return retryableErrors.includes(error.data?.error);
  }
}
