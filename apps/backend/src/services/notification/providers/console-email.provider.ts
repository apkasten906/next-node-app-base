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

    console.log('\n=== EMAIL MESSAGE ===');
    console.log('To:', options.to);
    console.log('From:', options.from || 'noreply@example.com');
    console.log('Subject:', options.subject);
    if (options.cc) console.log('CC:', options.cc);
    if (options.bcc) console.log('BCC:', options.bcc);
    console.log('\nText:', options.text || 'No text content');
    if (options.html) console.log('\nHTML:', options.html.substring(0, 200) + '...');
    if (options.attachments) console.log('\nAttachments:', options.attachments.length);
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
