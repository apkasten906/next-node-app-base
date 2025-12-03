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

    console.log('\n=== PUSH NOTIFICATION ===');
    console.log('User ID:', options.userId);
    console.log('Title:', options.title);
    console.log('Body:', options.body);
    if (options.data) console.log('Data:', JSON.stringify(options.data, null, 2));
    if (options.badge) console.log('Badge:', options.badge);
    if (options.sound) console.log('Sound:', options.sound);
    if (options.icon) console.log('Icon:', options.icon);
    if (options.imageUrl) console.log('Image:', options.imageUrl);
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
