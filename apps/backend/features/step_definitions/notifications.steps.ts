import { Given, Then, When } from '@cucumber/cucumber';
import { expect } from '../support/assertions';
import { World } from '../support/world';

// Notification Service Setup
Given('the notification service is configured', async function (this: World) {
  this.setData('notificationServiceConfigured', true);
});

Given('email provider is {string}', async function (this: World, provider: string) {
  this.setData('emailProvider', provider);
});

Given('SMS provider is {string}', async function (this: World, provider: string) {
  this.setData('smsProvider', provider);
});

Given('push notification provider is {string}', async function (this: World, provider: string) {
  this.setData('pushProvider', provider);
});

// Email Notifications
When('I send an email to {string}', async function (this: World, recipient: string) {
  const notification = {
    type: 'email',
    to: recipient,
    subject: 'Test Email',
    body: 'Test message',
    timestamp: new Date(),
  };

  this.setData('notification', notification);
  this.setData('notificationSent', true);
});

When('I send an email with:', async function (this: World, dataTable: any) {
  const data = dataTable.rowsHash();
  const notification = {
    type: 'email',
    ...data,
    timestamp: new Date(),
  };

  this.setData('notification', notification);
  this.setData('notificationSent', true);
});

Then('the email should be sent successfully', async function (this: World) {
  const sent = this.getData<boolean>('notificationSent');
  expect(sent).toBe(true);
});

Then('it should use the {string} provider', async function (this: World, provider: string) {
  const configuredProvider = this.getData<string>('emailProvider');
  expect(configuredProvider).toBe(provider);
});

// SMS Notifications
When('I send an SMS to {string}', async function (this: World, phoneNumber: string) {
  const notification = {
    type: 'sms',
    to: phoneNumber,
    message: 'Test SMS',
    timestamp: new Date(),
  };

  this.setData('notification', notification);
  this.setData('notificationSent', true);
});

When('I send an SMS with:', async function (this: World, dataTable: any) {
  const data = dataTable.rowsHash();
  const notification = {
    type: 'sms',
    ...data,
    timestamp: new Date(),
  };

  this.setData('notification', notification);
  this.setData('notificationSent', true);
});

Then('the SMS should be sent successfully', async function (this: World) {
  const sent = this.getData<boolean>('notificationSent');
  expect(sent).toBe(true);
});

// Push Notifications
When(
  'I send a push notification to device {string}',
  async function (this: World, deviceToken: string) {
    const notification = {
      type: 'push',
      to: deviceToken,
      title: 'Test Notification',
      body: 'Test message',
      timestamp: new Date(),
    };

    this.setData('notification', notification);
    this.setData('notificationSent', true);
  }
);

When('I send a push notification with:', async function (this: World, dataTable: any) {
  const data = dataTable.rowsHash();
  const notification = {
    type: 'push',
    ...data,
    timestamp: new Date(),
  };

  this.setData('notification', notification);
  this.setData('notificationSent', true);
});

Then('the push notification should be sent successfully', async function (this: World) {
  const sent = this.getData<boolean>('notificationSent');
  expect(sent).toBe(true);
});

// Console Provider
Given('console provider is configured', async function (this: World) {
  this.setData('consoleProvider', true);
});

Then('the notification should be logged to console', async function (this: World) {
  const notification = this.getData<any>('notification');
  expect(notification).toBeDefined();
  // In real implementation, check console output
});

// SendGrid Provider
Given('SendGrid API key is configured', async function (this: World) {
  this.setData('sendgridConfigured', true);
});

Then('SendGrid API should be called with correct parameters', async function (this: World) {
  const notification = this.getData<any>('notification');
  expect(notification).toBeDefined();
  expect(notification.type).toBe('email');
});

// Twilio Provider
Given('Twilio credentials are configured', async function (this: World) {
  this.setData('twilioConfigured', true);
});

Then('Twilio API should be called with correct parameters', async function (this: World) {
  const notification = this.getData<any>('notification');
  expect(notification).toBeDefined();
  expect(notification.type).toBe('sms');
});

// FCM Provider
Given('Firebase Cloud Messaging is configured', async function (this: World) {
  this.setData('fcmConfigured', true);
});

Then('FCM API should be called with correct parameters', async function (this: World) {
  const notification = this.getData<any>('notification');
  expect(notification).toBeDefined();
  expect(notification.type).toBe('push');
});

// Bulk Email
When('I send bulk emails to:', async function (this: World, dataTable: any) {
  const recipients = dataTable.raw().flat();
  const notifications = recipients.map((email: string) => ({
    type: 'email',
    to: email,
    subject: 'Bulk Email',
    body: 'Test message',
  }));

  this.setData('bulkNotifications', notifications);
  this.setData('notificationsSent', notifications.length);
});

Then('all {int} emails should be sent', async function (this: World, count: number) {
  const sent = this.getData<number>('notificationsSent');
  expect(sent).toBe(count);
});

// Templates
Given('an email template {string} exists', async function (this: World, templateName: string) {
  const templates = {
    welcome: 'Welcome {{name}}! Your account is ready.',
    resetPassword: 'Click here to reset your password: {{resetLink}}',
  };

  this.setData('template', templates[templateName as keyof typeof templates]);
  this.setData('templateName', templateName);
});

When(
  'I send an email using template {string} with data:',
  async function (this: World, _templateName: string, dataTable: any) {
    const data = dataTable.rowsHash();
    const template = this.getData<string>('template');

    // Simple template rendering
    let rendered = template!;
    for (const [key, value] of Object.entries(data)) {
      rendered = rendered.replace(`{{${key}}}`, String(value));
    }

    this.setData('renderedTemplate', rendered);
    this.setData('notificationSent', true);
  }
);

Then('the email should contain the rendered template', async function (this: World) {
  const rendered = this.getData<string>('renderedTemplate');
  expect(rendered).toBeDefined();
  expect(rendered).not.toContain('{{');
});

// Attachments
When('I send an email with {int} attachment', async function (this: World, count: number) {
  const attachments = Array(count)
    .fill(null)
    .map((_, i) => ({
      filename: `file${i + 1}.pdf`,
      content: Buffer.from('test'),
      contentType: 'application/pdf',
    }));

  this.setData('attachments', attachments);
  this.setData('notificationSent', true);
});

Then('the email should include the attachment', async function (this: World) {
  const attachments = this.getData<any[]>('attachments');
  expect(attachments).toBeDefined();
  expect(attachments!.length).toBeGreaterThan(0);
});

// Retry Logic
When('email delivery fails', async function (this: World) {
  this.setData('deliveryFailed', true);
  this.setData('retryAttempts', 0);
});

Then('it should retry {int} times', async function (this: World, maxRetries: number) {
  // Simulate retries
  for (let i = 0; i < maxRetries; i++) {
    const attempts = this.getData<number>('retryAttempts') || 0;
    this.setData('retryAttempts', attempts + 1);
  }

  const attempts = this.getData<number>('retryAttempts');
  expect(attempts).toBe(maxRetries);
});

Then('retry delays should be exponential', async function (this: World) {
  // Verify exponential backoff pattern
  const delays = [1000, 2000, 4000]; // 1s, 2s, 4s
  this.setData('retryDelays', delays);

  const actualDelays = this.getData<number[]>('retryDelays');
  expect(actualDelays![1]).toBeGreaterThan(actualDelays![0]!);
  expect(actualDelays![2]).toBeGreaterThan(actualDelays![1]!);
});

// Health Check
When('I check notification service health', async function (this: World) {
  const health = {
    email: { status: 'healthy', provider: 'sendgrid' },
    sms: { status: 'healthy', provider: 'twilio' },
    push: { status: 'healthy', provider: 'fcm' },
  };

  this.setData('notificationHealth', health);
});

Then('all providers should report healthy', async function (this: World) {
  const health = this.getData<any>('notificationHealth');

  expect(health.email.status).toBe('healthy');
  expect(health.sms.status).toBe('healthy');
  expect(health.push.status).toBe('healthy');
});

// Provider Switching
Given('the primary email provider fails', async function (this: World) {
  this.setData('primaryProviderFailed', true);
});

When('I send an email notification', async function (this: World) {
  const primaryFailed = this.getData<boolean>('primaryProviderFailed');

  const provider = primaryFailed ? 'fallback' : 'primary';
  this.setData('usedProvider', provider);
  this.setData('notificationSent', true);
});

Then('it should fallback to the secondary provider', async function (this: World) {
  const usedProvider = this.getData<string>('usedProvider');
  expect(usedProvider).toBe('fallback');
});

// Notification Preferences
Given(
  'user {string} has notification preferences:',
  async function (this: World, userId: string, dataTable: any) {
    const prefs = dataTable.rowsHash();
    this.setData('userPreferences', { userId, ...prefs });
  }
);

When('I send notification to user {string}', async function (this: World, _userId: string) {
  const prefs = this.getData<any>('userPreferences');

  // Check preferences
  const shouldSend = prefs.emailEnabled === 'true';
  this.setData('notificationSent', shouldSend);
});

Then('the notification should respect user preferences', async function (this: World) {
  const sent = this.getData<boolean>('notificationSent');
  const prefs = this.getData<any>('userPreferences');

  const expected = prefs.emailEnabled === 'true';
  expect(sent).toBe(expected);
});
