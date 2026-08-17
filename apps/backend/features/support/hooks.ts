import {
  After,
  AfterAll,
  Before,
  BeforeAll,
  ITestCaseHookParameter,
  Status,
  setDefaultTimeout,
} from '@cucumber/cucumber';
import * as promClient from 'prom-client';

// Import the test-specific container bootstrap so all non-observability
// singletons are registered before any Before hook or App construction runs.
// Observability services are registered per-scenario below.
import { container } from '../../src/container-test';
import { MetricsService } from '../../src/infrastructure/observability';
import { enforceCleanupErrors } from './cleanup-policy';
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
  const scenarioFailed = result?.status === Status.FAILED;
  if (scenarioFailed) {
    console.error(`❌ Scenario failed: ${pickle.name}`);
    if (this.error) console.error('Error:', this.error.message);
  }

  const cleanupErrors: unknown[] = [];

  try {
    await this.cleanup();
  } catch (error) {
    cleanupErrors.push(error);
  }

  // prom-client@15 default metrics do not use an interval, but retain this
  // compatibility cleanup and treat failures like every other teardown error.
  try {
    if (container.isRegistered('MetricsService')) {
      const metricsService = container.resolve<MetricsService>('MetricsService');
      metricsService.stopDefaultMetricsCollection();
    }
  } catch (error) {
    cleanupErrors.push(error);
  }

  enforceCleanupErrors(cleanupErrors, scenarioFailed, (error) => {
    console.error(`Additional teardown error for failed scenario "${pickle.name}":`, error);
  });

  if (!scenarioFailed) console.log(`✅ Scenario passed: ${pickle.name}`);
});
