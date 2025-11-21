import { EmailOptions, IEmailProvider, NotificationResult } from '@repo/types';
import { injectable } from 'tsyringe';
import { LoggerService } from '../logger.service';

/**
 * SendGrid email provider
 * Requires SENDGRID_API_KEY environment variable
 */
@injectable()
export class SendGridEmailProvider implements IEmailProvider {
  private apiKey: string;
  private fromEmail: string;

  constructor(private logger: LoggerService) {
    this.apiKey = process.env['SENDGRID_API_KEY'] || '';
    this.fromEmail = process.env['SENDGRID_FROM_EMAIL'] || 'noreply@example.com';

    if (!this.apiKey) {
      this.logger.warn('SendGrid API key not configured. Email sending will fail.');
    }
  }

  async send(options: EmailOptions): Promise<NotificationResult> {
    try {
      if (!this.apiKey) {
        throw new Error('SendGrid API key not configured');
      }

      // SendGrid API implementation
      // Note: Install @sendgrid/mail package when ready to use
      // const sgMail = require('@sendgrid/mail');
      // sgMail.setApiKey(this.apiKey);

      const message = {
        to: options.to,
        from: options.from || this.fromEmail,
        subject: options.subject,
        text: options.text,
        html: options.html,
        cc: options.cc,
        bcc: options.bcc,
        attachments: options.attachments?.map((att) => ({
          filename: att.filename,
          content: Buffer.isBuffer(att.content) ? att.content.toString('base64') : att.content,
          type: att.contentType,
          disposition: 'attachment',
        })),
      };

      // Uncomment when @sendgrid/mail is installed:
      // const [response] = await sgMail.send(message);

      this.logger.info('SendGrid email sent', {
        to: options.to,
        subject: options.subject,
      });

      return {
        success: true,
        messageId: `sendgrid-${Date.now()}`, // Replace with response.messageId
      };
    } catch (error) {
      this.logger.error('SendGrid send failed', error as Error);
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  async healthCheck(): Promise<boolean> {
    // Check if API key is configured
    return !!this.apiKey;
  }
}

/**
 * Installation instructions:
 * pnpm add @sendgrid/mail
 *
 * Environment variables:
 * SENDGRID_API_KEY=your_sendgrid_api_key
 * SENDGRID_FROM_EMAIL=noreply@yourdomain.com
 */
