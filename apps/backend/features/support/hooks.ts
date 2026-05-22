import { After, AfterAll, Before, BeforeAll, ITestCaseHookParameter, Status, setDefaultTimeout } from '@cucumber/cucumber';
import * as promClient from 'prom-client';

// Import the test-specific container bootstrap so all non-observability
// singletons are registered before any Before hook or App construction runs.
// Observability services are registered per-scenario below.
import { container } from '../../src/container-test';
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

Before(async function (this: World, { pickle }: ITestCaseHookParameter) {
  // Fresh metrics registry per scenario to prevent cross-scenario leakage.
  const registry = new promClient.Registry();
  const metricsService = new MetricsService(registry);
  container.registerInstance('PrometheusRegistry', registry);
  container.registerInstance('MetricsService', metricsService);

  // Scenarios tagged @no-server perform file/config inspection only.
  // Skipping full app init avoids unnecessary DB/Redis/Docker connections.
  const scenarioTags = pickle.tags.map((t) => t.name);
  const needsServer = !scenarioTags.includes('@no-server');

  if (needsServer && typeof this.initializeApp === 'function') {
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

  // Defensive teardown: `prom-client@15` default metrics don't run on an interval,
  // but we keep the method for compatibility with older implementations/tests.
  try {
    if (container.isRegistered('MetricsService')) {
      const metricsService = container.resolve<MetricsService>('MetricsService');
      metricsService.stopDefaultMetricsCollection();
    }
  } catch (error) {
    console.warn('MetricsService teardown failed (ignored):', (error as Error).message);
  }
});
