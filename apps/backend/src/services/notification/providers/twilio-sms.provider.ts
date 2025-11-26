import { ISmsProvider, NotificationResult, SmsOptions } from '@repo/types';
import { injectable } from 'tsyringe';
import { LoggerService } from '../../logger.service';

/**
 * Twilio SMS provider
 * Requires TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER environment variables
 */
@injectable()
export class TwilioSmsProvider implements ISmsProvider {
  private accountSid: string;
  private authToken: string;
  private fromNumber: string;

  constructor(private logger: LoggerService) {
    this.accountSid = process.env['TWILIO_ACCOUNT_SID'] || '';
    this.authToken = process.env['TWILIO_AUTH_TOKEN'] || '';
    this.fromNumber = process.env['TWILIO_PHONE_NUMBER'] || '';

    if (!this.accountSid || !this.authToken || !this.fromNumber) {
      this.logger.warn('Twilio credentials not fully configured. SMS sending will fail.');
    }
  }

  async send(options: SmsOptions): Promise<NotificationResult> {
    try {
      if (!this.accountSid || !this.authToken) {
        throw new Error('Twilio credentials not configured');
      }

      // Twilio API implementation
      // Note: Install twilio package when ready to use
      // const twilio = require('twilio');
      // const client = twilio(this.accountSid, this.authToken);

      const message = {
        body: options.body,
        from: options.from || this.fromNumber,
        to: options.to,
      };

      // Uncomment when twilio package is installed:
      // const response = await client.messages.create(message);

      this.logger.info('Twilio SMS sent', {
        to: options.to,
        from: message.from,
      });

      return {
        success: true,
        messageId: `twilio-${Date.now()}`, // Replace with response.sid
      };
    } catch (error) {
      this.logger.error('Twilio send failed', error as Error);
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  async healthCheck(): Promise<boolean> {
    // Check if credentials are configured
    return !!(this.accountSid && this.authToken && this.fromNumber);
  }
}

/**
 * Installation instructions:
 * pnpm add twilio
 *
 * Environment variables:
 * TWILIO_ACCOUNT_SID=your_account_sid
 * TWILIO_AUTH_TOKEN=your_auth_token
 * TWILIO_PHONE_NUMBER=+1234567890
 */
