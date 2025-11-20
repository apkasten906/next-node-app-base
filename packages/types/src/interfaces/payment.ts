/**
 * Payment service interface for payment processing abstraction
 */
export interface IPaymentService {
  /**
   * Create payment intent
   */
  createPaymentIntent(params: PaymentIntentParams): Promise<PaymentIntent>;

  /**
   * Process payment
   */
  processPayment(paymentId: string, paymentMethod: PaymentMethod): Promise<PaymentResult>;

  /**
   * Refund payment
   */
  refund(paymentId: string, amount?: number, reason?: string): Promise<RefundResult>;

  /**
   * Get payment status
   */
  getPaymentStatus(paymentId: string): Promise<PaymentStatus>;

  /**
   * Create customer
   */
  createCustomer(params: CustomerParams): Promise<Customer>;

  /**
   * Attach payment method to customer
   */
  attachPaymentMethod(customerId: string, paymentMethodId: string): Promise<void>;

  /**
   * Get customer payment methods
   */
  getPaymentMethods(customerId: string): Promise<PaymentMethod[]>;

  /**
   * Create subscription
   */
  createSubscription(params: SubscriptionParams): Promise<Subscription>;

  /**
   * Cancel subscription
   */
  cancelSubscription(subscriptionId: string): Promise<void>;
}

export interface PaymentIntentParams {
  amount: number;
  currency: string;
  customerId?: string;
  description?: string;
  metadata?: Record<string, string>;
}

export interface PaymentIntent {
  id: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  clientSecret: string;
}

export interface PaymentMethod {
  id: string;
  type: 'card' | 'bank_account' | 'wallet';
  details: Record<string, any>;
  isDefault: boolean;
}

export interface PaymentResult {
  success: boolean;
  paymentId: string;
  status: PaymentStatus;
  error?: string;
}

export interface RefundResult {
  success: boolean;
  refundId: string;
  amount: number;
  status: 'pending' | 'succeeded' | 'failed';
  error?: string;
}

export enum PaymentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  SUCCEEDED = 'succeeded',
  FAILED = 'failed',
  CANCELED = 'canceled',
}

export interface CustomerParams {
  email: string;
  name?: string;
  phone?: string;
  metadata?: Record<string, string>;
}

export interface Customer {
  id: string;
  email: string;
  name?: string;
  phone?: string;
  defaultPaymentMethod?: string;
}

export interface SubscriptionParams {
  customerId: string;
  priceId: string;
  paymentMethodId?: string;
  trialPeriodDays?: number;
}

export interface Subscription {
  id: string;
  customerId: string;
  status: SubscriptionStatus;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
}

export enum SubscriptionStatus {
  ACTIVE = 'active',
  PAST_DUE = 'past_due',
  CANCELED = 'canceled',
  UNPAID = 'unpaid',
  TRIALING = 'trialing',
}

export enum PaymentProvider {
  STRIPE = 'stripe',
  PAYPAL = 'paypal',
  SQUARE = 'square',
}
