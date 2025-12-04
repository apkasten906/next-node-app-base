import { EmailOptions, IEmailProvider, NotificationResult } from '@repo/types';
import { injectable } from 'tsyringe';

import { LoggerService } from '../../logger.service';

/**
 * Console email provider for development
 * Logs emails to console instead of sending them
 */
@injectable()
export class ConsoleEmailProvider implements IEmailProvider {
  constructor(private logger: LoggerService) {}

  async send(options: EmailOptions): Promise<NotificationResult> {
    this.logger.info('📧 Console Email Provider', {
      to: options.to,
      subject: options.subject,
      from: options.from,
      text: options.text,
      html: options.html?.substring(0, 200),
    });

    // eslint-disable-next-line no-console -- Intentional console output for development email provider
    console.log('\n=== EMAIL MESSAGE ===');
    // eslint-disable-next-line no-console -- Intentional console output for development email provider
    console.log('To:', options.to);
    // eslint-disable-next-line no-console -- Intentional console output for development email provider
    console.log('From:', options.from || 'noreply@example.com');
    // eslint-disable-next-line no-console -- Intentional console output for development email provider
    console.log('Subject:', options.subject);
    // eslint-disable-next-line no-console -- Intentional console output for development email provider
    if (options.cc) console.log('CC:', options.cc);
    // eslint-disable-next-line no-console -- Intentional console output for development email provider
    if (options.bcc) console.log('BCC:', options.bcc);
    // eslint-disable-next-line no-console -- Intentional console output for development email provider
    console.log('\nText:', options.text || 'No text content');
    // eslint-disable-next-line no-console -- Intentional console output for development email provider
    if (options.html) console.log('\nHTML:', options.html.substring(0, 200) + '...');
    // eslint-disable-next-line no-console -- Intentional console output for development email provider
    if (options.attachments) console.log('\nAttachments:', options.attachments.length);
    // eslint-disable-next-line no-console -- Intentional console output for development email provider
    console.log('===================\n');

    return {
      success: true,
      messageId: `console-email-${Date.now()}`,
    };
  }

  async healthCheck(): Promise<boolean> {
    return true;
  }
}
