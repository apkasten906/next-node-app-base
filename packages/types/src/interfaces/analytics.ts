/**
 * Analytics service interface for user tracking and analytics
 */
export interface IAnalyticsService {
  /**
   * Track event
   */
  track(event: string, properties?: Record<string, any>, userId?: string): Promise<void>;

  /**
   * Identify user
   */
  identify(userId: string, traits?: Record<string, any>): Promise<void>;

  /**
   * Track page view
   */
  page(name: string, properties?: Record<string, any>, userId?: string): Promise<void>;

  /**
   * Track screen view (mobile)
   */
  screen(name: string, properties?: Record<string, any>, userId?: string): Promise<void>;

  /**
   * Create user group/account
   */
  group(groupId: string, traits?: Record<string, any>, userId?: string): Promise<void>;

  /**
   * Create alias for user
   */
  alias(userId: string, previousId: string): Promise<void>;

  /**
   * Flush queued events
   */
  flush(): Promise<void>;
}

export interface TrackEvent {
  event: string;
  properties?: Record<string, any>;
  userId?: string;
  anonymousId?: string;
  timestamp?: Date;
  context?: EventContext;
}

export interface EventContext {
  ip?: string;
  userAgent?: string;
  locale?: string;
  timezone?: string;
  page?: {
    path: string;
    referrer?: string;
    search?: string;
    title?: string;
    url: string;
  };
}

export interface UserTraits {
  email?: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  avatar?: string;
  createdAt?: Date;
  [key: string]: any;
}

export interface GroupTraits {
  name?: string;
  plan?: string;
  employees?: number;
  industry?: string;
  [key: string]: any;
}

export enum AnalyticsProvider {
  MIXPANEL = 'mixpanel',
  SEGMENT = 'segment',
  GOOGLE_ANALYTICS = 'google_analytics',
  AMPLITUDE = 'amplitude',
}
