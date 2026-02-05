import { AsyncLocalStorage } from 'node:async_hooks';

type RequestContextStore = {
  correlationId?: string;
};

const storage = new AsyncLocalStorage<RequestContextStore>();

export const requestContext = {
  run<T>(store: RequestContextStore, fn: () => T): T {
    return storage.run(store, fn);
  },

  getCorrelationId(): string | undefined {
    return storage.getStore()?.correlationId;
  },
};
