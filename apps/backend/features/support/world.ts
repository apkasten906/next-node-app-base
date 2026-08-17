import { World as CucumberWorld, IWorldOptions, setWorldConstructor } from '@cucumber/cucumber';
import request from 'supertest';
import { container } from 'tsyringe';
import { App } from '../../src/index';
import { enforceCleanupErrors } from './cleanup-policy';

export interface CustomWorld extends CucumberWorld {
  app?: App;
  request?: ReturnType<typeof request>;
  response?: request.Response;
  testData?: Record<string, any>;
  error?: Error;
  addCleanup(callback: () => void | Promise<void>): void;
}

export class World extends CucumberWorld implements CustomWorld {
  app?: App;
  request?: ReturnType<typeof request>;
  response?: request.Response;
  testData: Record<string, any> = {};
  error?: Error;
  private cleanupCallbacks: Array<() => void | Promise<void>> = [];

  constructor(options: IWorldOptions) {
    super(options);
  }

  /**
   * Initialize test application instance
   */
  async initializeApp(): Promise<void> {
    this.app = new App();
    this.request = request(this.app.app);
  }

  /**
   * Cleanup after scenario
   */
  async cleanup(): Promise<void> {
    const cleanupErrors: unknown[] = [];

    try {
      if (this.app) await this.app.shutdown();
    } catch (error) {
      cleanupErrors.push(error);
    }

    for (const callback of this.cleanupCallbacks.reverse()) {
      try {
        await callback();
      } catch (error) {
        cleanupErrors.push(error);
      }
    }

    this.cleanupCallbacks = [];
    this.testData = {};
    this.error = undefined;
    enforceCleanupErrors(cleanupErrors, false, () => undefined);
  }

  addCleanup(callback: () => void | Promise<void>): void {
    this.cleanupCallbacks.push(callback);
  }

  /**
   * Store data for use across steps
   */
  setData(key: string, value: any): void {
    this.testData[key] = value;
  }

  /**
   * Retrieve stored data
   */
  getData<T = any>(key: string): T | undefined {
    return this.testData[key] as T;
  }

  /**
   * Get DI container
   */
  getContainer() {
    return container;
  }
}

setWorldConstructor(World);
