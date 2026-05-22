import { After, AfterAll, Before, BeforeAll, ITestCaseHookParameter, Status, setDefaultTimeout } from '@cucumber/cucumber';
import * as promClient from 'prom-client';

// Import the test-specific container bootstrap so all non-observability
// singletons are registered before any Before hook or App construction runs.
// Observability services are registered per-scenario below.
import { container } from '../../src/container-test';
import { MetricsService } from '../../src/infrastructure/observability';
import { World } from './world';

// Set the default timeout at module scope so it applies to every hook and step
// registered in this file (and in files loaded after it). Calling it inside
// BeforeAll is too late for already-registered hooks.
setDefaultTimeout(30_000);

BeforeAll(async function () {
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

After({ timeout: 30_000 }, async function (this: World, { result, pickle }) {
  // Log scenario result
  if (result?.status === Status.FAILED) {
    console.error(`❌ Scenario failed: ${pickle.name}`);
    if (this.error) {
      console.error('Error:', this.error.message);
    }
  } else {
    console.log(`✅ Scenario passed: ${pickle.name}`);
  }

  // Cleanup after each scenario (if method exists).
  // Errors are swallowed so that infrastructure teardown issues (e.g. OTel
  // exporter flushing when the collector is not running) do not mark an
  // otherwise-passing scenario as failed.
  if (typeof this.cleanup === 'function') {
    try {
      await this.cleanup();
    } catch (err) {
      console.warn('Scenario cleanup error (ignored):', (err as Error).message);
    }
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
