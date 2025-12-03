import { ISmsProvider, NotificationResult, SmsOptions } from '@repo/types';
import { injectable } from 'tsyringe';

import { LoggerService } from '../../logger.service';

/**
 * Console SMS provider for development
 * Logs SMS messages to console instead of sending them
 */
@injectable()
export class ConsoleSmsProvider implements ISmsProvider {
  constructor(private logger: LoggerService) {}

  async send(options: SmsOptions): Promise<NotificationResult> {
    this.logger.info('📱 Console SMS Provider', {
      to: options.to,
      from: options.from,
      body: options.body,
    });

    console.log('\n=== SMS MESSAGE ===');
    console.log('To:', options.to);
    console.log('From:', options.from || '+1234567890');
    console.log('Body:', options.body);
    console.log('==================\n');

    return {
      success: true,
      messageId: `console-sms-${Date.now()}`,
    };
  }

  async healthCheck(): Promise<boolean> {
    return true;
  }
}
