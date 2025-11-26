import { World as CucumberWorld, IWorldOptions, setWorldConstructor } from '@cucumber/cucumber';
import request from 'supertest';
import { container } from 'tsyringe';
import { App } from '../../src/index';

export interface CustomWorld extends CucumberWorld {
  app?: App;
  request?: ReturnType<typeof request>;
  response?: request.Response;
  testData?: Record<string, any>;
  error?: Error;
}

export class World extends CucumberWorld implements CustomWorld {
  app?: App;
  request?: ReturnType<typeof request>;
  response?: request.Response;
  testData: Record<string, any> = {};
  error?: Error;

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
    if (this.app) {
      await this.app.shutdown();
    }
    this.testData = {};
    this.error = undefined;
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
