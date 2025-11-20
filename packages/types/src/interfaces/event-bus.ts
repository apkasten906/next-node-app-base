/**
 * Event bus interface for pub/sub messaging
 */
export interface IEventBus {
  /**
   * Publish event to subscribers
   */
  publish(event: DomainEvent): Promise<void>;

  /**
   * Subscribe to event type
   */
  subscribe(eventType: string, handler: EventHandler): void;

  /**
   * Unsubscribe from event type
   */
  unsubscribe(eventType: string, handler: EventHandler): void;

  /**
   * Publish multiple events
   */
  publishBatch(events: DomainEvent[]): Promise<void>;

  /**
   * Close all subscriptions
   */
  close(): Promise<void>;
}

export interface DomainEvent {
  id: string;
  type: string;
  aggregateId: string;
  aggregateType: string;
  payload: Record<string, any>;
  metadata: EventMetadata;
  timestamp: Date;
}

export interface EventMetadata {
  userId?: string;
  correlationId?: string;
  causationId?: string;
  version: number;
}

export type EventHandler = (event: DomainEvent) => Promise<void> | void;

export interface EventSubscription {
  eventType: string;
  handler: EventHandler;
  id: string;
}

export enum EventBusProvider {
  REDIS = 'redis',
  RABBITMQ = 'rabbitmq',
  KAFKA = 'kafka',
  IN_MEMORY = 'in-memory',
}
