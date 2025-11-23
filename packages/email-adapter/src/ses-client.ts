import { SESClient, SendRawEmailCommand, VerifyDomainIdentityCommand } from '@aws-sdk/client-ses';
import { EmailDeliveryError } from '@chatbridge/shared';
import { buildMimeMessage } from './builder';
import type { SESConfig, EmailMessage } from './types';

export class SESEmailClient {
  private client: SESClient;
  private domain: string;
  private logger: any;

  constructor(config: SESConfig, logger?: any) {
    this.client = new SESClient({
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
    this.domain = config.domain;
    this.logger = logger || console;
  }

  /**
   * Send an email via SES
   */
  async sendEmail(message: EmailMessage): Promise<string> {
    try {
      this.logger.info({ to: message.to, subject: message.subject }, 'Sending email via SES');

      // Build MIME message
      const mimeMessage = buildMimeMessage(message);

      // Send via SES
      const command = new SendRawEmailCommand({
        RawMessage: {
          Data: Buffer.from(mimeMessage),
        },
        Source: message.from,
        Destinations: [...message.to, ...(message.cc || []), ...(message.bcc || [])],
      });

      const response = await this.client.send(command);

      if (!response.MessageId) {
        throw new Error('SES did not return a message ID');
      }

      this.logger.info({ messageId: response.MessageId }, 'Email sent successfully');
      return response.MessageId;
    } catch (error: any) {
      this.logger.error({ error: error.message }, 'Failed to send email');
      throw new EmailDeliveryError(
        `Failed to send email: ${error.message}`,
        this.isRetryableError(error)
      );
    }
  }

  /**
   * Verify domain identity with SES
   */
  async verifyDomain(domain: string): Promise<string> {
    try {
      const command = new VerifyDomainIdentityCommand({ Domain: domain });
      const response = await this.client.send(command);

      if (!response.VerificationToken) {
        throw new Error('Failed to get verification token');
      }

      return response.VerificationToken;
    } catch (error: any) {
      this.logger.error({ error: error.message, domain }, 'Failed to verify domain');
      throw new Error(`Domain verification failed: ${error.message}`);
    }
  }

  /**
   * Test SES connection
   */
  async testConnection(): Promise<boolean> {
    try {
      // Send a test email to ourselves
      const testMessage: EmailMessage = {
        from: `test@${this.domain}`,
        to: [`test@${this.domain}`],
        subject: 'SES Connection Test',
        text: 'This is a test message.',
      };

      await this.sendEmail(testMessage);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Determine if an error is retryable
   */
  private isRetryableError(error: any): boolean {
    const retryableErrors = ['Throttling', 'ServiceUnavailable', 'RequestTimeout'];
    return retryableErrors.includes(error.name);
  }
}
