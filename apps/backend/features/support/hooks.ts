import { After, AfterAll, Before, BeforeAll, Status, setDefaultTimeout } from '@cucumber/cucumber';
import * as promClient from 'prom-client';
import { container } from 'tsyringe';

import { MetricsService } from '../../src/infrastructure/observability';
import { World } from './world';

BeforeAll(async function () {
  // Set a reasonable default timeout for steps to prevent indefinite hangs
  setDefaultTimeout(30_000);
  console.log('🥒 Cucumber test suite starting...');
});

AfterAll(async function () {
  console.log('🥒 Cucumber test suite completed');
});

Before(async function (this: World) {
  // Fresh metrics registry per scenario to prevent cross-scenario leakage.
  const registry = new promClient.Registry();
  const metricsService = new MetricsService(registry);
  container.registerInstance('PrometheusRegistry', registry);
  container.registerInstance('MetricsService', metricsService);

  // Initialize test app for each scenario (if method exists)
  if (typeof this.initializeApp === 'function') {
    await this.initializeApp();
  }
});

After(async function (this: World, { result, pickle }) {
  // Log scenario result
  if (result?.status === Status.FAILED) {
    console.error(`❌ Scenario failed: ${pickle.name}`);
    if (this.error) {
      console.error('Error:', this.error.message);
    }
  } else {
    console.log(`✅ Scenario passed: ${pickle.name}`);
  }

  // Cleanup after each scenario (if method exists)
  if (typeof this.cleanup === 'function') {
    await this.cleanup();
  }
});
