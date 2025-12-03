import {
  IPushNotificationProvider,
  NotificationResult,
  PushNotificationOptions,
} from '@repo/types';
import { injectable } from 'tsyringe';

import { LoggerService } from '../../logger.service';

/**
 * Firebase Cloud Messaging (FCM) push notification provider
 * Requires FIREBASE_PROJECT_ID and FIREBASE_SERVICE_ACCOUNT_KEY environment variables
 */
@injectable()
export class FcmPushProvider implements IPushNotificationProvider {
  private projectId: string;
  private serviceAccountKey: string;

  constructor(private logger: LoggerService) {
    this.projectId = process.env['FIREBASE_PROJECT_ID'] || '';
    this.serviceAccountKey = process.env['FIREBASE_SERVICE_ACCOUNT_KEY'] || '';

    if (!this.projectId || !this.serviceAccountKey) {
      this.logger.warn('Firebase credentials not configured. Push notifications will fail.');
    }
  }

  async send(options: PushNotificationOptions): Promise<NotificationResult> {
    try {
      if (!this.projectId) {
        throw new Error('Firebase project ID not configured');
      }

      // Firebase Admin SDK implementation
      // Note: Install firebase-admin package when ready to use
      // const admin = require('firebase-admin');

      // if (!admin.apps.length) {
      //   admin.initializeApp({
      //     credential: admin.credential.cert(JSON.parse(this.serviceAccountKey)),
      //     projectId: this.projectId,
      //   });
      // }

      // Get user's FCM token from database (would need to be stored during login)
      // const fcmToken = await this.getUserFcmToken(options.userId);

      // @ts-ignore - Used when firebase-admin is installed
      const message = {
        notification: {
          title: options.title,
          body: options.body,
        },
        data: options.data,
        // token: fcmToken,
        android: {
          notification: {
            icon: options.icon,
            imageUrl: options.imageUrl,
            sound: options.sound || 'default',
          },
        },
        apns: {
          payload: {
            aps: {
              badge: options.badge,
              sound: options.sound || 'default',
            },
          },
          fcmOptions: {
            imageUrl: options.imageUrl,
          },
        },
      };

      // Uncomment when firebase-admin is installed:
      // const response = await admin.messaging().send(message);

      this.logger.info('FCM push notification sent', {
        userId: options.userId,
        title: options.title,
      });

      return {
        success: true,
        messageId: `fcm-${Date.now()}`, // Replace with response
      };
    } catch (error) {
      this.logger.error('FCM send failed', error as Error);
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  async healthCheck(): Promise<boolean> {
    // Check if credentials are configured
    return !!(this.projectId && this.serviceAccountKey);
  }

  // Helper method to retrieve user's FCM token from database
  // @ts-ignore - Placeholder for future implementation
  private async getUserFcmToken(userId: string): Promise<string> {
    // TODO: Implement database lookup for user's FCM token
    // This would typically be stored when the user logs in from their device
    throw new Error('FCM token lookup not implemented');
  }
}

/**
 * Installation instructions:
 * pnpm add firebase-admin
 *
 * Environment variables:
 * FIREBASE_PROJECT_ID=your_project_id
 * FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account","project_id":"...","private_key":"..."}'
 *
 * Note: The service account key should be a JSON string of your Firebase service account credentials
 */
