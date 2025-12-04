import {
  IPushNotificationProvider,
  NotificationResult,
  PushNotificationOptions,
} from '@repo/types';
import { injectable } from 'tsyringe';

import { LoggerService } from '../../logger.service';

/**
 * Console push notification provider for development
 * Logs push notifications to console instead of sending them
 */
@injectable()
export class ConsolePushProvider implements IPushNotificationProvider {
  constructor(private logger: LoggerService) {}

  async send(options: PushNotificationOptions): Promise<NotificationResult> {
    this.logger.info('🔔 Console Push Notification Provider', {
      userId: options.userId,
      title: options.title,
      body: options.body,
    });

    // eslint-disable-next-line no-console -- Intentional console output for development push notification provider
    console.log('\n=== PUSH NOTIFICATION ===');
    // eslint-disable-next-line no-console -- Intentional console output for development push notification provider
    console.log('User ID:', options.userId);
    // eslint-disable-next-line no-console -- Intentional console output for development push notification provider
    console.log('Title:', options.title);
    // eslint-disable-next-line no-console -- Intentional console output for development push notification provider
    console.log('Body:', options.body);
    // eslint-disable-next-line no-console -- Intentional console output for development push notification provider
    if (options.data) console.log('Data:', JSON.stringify(options.data, null, 2));
    // eslint-disable-next-line no-console -- Intentional console output for development push notification provider
    if (options.badge) console.log('Badge:', options.badge);
    // eslint-disable-next-line no-console -- Intentional console output for development push notification provider
    if (options.sound) console.log('Sound:', options.sound);
    // eslint-disable-next-line no-console -- Intentional console output for development push notification provider
    if (options.icon) console.log('Icon:', options.icon);
    // eslint-disable-next-line no-console -- Intentional console output for development push notification provider
    if (options.imageUrl) console.log('Image:', options.imageUrl);
    // eslint-disable-next-line no-console -- Intentional console output for development push notification provider
    console.log('========================\n');

    return {
      success: true,
      messageId: `console-push-${Date.now()}`,
    };
  }

  async healthCheck(): Promise<boolean> {
    return true;
  }
}
