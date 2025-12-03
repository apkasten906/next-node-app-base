import { IEmailProvider, IPushNotificationProvider, ISmsProvider } from '@repo/types';
import { container } from 'tsyringe';

import { ConsoleEmailProvider } from './providers/console-email.provider';
import { ConsolePushProvider } from './providers/console-push.provider';
import { ConsoleSmsProvider } from './providers/console-sms.provider';
import { FcmPushProvider } from './providers/fcm-push.provider';
import { SendGridEmailProvider } from './providers/sendgrid-email.provider';
import { TwilioSmsProvider } from './providers/twilio-sms.provider';

/**
 * Provider configuration based on environment
 */
export class NotificationProviderFactory {
  /**
   * Register notification providers based on environment configuration
   */
  static registerProviders(): void {
    const emailProvider = process.env['EMAIL_PROVIDER'] || 'console';
    const smsProvider = process.env['SMS_PROVIDER'] || 'console';
    const pushProvider = process.env['PUSH_PROVIDER'] || 'console';

    // Register email provider
    switch (emailProvider.toLowerCase()) {
      case 'sendgrid':
        container.registerSingleton<IEmailProvider>('IEmailProvider', SendGridEmailProvider);
        break;
      case 'console':
      default:
        container.registerSingleton<IEmailProvider>('IEmailProvider', ConsoleEmailProvider);
        break;
    }

    // Register SMS provider
    switch (smsProvider.toLowerCase()) {
      case 'twilio':
        container.registerSingleton<ISmsProvider>('ISmsProvider', TwilioSmsProvider);
        break;
      case 'console':
      default:
        container.registerSingleton<ISmsProvider>('ISmsProvider', ConsoleSmsProvider);
        break;
    }

    // Register push notification provider
    switch (pushProvider.toLowerCase()) {
      case 'fcm':
      case 'firebase':
        container.registerSingleton<IPushNotificationProvider>(
          'IPushNotificationProvider',
          FcmPushProvider
        );
        break;
      case 'console':
      default:
        container.registerSingleton<IPushNotificationProvider>(
          'IPushNotificationProvider',
          ConsolePushProvider
        );
        break;
    }

    console.log(`📧 Email provider: ${emailProvider}`);
    console.log(`📱 SMS provider: ${smsProvider}`);
    console.log(`🔔 Push notification provider: ${pushProvider}`);
  }
}

/**
 * Helper function to register notification providers
 */
export function registerNotificationProviders(): void {
  NotificationProviderFactory.registerProviders();
}

/**
 * Environment variables for provider selection:
 *
 * EMAIL_PROVIDER=console|sendgrid
 * SMS_PROVIDER=console|twilio
 * PUSH_PROVIDER=console|fcm|firebase
 *
 * Provider-specific credentials:
 *
 * SendGrid:
 * - SENDGRID_API_KEY
 * - SENDGRID_FROM_EMAIL
 *
 * Twilio:
 * - TWILIO_ACCOUNT_SID
 * - TWILIO_AUTH_TOKEN
 * - TWILIO_PHONE_NUMBER
 *
 * Firebase Cloud Messaging:
 * - FIREBASE_PROJECT_ID
 * - FIREBASE_SERVICE_ACCOUNT_KEY
 */
