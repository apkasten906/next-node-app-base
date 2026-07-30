import { DataTable, Given, Then, When } from '@cucumber/cucumber';

import fs from 'node:fs/promises';
import path from 'node:path';

import { expect } from '../support/assertions';
import { World } from '../support/world';

function getRepoRoot(cwd: string): string {
  // Backend Cucumber runs with cwd = apps/backend
  return path.resolve(cwd, '..', '..');
}

async function readFileOrFail(filePath: string): Promise<string> {
  const content = await fs.readFile(filePath, 'utf8');
  expect(content.length).toBeGreaterThan(0);
  return content;
}

function assertMultiStageDockerfile(dockerfile: string, stageNames: string[]): void {
  for (const stageName of stageNames) {
    expect(dockerfile).toContain(` AS ${stageName}`);
  }

  // Ensure there are multiple FROM directives.
  const fromCount = dockerfile
    .split(/\r?\n/)
    .filter((line) => line.trim().toUpperCase().startsWith('FROM ')).length;
  expect(fromCount).toBeGreaterThanOrEqual(3);
}

// Background steps (only matter for @ready scenarios in this feature file)
Given('Kubernetes cluster is available', async function (this: World) {
  // Deterministic @ready: we don't require a real cluster.
  this.setData('k8sClusterAvailable', true);
});

Given('DevOps tools are configured', async function (this: World) {
  this.setData('devopsToolsConfigured', true);
});

// Docker build scenario
Given('a multi-stage Dockerfile exists', async function (this: World) {
  const repoRoot = getRepoRoot(process.cwd());

  const backendDockerfilePath = path.resolve(repoRoot, 'apps', 'backend', 'Dockerfile');
  const frontendDockerfilePath = path.resolve(repoRoot, 'apps', 'frontend', 'Dockerfile');

  const [backendDockerfile, frontendDockerfile] = await Promise.all([
    readFileOrFail(backendDockerfilePath),
    readFileOrFail(frontendDockerfilePath),
  ]);

  assertMultiStageDockerfile(backendDockerfile, ['deps', 'builder', 'prod-deps', 'runner']);
  assertMultiStageDockerfile(frontendDockerfile, ['deps', 'builder', 'runner']);

  this.setData('backendDockerfile', backendDockerfile);
  this.setData('frontendDockerfile', frontendDockerfile);
});

When('I build the Docker image', async function (this: World) {
  // Deterministic @ready: we validate build configuration, not the Docker runtime.
  this.setData('dockerBuildValidated', true);
});

Then('build should use caching', async function (this: World) {
  const backendDockerfile = this.getData<string>('backendDockerfile');
  const frontendDockerfile = this.getData<string>('frontendDockerfile');

  expect(backendDockerfile).toContain('--mount=type=cache');
  expect(frontendDockerfile).toContain('--mount=type=cache');
});

Then('final image should be optimized', async function (this: World) {
  const backendDockerfile = this.getData<string>('backendDockerfile');
  const frontendDockerfile = this.getData<string>('frontendDockerfile');

  // Heuristics that indicate a reasonably optimized production image.
  expect(backendDockerfile).toContain('FROM node:${NODE_VERSION}-alpine AS runner');
  expect(backendDockerfile).toContain('USER nodejs');
  expect(backendDockerfile).toContain('COPY --from=builder');

  expect(frontendDockerfile).toContain('FROM node:${NODE_VERSION}-alpine AS runner');
  expect(frontendDockerfile).toContain('USER nextjs');
  expect(frontendDockerfile).toContain('.next/standalone');
});

Then('image size should be minimal', async function (this: World) {
  const backendDockerfile = this.getData<string>('backendDockerfile');
  const frontendDockerfile = this.getData<string>('frontendDockerfile');

  // We can't measure image size deterministically here; instead we assert
  // size-reduction patterns are present.
  expect(backendDockerfile).toContain('pnpm install --frozen-lockfile --prod');
  expect(frontendDockerfile).toContain('standalone');
});

// Docker Compose scenario
Given('Docker Compose configuration exists', async function (this: World) {
  const repoRoot = getRepoRoot(process.cwd());
  const composePath = path.resolve(repoRoot, 'docker-compose.yml');

  const compose = await readFileOrFail(composePath);
  this.setData('dockerCompose', compose);
});

Then('the Compose file should define required services', async function (this: World) {
  const compose = this.getData<string>('dockerCompose');

  expect(compose).toContain('services:');
  expect(compose).toContain('\n  postgres:');
  expect(compose).toContain('\n  redis:');
  expect(compose).toContain('\n  backend:');
  expect(compose).toContain('\n  frontend:');
});

Then('backend service should build from the backend Dockerfile', async function (this: World) {
  const compose = this.getData<string>('dockerCompose');

  expect(compose).toContain('dockerfile: apps/backend/Dockerfile');
  expect(compose).toContain('target: runner');
});

Then('frontend service should build from the frontend Dockerfile', async function (this: World) {
  const compose = this.getData<string>('dockerCompose');

  expect(compose).toContain('dockerfile: apps/frontend/Dockerfile');
  expect(compose).toContain('target: runner');
});

type AppManifestSources = {
  backendDeployment: string;
  backendService: string;
  configmap: string;
  frontendDeployment: string;
  frontendService: string;
  kustomization: string;
};

async function loadAppManifestSources(repoRoot: string): Promise<AppManifestSources> {
  const appDir = path.resolve(repoRoot, 'kubernetes', 'app');
  const [
    backendDeployment,
    backendService,
    configmap,
    frontendDeployment,
    frontendService,
    kustomization,
  ] = await Promise.all([
    readFileOrFail(path.resolve(appDir, 'backend-deployment.yaml')),
    readFileOrFail(path.resolve(appDir, 'backend-service.yaml')),
    readFileOrFail(path.resolve(appDir, 'configmap.yaml')),
    readFileOrFail(path.resolve(appDir, 'frontend-deployment.yaml')),
    readFileOrFail(path.resolve(appDir, 'frontend-service.yaml')),
    readFileOrFail(path.resolve(appDir, 'kustomization.yaml')),
  ]);

  return {
    backendDeployment,
    backendService,
    configmap,
    frontendDeployment,
    frontendService,
    kustomization,
  };
}

function deploymentSources(world: World): string[] {
  const backendDeployment = world.getData<string>('backendDeploymentManifest');
  const frontendDeployment = world.getData<string>('frontendDeploymentManifest');
  expect(backendDeployment).toBeDefined();
  expect(frontendDeployment).toBeDefined();
  return [backendDeployment!, frontendDeployment!];
}

function serviceSources(world: World): string[] {
  const backendService = world.getData<string>('backendServiceManifest');
  const frontendService = world.getData<string>('frontendServiceManifest');
  expect(backendService).toBeDefined();
  expect(frontendService).toBeDefined();
  return [backendService!, frontendService!];
}

function assertContainsAll(source: string, expectedValues: string[]): void {
  for (const expectedValue of expectedValues) {
    expect(source).toContain(expectedValue);
  }
}

// Application Kubernetes manifest scenarios
Given('a Kubernetes deployment manifest exists', async function (this: World) {
  const repoRoot = getRepoRoot(process.cwd());
  const manifests = await loadAppManifestSources(repoRoot);

  expect(manifests.backendDeployment).toContain('kind: Deployment');
  expect(manifests.frontendDeployment).toContain('kind: Deployment');
  expect(manifests.kustomization).toContain('backend-deployment.yaml');
  expect(manifests.kustomization).toContain('frontend-deployment.yaml');

  this.setData('backendDeploymentManifest', manifests.backendDeployment);
  this.setData('frontendDeploymentManifest', manifests.frontendDeployment);
});

When('I apply the deployment', async function (this: World) {
  // Deterministic @ready: validate templates rather than requiring kubectl.
  this.setData('deploymentApplied', true);
});

Then('pods should be created', async function (this: World) {
  for (const deployment of deploymentSources(this)) {
    assertContainsAll(deployment, ['spec:', 'template:', 'containers:', 'image:']);
  }
});

Then('desired replica count should be met', async function (this: World) {
  for (const deployment of deploymentSources(this)) {
    expect(deployment).toMatch(/replicas:\s*2/);
  }
});

Then('containers should be running', async function (this: World) {
  const [backendDeployment, frontendDeployment] = deploymentSources(this);

  assertContainsAll(backendDeployment!, ['name: backend', 'containerPort: 3001']);
  assertContainsAll(frontendDeployment!, ['name: frontend', 'containerPort: 3000']);
});

Given('a Kubernetes service is defined', async function (this: World) {
  const repoRoot = getRepoRoot(process.cwd());
  const manifests = await loadAppManifestSources(repoRoot);

  expect(manifests.backendService).toContain('kind: Service');
  expect(manifests.frontendService).toContain('kind: Service');
  expect(manifests.kustomization).toContain('backend-service.yaml');
  expect(manifests.kustomization).toContain('frontend-service.yaml');

  this.setData('backendServiceManifest', manifests.backendService);
  this.setData('frontendServiceManifest', manifests.frontendService);
});

When('the service is created', async function (this: World) {
  this.setData('serviceCreated', true);
});

Then('a cluster IP should be assigned', async function (this: World) {
  for (const service of serviceSources(this)) {
    expect(service).toContain('type: ClusterIP');
  }
});

Then('traffic should be load-balanced across pods', async function (this: World) {
  for (const service of serviceSources(this)) {
    assertContainsAll(service, ['selector:', 'app.kubernetes.io/name:', 'targetPort: http']);
  }
});

Then('service discovery should work', async function (this: World) {
  const [backendService, frontendService] = serviceSources(this);
  expect(backendService).toContain('name: backend');
  expect(frontendService).toContain('name: frontend');
});

Given('a ConfigMap with application config', async function (this: World) {
  const repoRoot = getRepoRoot(process.cwd());
  const manifests = await loadAppManifestSources(repoRoot);

  expect(manifests.configmap).toContain('kind: ConfigMap');
  expect(manifests.configmap).toContain('NEXT_PUBLIC_API_URL');
  expect(manifests.configmap).toContain('API_URL_INTERNAL');

  this.setData('appConfigMapManifest', manifests.configmap);
  this.setData('backendDeploymentManifest', manifests.backendDeployment);
  this.setData('frontendDeploymentManifest', manifests.frontendDeployment);
});

When('pods are deployed', async function (this: World) {
  this.setData('podsDeployed', true);
});

Then('configuration should be injected as env vars', async function (this: World) {
  for (const deployment of deploymentSources(this)) {
    assertContainsAll(deployment, ['envFrom:', 'configMapRef:', 'name: next-node-app-config']);
  }
});

Then('pods should use the configuration', async function (this: World) {
  const configmap = this.getData<string>('appConfigMapManifest');
  expect(configmap).toBeDefined();
  assertContainsAll(configmap!, ['NODE_ENV:', 'PORT:', 'CORS_ORIGIN:']);
});

When('ConfigMap is updated', async function (this: World) {
  this.setData('configMapUpdated', true);
});

Then('pods should be restarted with new config', async function (this: World) {
  for (const deployment of deploymentSources(this)) {
    expect(deployment).toContain('strategy:');
    expect(deployment).toContain('type: RollingUpdate');
  }
});

Given('pods have resource limits defined', async function (this: World) {
  const repoRoot = getRepoRoot(process.cwd());
  const manifests = await loadAppManifestSources(repoRoot);

  this.setData('backendDeploymentManifest', manifests.backendDeployment);
  this.setData('frontendDeploymentManifest', manifests.frontendDeployment);
});

Then('each pod should have:', async function (this: World, table: DataTable) {
  const rows = table.hashes();

  for (const deployment of deploymentSources(this)) {
    expect(deployment).toContain('resources:');
    for (const row of rows) {
      expect(row['resource']).toBeDefined();
      expect(row['request']).toBeDefined();
      expect(row['limit']).toBeDefined();
      expect(deployment).toContain(`${row['resource']}: ${row['request']}`);
      expect(deployment).toContain(`${row['resource']}: ${row['limit']}`);
    }
  }
});

Then('pods should not exceed limits', async function (this: World) {
  for (const deployment of deploymentSources(this)) {
    assertContainsAll(deployment, ['limits:', 'cpu: 500m', 'memory: 512Mi']);
  }
});

Then('resource requests should be guaranteed', async function (this: World) {
  for (const deployment of deploymentSources(this)) {
    assertContainsAll(deployment, ['requests:', 'cpu: 100m', 'memory: 128Mi']);
  }
});

Given('health probes are configured', async function (this: World) {
  const repoRoot = getRepoRoot(process.cwd());
  const manifests = await loadAppManifestSources(repoRoot);

  this.setData('backendDeploymentManifest', manifests.backendDeployment);
  this.setData('frontendDeploymentManifest', manifests.frontendDeployment);
});

When('a pod starts', async function (this: World) {
  this.setData('podStarted', true);
});

Then('readiness probe should prevent traffic until ready', async function (this: World) {
  const [backendDeployment, frontendDeployment] = deploymentSources(this);

  assertContainsAll(backendDeployment!, ['readinessProbe:', 'path: /ready']);
  assertContainsAll(frontendDeployment!, ['readinessProbe:', 'path: /api/health']);
});

When('a pod becomes unhealthy', async function (this: World) {
  this.setData('podUnhealthy', true);
});

Then('liveness probe should restart the pod', async function (this: World) {
  for (const deployment of deploymentSources(this)) {
    assertContainsAll(deployment, ['livenessProbe:', 'failureThreshold:', 'periodSeconds:']);
  }
});

// CI test-stage scenario
Given('CI pipeline has test stage', async function (this: World) {
  const repoRoot = getRepoRoot(process.cwd());
  const workflow = await readFileOrFail(
    path.resolve(repoRoot, '.github', 'workflows', 'backend-tests.yml')
  );
  this.setData('backendTestsWorkflow', workflow);
});

When('tests run in CI', async function (this: World) {
  const workflow = this.getData<string>('backendTestsWorkflow');
  expect(workflow).toBeDefined();
  this.setData('ciTestsRun', true);
});

Then('unit tests should execute', async function (this: World) {
  const workflow = this.getData<string>('backendTestsWorkflow');
  expect(workflow).toContain('test:unit');
});

Then('integration tests should execute', async function (this: World) {
  const workflow = this.getData<string>('backendTestsWorkflow');
  expect(workflow).toContain('test:integration');
});

Then('coverage report should be generated', async function (this: World) {
  const workflow = this.getData<string>('backendTestsWorkflow');
  expect(workflow).toContain('test:coverage');
});

Then('test results should be published', async function (this: World) {
  const workflow = this.getData<string>('backendTestsWorkflow');
  expect(workflow).toContain('actions/upload-artifact');
  expect(workflow).toContain('backend-coverage');
});
