import { SESClient } from '@chatbridge/email-adapter';
import { SlackClient } from '@chatbridge/slack-adapter';
import logger from '../utils/logger';

export interface AlertNotification {
  type: 'email_failed' | 'slack_failed' | 'virus_detected' | 'system_error';
  severity: 'warning' | 'error' | 'critical';
  title: string;
  message: string;
  details?: any;
}

export class NotificationService {
  private sesClient: SESClient | null = null;
  private alertEmail: string | null;
  private alertSlackWebhook: string | null;

  constructor() {
    this.alertEmail = process.env.ALERT_EMAIL || null;
    this.alertSlackWebhook = process.env.ALERT_SLACK_WEBHOOK || null;

    // Initialize SES client if configured
    if (process.env.AWS_SES_REGION) {
      this.sesClient = new SESClient({
        region: process.env.AWS_SES_REGION,
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      });
    }
  }

  /**
   * Send alert notification via configured channels
   */
  async sendAlert(notification: AlertNotification): Promise<void> {
    logger.warn(
      {
        type: notification.type,
        severity: notification.severity,
        title: notification.title,
      },
      'Sending alert notification'
    );

    // Send via email if configured
    if (this.alertEmail && this.sesClient) {
      try {
        await this.sendEmailAlert(notification);
      } catch (error) {
        logger.error({ error }, 'Failed to send email alert');
      }
    }

    // Send via Slack webhook if configured
    if (this.alertSlackWebhook) {
      try {
        await this.sendSlackAlert(notification);
      } catch (error) {
        logger.error({ error }, 'Failed to send Slack alert');
      }
    }

    // If no alert channels configured, just log
    if (!this.alertEmail && !this.alertSlackWebhook) {
      logger.warn(
        'No alert channels configured. Set ALERT_EMAIL or ALERT_SLACK_WEBHOOK'
      );
    }
  }

  /**
   * Send email alert
   */
  private async sendEmailAlert(
    notification: AlertNotification
  ): Promise<void> {
    if (!this.sesClient || !this.alertEmail) return;

    const severityEmoji = {
      warning: '⚠️',
      error: '❌',
      critical: '🚨',
    };

    const htmlBody = `
      <h2>${severityEmoji[notification.severity]} ${notification.title}</h2>
      <p><strong>Type:</strong> ${notification.type}</p>
      <p><strong>Severity:</strong> ${notification.severity}</p>
      <p>${notification.message}</p>
      ${
        notification.details
          ? `<pre>${JSON.stringify(notification.details, null, 2)}</pre>`
          : ''
      }
    `;

    await this.sesClient.sendEmail({
      to: [this.alertEmail],
      subject: `[ChatBridge Alert] ${notification.title}`,
      html: htmlBody,
      from: process.env.BRIDGE_EMAIL_FROM || 'alerts@chatbridge.app',
    });

    logger.info({ alertEmail: this.alertEmail }, 'Email alert sent');
  }

  /**
   * Send Slack webhook alert
   */
  private async sendSlackAlert(
    notification: AlertNotification
  ): Promise<void> {
    if (!this.alertSlackWebhook) return;

    const severityColor = {
      warning: '#FFA500',
      error: '#FF0000',
      critical: '#8B0000',
    };

    const payload = {
      attachments: [
        {
          color: severityColor[notification.severity],
          title: notification.title,
          fields: [
            {
              title: 'Type',
              value: notification.type,
              short: true,
            },
            {
              title: 'Severity',
              value: notification.severity.toUpperCase(),
              short: true,
            },
            {
              title: 'Message',
              value: notification.message,
              short: false,
            },
          ],
          ...(notification.details && {
            text: `\`\`\`${JSON.stringify(notification.details, null, 2)}\`\`\``,
          }),
          footer: 'ChatBridge Worker',
          ts: Math.floor(Date.now() / 1000),
        },
      ],
    };

    const response = await fetch(this.alertSlackWebhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Slack webhook failed: ${response.statusText}`);
    }

    logger.info('Slack alert sent');
  }

  /**
   * Send notification about failed email delivery
   */
  async notifyEmailDeliveryFailed(params: {
    emailMessageId: string;
    recipient: string;
    error: string;
  }): Promise<void> {
    await this.sendAlert({
      type: 'email_failed',
      severity: 'error',
      title: 'Email Delivery Failed',
      message: `Failed to deliver email to ${params.recipient}`,
      details: {
        messageId: params.emailMessageId,
        recipient: params.recipient,
        error: params.error,
      },
    });
  }

  /**
   * Send notification about failed Slack message
   */
  async notifySlackMessageFailed(params: {
    channelId: string;
    error: string;
  }): Promise<void> {
    await this.sendAlert({
      type: 'slack_failed',
      severity: 'error',
      title: 'Slack Message Failed',
      message: `Failed to post message to Slack channel ${params.channelId}`,
      details: {
        channelId: params.channelId,
        error: params.error,
      },
    });
  }

  /**
   * Send notification about virus detection
   */
  async notifyVirusDetected(params: {
    filename: string;
    source: 'email' | 'slack';
    scanResult: any;
  }): Promise<void> {
    await this.sendAlert({
      type: 'virus_detected',
      severity: 'critical',
      title: 'Virus Detected in Attachment',
      message: `Malicious file detected: ${params.filename} (from ${params.source})`,
      details: {
        filename: params.filename,
        source: params.source,
        scanResult: params.scanResult,
      },
    });
  }
}

// Singleton instance
let notificationService: NotificationService | null = null;

export function getNotificationService(): NotificationService {
  if (!notificationService) {
    notificationService = new NotificationService();
  }
  return notificationService;
}
