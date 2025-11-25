import axios from 'axios';
import { db } from '@chatbridge/database';
import { SlackClient } from '@chatbridge/slack-adapter';
import logger from '../utils/logger';

interface VirusTotalScanResult {
  safe: boolean;
  positives: number;
  total: number;
  permalink?: string;
}

export class AttachmentHandlerService {
  private virusTotalApiKey: string | null;
  private maxFileSize: number;

  constructor() {
    this.virusTotalApiKey = process.env.VIRUSTOTAL_API_KEY || null;
    this.maxFileSize = parseInt(process.env.MAX_FILE_SIZE || '10485760'); // 10MB default
  }

  /**
   * Scan file content with VirusTotal
   */
  async scanWithVirusTotal(
    fileBuffer: Buffer,
    filename: string
  ): Promise<VirusTotalScanResult> {
    if (!this.virusTotalApiKey) {
      logger.warn('VirusTotal API key not configured, skipping scan');
      return { safe: true, positives: 0, total: 0 };
    }

    try {
      // Upload file for scanning
      const formData = new FormData();
      const blob = new Blob([fileBuffer]);
      formData.append('file', blob, filename);

      const uploadResponse = await axios.post(
        'https://www.virustotal.com/api/v3/files',
        formData,
        {
          headers: {
            'x-apikey': this.virusTotalApiKey,
          },
          timeout: 30000,
        }
      );

      const analysisId = uploadResponse.data.data.id;

      // Poll for results (with timeout)
      let attempts = 0;
      const maxAttempts = 10;

      while (attempts < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 3000)); // Wait 3s between polls

        const analysisResponse = await axios.get(
          `https://www.virustotal.com/api/v3/analyses/${analysisId}`,
          {
            headers: {
              'x-apikey': this.virusTotalApiKey,
            },
          }
        );

        const status = analysisResponse.data.data.attributes.status;

        if (status === 'completed') {
          const stats = analysisResponse.data.data.attributes.stats;
          const positives = stats.malicious + stats.suspicious;
          const total = Object.values(stats).reduce((a: any, b: any) => a + b, 0) as number;

          logger.info(
            { filename, positives, total },
            'VirusTotal scan completed'
          );

          return {
            safe: positives === 0,
            positives,
            total,
            permalink: analysisResponse.data.data.links.self,
          };
        }

        attempts++;
      }

      // Timeout - treat as safe but log warning
      logger.warn({ filename }, 'VirusTotal scan timed out');
      return { safe: true, positives: 0, total: 0 };
    } catch (error) {
      logger.error({ error, filename }, 'VirusTotal scan failed');
      // On error, default to safe but log the issue
      return { safe: true, positives: 0, total: 0 };
    }
  }

  /**
   * Download email attachment and scan
   */
  async processEmailAttachment(attachment: {
    filename: string;
    contentType: string;
    content: Buffer;
    size: number;
  }): Promise<{
    safe: boolean;
    fileObjectId?: string;
    error?: string;
  }> {
    try {
      // Check file size
      if (attachment.size > this.maxFileSize) {
        return {
          safe: false,
          error: `File too large: ${attachment.size} bytes (max: ${this.maxFileSize})`,
        };
      }

      // Scan with VirusTotal
      const scanResult = await this.scanWithVirusTotal(
        attachment.content,
        attachment.filename
      );

      if (!scanResult.safe) {
        logger.warn(
          {
            filename: attachment.filename,
            positives: scanResult.positives,
            total: scanResult.total,
          },
          'Malicious attachment detected'
        );

        return {
          safe: false,
          error: `File failed virus scan: ${scanResult.positives}/${scanResult.total} engines detected malware`,
        };
      }

      // Store file metadata in database
      const fileObject = await db.fileObject.create({
        data: {
          filename: attachment.filename,
          mimeType: attachment.contentType,
          size: attachment.size,
          virusScanStatus: scanResult.positives === 0 ? 'CLEAN' : 'INFECTED',
          virusScanResult: scanResult.permalink || null,
          // storageUrl would be set if we upload to S3
          // For now, we'll pass the file directly to Slack
        },
      });

      logger.info(
        { fileObjectId: fileObject.id, filename: attachment.filename },
        'Email attachment processed and scanned'
      );

      return {
        safe: true,
        fileObjectId: fileObject.id,
      };
    } catch (error) {
      logger.error(
        { error, filename: attachment.filename },
        'Failed to process email attachment'
      );
      return {
        safe: false,
        error: 'Failed to process attachment',
      };
    }
  }

  /**
   * Download and scan Slack attachment
   */
  async processSlackAttachment(
    slackClient: SlackClient,
    file: {
      id: string;
      name: string;
      mimetype: string;
      size: number;
      url_private: string;
    }
  ): Promise<{
    safe: boolean;
    fileBuffer?: Buffer;
    fileObjectId?: string;
    error?: string;
  }> {
    try {
      // Check file size
      if (file.size > this.maxFileSize) {
        return {
          safe: false,
          error: `File too large: ${file.size} bytes (max: ${this.maxFileSize})`,
        };
      }

      // Download file from Slack
      const fileBuffer = await slackClient.downloadFile(file.url_private);

      // Scan with VirusTotal
      const scanResult = await this.scanWithVirusTotal(fileBuffer, file.name);

      if (!scanResult.safe) {
        logger.warn(
          {
            filename: file.name,
            positives: scanResult.positives,
            total: scanResult.total,
          },
          'Malicious Slack attachment detected'
        );

        return {
          safe: false,
          error: `File failed virus scan: ${scanResult.positives}/${scanResult.total} engines detected malware`,
        };
      }

      // Store file metadata
      const fileObject = await db.fileObject.create({
        data: {
          filename: file.name,
          mimeType: file.mimetype,
          size: file.size,
          virusScanStatus: scanResult.positives === 0 ? 'CLEAN' : 'INFECTED',
          virusScanResult: scanResult.permalink || null,
          storageUrl: file.url_private, // Reference Slack CDN URL
        },
      });

      logger.info(
        { fileObjectId: fileObject.id, filename: file.name },
        'Slack attachment processed and scanned'
      );

      return {
        safe: true,
        fileBuffer,
        fileObjectId: fileObject.id,
      };
    } catch (error) {
      logger.error(
        { error, filename: file.name },
        'Failed to process Slack attachment'
      );
      return {
        safe: false,
        error: 'Failed to process attachment',
      };
    }
  }
}

// Singleton instance
let attachmentHandlerService: AttachmentHandlerService | null = null;

export function getAttachmentHandlerService(): AttachmentHandlerService {
  if (!attachmentHandlerService) {
    attachmentHandlerService = new AttachmentHandlerService();
  }
  return attachmentHandlerService;
}
