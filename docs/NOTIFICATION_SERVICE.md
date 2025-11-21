# Notification Service

The notification service provides a unified interface for sending emails, SMS messages, and push notifications with support for multiple providers through dependency injection.

## Features

- **Multi-Provider Support**: Easily switch between providers (SendGrid, Twilio, FCM) via environment variables
- **Development Mode**: Console providers for local development and testing
- **Type Safety**: Full TypeScript support with interfaces
- **Dependency Injection**: Clean architecture with swappable providers
- **Bulk Operations**: Send bulk emails efficiently
- **Health Checks**: Monitor provider availability
- **Comprehensive Logging**: All operations logged via Winston

## Architecture

```
NotificationService (Main Service)
├── IEmailProvider (Interface)
│   ├── ConsoleEmailProvider (Development)
│   └── SendGridEmailProvider (Production)
├── ISmsProvider (Interface)
│   ├── ConsoleSmsProvider (Development)
│   └── TwilioSmsProvider (Production)
└── IPushNotificationProvider (Interface)
    ├── ConsolePushProvider (Development)
    └── FcmPushProvider (Production)
```

## Configuration

### Environment Variables

```env
# Provider Selection
EMAIL_PROVIDER=console        # console | sendgrid
SMS_PROVIDER=console          # console | twilio
PUSH_PROVIDER=console         # console | fcm | firebase

# SendGrid Configuration
SENDGRID_API_KEY=your_api_key
SENDGRID_FROM_EMAIL=noreply@yourdomain.com

# Twilio Configuration
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890

# Firebase Cloud Messaging Configuration
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account",...}'
```

## Usage

### Email

```typescript
import { container } from 'tsyringe';
import { NotificationService } from './services/notification/notification.service';

const notificationService = container.resolve(NotificationService);

// Send email
await notificationService.sendEmail({
  to: 'user@example.com',
  subject: 'Welcome!',
  text: 'Welcome to our platform',
  html: '<h1>Welcome to our platform</h1>',
});

// Send email with attachments
await notificationService.sendEmail({
  to: ['user1@example.com', 'user2@example.com'],
  subject: 'Monthly Report',
  html: '<p>Please find the attached report</p>',
  attachments: [
    {
      filename: 'report.pdf',
      content: pdfBuffer,
      contentType: 'application/pdf',
    },
  ],
});

// Bulk email
await notificationService.sendBulkEmail([
  {
    to: 'user1@example.com',
    subject: 'Welcome!',
    text: 'Welcome message',
  },
  {
    to: 'user2@example.com',
    subject: 'Welcome!',
    text: 'Welcome message',
  },
]);
```

### SMS

```typescript
// Send SMS
await notificationService.sendSms({
  to: '+1234567890',
  body: 'Your verification code is: 123456',
});
```

### Push Notifications

```typescript
// Send push notification
await notificationService.sendPushNotification({
  userId: 'user-123',
  title: 'New Message',
  body: 'You have a new message from John',
  data: {
    messageId: 'msg-456',
    senderId: 'user-789',
  },
  badge: 1,
  sound: 'default',
});
```

### Health Check

```typescript
const isHealthy = await notificationService.healthCheck();
console.log(`Notification service healthy: ${isHealthy}`);
```

## Providers

### Email Providers

#### Console Email Provider (Development)

- Logs emails to console instead of sending
- No configuration required
- Useful for development and testing

#### SendGrid Email Provider (Production)

- Professional email delivery service
- Requires SendGrid API key
- Supports attachments, HTML emails, CC/BCC
- Installation: `pnpm add @sendgrid/mail`

### SMS Providers

#### Console SMS Provider (Development)

- Logs SMS to console instead of sending
- No configuration required

#### Twilio SMS Provider (Production)

- Industry-standard SMS delivery
- Requires Twilio account credentials
- Installation: `pnpm add twilio`

### Push Notification Providers

#### Console Push Provider (Development)

- Logs push notifications to console
- No configuration required

#### Firebase Cloud Messaging Provider (Production)

- Google's push notification service
- Supports iOS and Android
- Requires Firebase project and service account
- Installation: `pnpm add firebase-admin`

## Adding a New Provider

To add a new provider (e.g., AWS SES for email):

1. **Create the provider class**:

```typescript
// services/notification/providers/ses-email.provider.ts
import { injectable } from 'tsyringe';
import { IEmailProvider, EmailOptions, NotificationResult } from '@repo/types';

@injectable()
export class SesEmailProvider implements IEmailProvider {
  async send(options: EmailOptions): Promise<NotificationResult> {
    // AWS SES implementation
  }

  async healthCheck(): Promise<boolean> {
    // Health check implementation
  }
}
```

2. **Register in factory**:

```typescript
// services/notification/notification-provider.factory.ts
case 'ses':
  container.registerSingleton<IEmailProvider>('IEmailProvider', SesEmailProvider);
  break;
```

3. **Update environment configuration**:

```env
EMAIL_PROVIDER=ses
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
AWS_REGION=us-east-1
```

## Error Handling

All notification methods return a `NotificationResult`:

```typescript
interface NotificationResult {
  success: boolean;
  messageId?: string;
  error?: string;
}
```

Example error handling:

```typescript
const result = await notificationService.sendEmail({
  to: 'user@example.com',
  subject: 'Test',
  text: 'Test message',
});

if (result.success) {
  console.log(`Email sent: ${result.messageId}`);
} else {
  console.error(`Email failed: ${result.error}`);
}
```

## Testing

### Unit Tests

```typescript
import { container } from 'tsyringe';
import { NotificationService } from './notification.service';
import { ConsoleEmailProvider } from './providers/console-email.provider';

describe('NotificationService', () => {
  let service: NotificationService;

  beforeEach(() => {
    container.clearInstances();
    container.registerSingleton('IEmailProvider', ConsoleEmailProvider);
    service = container.resolve(NotificationService);
  });

  it('should send email', async () => {
    const result = await service.sendEmail({
      to: 'test@example.com',
      subject: 'Test',
      text: 'Test message',
    });

    expect(result.success).toBe(true);
  });
});
```

## Production Deployment

### SendGrid Setup

1. Create SendGrid account at https://sendgrid.com
2. Generate API key in Settings > API Keys
3. Verify sender email in Settings > Sender Authentication
4. Set environment variables:
   ```env
   EMAIL_PROVIDER=sendgrid
   SENDGRID_API_KEY=SG.xxxxx
   SENDGRID_FROM_EMAIL=noreply@yourdomain.com
   ```

### Twilio Setup

1. Create Twilio account at https://www.twilio.com
2. Get Account SID and Auth Token from Console
3. Purchase phone number or use trial number
4. Set environment variables:
   ```env
   SMS_PROVIDER=twilio
   TWILIO_ACCOUNT_SID=ACxxxxx
   TWILIO_AUTH_TOKEN=xxxxx
   TWILIO_PHONE_NUMBER=+1234567890
   ```

### Firebase Cloud Messaging Setup

1. Create Firebase project at https://console.firebase.google.com
2. Generate service account key in Project Settings > Service Accounts
3. Download JSON key file
4. Set environment variables:
   ```env
   PUSH_PROVIDER=fcm
   FIREBASE_PROJECT_ID=your-project-id
   FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account",...}'
   ```

## Best Practices

1. **Use Environment Variables**: Never hardcode API keys
2. **Monitor Health**: Regularly check provider health
3. **Handle Failures**: Always check notification results
4. **Rate Limiting**: Be aware of provider rate limits
5. **Logging**: All operations are logged for debugging
6. **Testing**: Use console providers in development
7. **Bulk Operations**: Use bulk methods for efficiency
8. **Retry Logic**: Implement retry for failed notifications (coming soon)

## Future Enhancements

- [ ] Retry logic with exponential backoff
- [ ] Queue-based delivery for high volume
- [ ] Template support for emails
- [ ] Delivery tracking and analytics
- [ ] Rate limiting per provider
- [ ] Message scheduling
- [ ] A/B testing for notifications
- [ ] Notification preferences management
- [ ] Multi-language support

## API Reference

See `packages/types/src/notification.types.ts` for complete type definitions.

---

For more information, see the individual provider implementations in `services/notification/providers/`.
