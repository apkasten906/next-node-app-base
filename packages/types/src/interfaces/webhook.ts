/**
 * Webhook service interface for webhook management
 */
export interface IWebhookService {
  /**
   * Register new webhook
   */
  register(params: WebhookRegistrationParams): Promise<WebhookRegistration>;

  /**
   * Unregister webhook
   */
  unregister(webhookId: string): Promise<void>;

  /**
   * Update webhook configuration
   */
  update(webhookId: string, params: Partial<WebhookRegistrationParams>): Promise<void>;

  /**
   * Deliver webhook event
   */
  deliver(webhookId: string, event: WebhookEvent): Promise<DeliveryResult>;

  /**
   * Verify webhook signature
   */
  verifySignature(payload: string, signature: string, secret: string): boolean;

  /**
   * Retry failed delivery
   */
  retry(deliveryId: string): Promise<DeliveryResult>;

  /**
   * Get delivery status
   */
  getDeliveryStatus(deliveryId: string): Promise<DeliveryStatus>;

  /**
   * Get webhook deliveries
   */
  getDeliveries(webhookId: string, options?: DeliveryQueryOptions): Promise<DeliveryStatus[]>;

  /**
   * List registered webhooks
   */
  listWebhooks(userId?: string): Promise<WebhookRegistration[]>;
}

export interface WebhookRegistrationParams {
  url: string;
  events: string[];
  secret: string;
  description?: string;
  active?: boolean;
  metadata?: Record<string, string>;
}

export interface WebhookRegistration {
  id: string;
  url: string;
  events: string[];
  secret: string;
  description?: string;
  active: boolean;
  metadata?: Record<string, string>;
  createdAt: Date;
  updatedAt: Date;
}

export interface WebhookEvent {
  type: string;
  payload: Record<string, any>;
  timestamp: Date;
  id: string;
}

export interface DeliveryResult {
  success: boolean;
  deliveryId: string;
  statusCode?: number;
  responseTime?: number;
  error?: string;
  attempt: number;
}

export interface DeliveryStatus {
  id: string;
  webhookId: string;
  event: WebhookEvent;
  status: 'pending' | 'succeeded' | 'failed' | 'retrying';
  attempts: DeliveryAttempt[];
  nextRetryAt?: Date;
  createdAt: Date;
  completedAt?: Date;
}

export interface DeliveryAttempt {
  attempt: number;
  statusCode?: number;
  responseTime?: number;
  error?: string;
  timestamp: Date;
}

export interface DeliveryQueryOptions {
  status?: 'pending' | 'succeeded' | 'failed' | 'retrying';
  eventType?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

export interface WebhookSignatureConfig {
  algorithm: 'sha256' | 'sha512';
  headerName: string;
  encoding: 'hex' | 'base64';
}
