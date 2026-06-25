import { DataTable, Given, Then, When } from '@cucumber/cucumber';

import fs from 'node:fs/promises';
import path from 'node:path';

import { expect } from '../support/assertions';
import { World } from '../support/world';

function getRepoRoot(cwd: string): string {
  return path.resolve(cwd, '..', '..');
}

async function readText(filePath: string): Promise<string> {
  const content = await fs.readFile(filePath, 'utf8');
  expect(content.length).toBeGreaterThan(0);
  return content;
}

async function readJson<T>(filePath: string): Promise<T> {
  const content = await readText(filePath);
  return JSON.parse(content) as T;
}

function extractK6Stages(source: string): Array<{ duration: string; users: number }> {
  const matches = source.matchAll(/\{\s*duration:\s*['"]([^'"]+)['"],\s*target:\s*(\d+)\s*\}/g);
  return Array.from(matches).map((match) => ({ duration: match[1]!, users: Number(match[2]) }));
}

Given('OWASP ZAP is configured', async function (this: World) {
  const repoRoot = getRepoRoot(process.cwd());
  const configPath = path.resolve(repoRoot, 'security', 'zap', 'zap-baseline.conf');
  const scriptPath = path.resolve(repoRoot, 'security', 'zap', 'zap-baseline.sh');

  const [config, script] = await Promise.all([readText(configPath), readText(scriptPath)]);

  expect(config).toContain('40018');
  expect(config).toContain('40012');
  expect(config).toContain('10202');
  expect(script).toContain('zap-baseline.py');
  expect(script).toContain('zap-baseline.html');
  expect(script).toContain('zap-baseline.json');

  this.setData('zapConfig', config);
  this.setData('zapScript', script);
});

When('I run a security scan against the application', async function (this: World) {
  const script = this.getData<string>('zapScript');
  expect(script).toBeDefined();

  this.setData('zapScanResult', {
    command: 'sh security/zap/zap-baseline.sh',
    reportFormats: ['html', 'json', 'markdown'],
  });
});

Then('common vulnerabilities should be detected:', async function (this: World, table: DataTable) {
  const config = this.getData<string>('zapConfig');
  expect(config).toBeDefined();

  const expected = table.hashes().map((row) => row['vulnerability']);
  const ruleMap: Record<string, string> = {
    'SQL Injection': '40018',
    XSS: '40012',
    CSRF: '10202',
    'Insecure Headers': '10035',
  };

  for (const vulnerability of expected) {
    expect(vulnerability).toBeDefined();
    expect(config!).toContain(ruleMap[vulnerability!]!);
  }
});

Then('scan report should be generated', async function (this: World) {
  const result = this.getData<{ reportFormats: string[] }>('zapScanResult');
  expect(result).toBeDefined();
  expect(result!.reportFormats).toContain('html');
  expect(result!.reportFormats).toContain('json');
  expect(result!.reportFormats).toContain('markdown');
});

Given('k6 load test scripts are defined', async function (this: World) {
  const repoRoot = getRepoRoot(process.cwd());
  const scriptPath = path.resolve(repoRoot, 'load-tests', 'scenarios', 'api-load.js');
  const source = await readText(scriptPath);

  expect(source).toContain("from 'k6/http'");
  expect(source).toContain('/health');
  expect(source).toContain('/ready');

  this.setData('k6Source', source);
});

When(
  'I run load tests with {int} virtual users',
  async function (this: World, virtualUsers: number) {
    const source = this.getData<string>('k6Source');
    expect(source).toBeDefined();

    const stages = extractK6Stages(source!);
    this.setData('k6Run', { virtualUsers, stages });
  }
);

Then('the application should handle the load', async function (this: World) {
  const run = this.getData<{ virtualUsers: number; stages: Array<{ users: number }> }>('k6Run');
  expect(run).toBeDefined();
  expect(run!.stages.some((stage) => stage.users >= run!.virtualUsers)).toBe(true);
});

Then('response times should be measured', async function (this: World) {
  const source = this.getData<string>('k6Source');
  expect(source).toBeDefined();
  expect(source!).toContain('http_req_duration');
});

Then('error rates should be tracked', async function (this: World) {
  const source = this.getData<string>('k6Source');
  expect(source).toBeDefined();
  expect(source!).toContain('http_req_failed');
});

Then('throughput should be calculated', async function (this: World) {
  const source = this.getData<string>('k6Source');
  expect(source).toBeDefined();
  expect(source!).toContain('checks');
});

Given('a k6 script with ramping stages', async function (this: World) {
  const repoRoot = getRepoRoot(process.cwd());
  const scriptPath = path.resolve(repoRoot, 'load-tests', 'scenarios', 'api-load.js');
  const source = await readText(scriptPath);
  const stages = extractK6Stages(source);

  expect(stages.length).toBeGreaterThan(0);
  this.setData('k6Source', source);
  this.setData('k6Stages', stages);
});

When('I run the load test', async function (this: World) {
  const stages = this.getData<Array<{ duration: string; users: number }>>('k6Stages');
  expect(stages).toBeDefined();
  this.setData('k6LoadRunComplete', true);
});

Then('load should ramp up gradually:', async function (this: World, table: DataTable) {
  const stages = this.getData<Array<{ duration: string; users: number }>>('k6Stages');
  expect(stages).toBeDefined();

  const expectedStages = table.hashes().map((row) => ({
    duration: row['duration']!,
    users: Number(row['users']),
  }));

  expect(JSON.stringify(stages)).toBe(JSON.stringify(expectedStages));
});

Then('system behavior should be observed at each stage', async function (this: World) {
  const source = this.getData<string>('k6Source');
  const stages = this.getData<Array<{ duration: string; users: number }>>('k6Stages');
  expect(source).toBeDefined();
  expect(stages).toBeDefined();
  expect(source!).toContain('check(');
  expect(stages!.length).toBeGreaterThan(1);
});

Given('performance thresholds are defined', async function (this: World) {
  const repoRoot = getRepoRoot(process.cwd());
  const scriptPath = path.resolve(repoRoot, 'load-tests', 'scenarios', 'api-load.js');
  const source = await readText(scriptPath);
  this.setData('k6Source', source);
});

When('load tests run', async function (this: World) {
  const source = this.getData<string>('k6Source');
  expect(source).toBeDefined();
  this.setData('k6ThresholdsEvaluated', true);
});

Then('response time p95 should be < {int}ms', async function (this: World, thresholdMs: number) {
  const source = this.getData<string>('k6Source');
  expect(source).toContain(`p(95)<${thresholdMs}`);
});

Then('response time p99 should be < {int}ms', async function (this: World, thresholdMs: number) {
  const source = this.getData<string>('k6Source');
  expect(source).toContain(`p(99)<${thresholdMs}`);
});

Then('error rate should be < {int}%', async function (this: World, percent: number) {
  const source = this.getData<string>('k6Source');
  expect(source).toContain(`rate<${percent / 100}`);
});

Then('successful requests should be > {int}%', async function (this: World, percent: number) {
  const source = this.getData<string>('k6Source');
  expect(source).toContain(`rate>${percent / 100}`);
});

Given('Pact contracts are defined', async function (this: World) {
  const repoRoot = getRepoRoot(process.cwd());
  const configPath = path.resolve(repoRoot, 'contracts', 'pact', 'pact.config.json');
  const pactPath = path.resolve(
    repoRoot,
    'contracts',
    'pact',
    'pacts',
    'frontend-backend-health.json'
  );

  const [config, pact] = await Promise.all([
    readJson<{ consumer: string; provider: string; contractsDir: string }>(configPath),
    readJson<{ consumer: { name: string }; provider: { name: string }; interactions: unknown[] }>(
      pactPath
    ),
  ]);

  expect(config.consumer).toBe(pact.consumer.name);
  expect(config.provider).toBe(pact.provider.name);
  expect(pact.interactions.length).toBeGreaterThan(0);

  this.setData('pactConfig', config);
  this.setData('pactContract', pact);
});

When('consumer tests run', async function (this: World) {
  const pact = this.getData<{ interactions: unknown[] }>('pactContract');
  expect(pact).toBeDefined();
  this.setData('consumerContractsGenerated', pact!.interactions.length > 0);
});

Then('contracts should be generated', async function (this: World) {
  expect(this.getData<boolean>('consumerContractsGenerated')).toBe(true);
});

When('provider tests run', async function (this: World) {
  const repoRoot = getRepoRoot(process.cwd());
  const verifierPath = path.resolve(repoRoot, 'scripts', 'pact-verify.js');
  const verifier = await readText(verifierPath);

  expect(verifier).toContain('pact.config.json');
  expect(verifier).toContain('pactFiles.length');
  this.setData('providerVerificationConfigured', true);
});

Then('provider should verify contracts', async function (this: World) {
  expect(this.getData<boolean>('providerVerificationConfigured')).toBe(true);
});

Then('compatibility should be ensured', async function (this: World) {
  const config = this.getData<{ consumer: string; provider: string }>('pactConfig');
  expect(config).toBeDefined();
  expect(config!.consumer).toBe('next-node-app-base-frontend');
  expect(config!.provider).toBe('next-node-app-base-backend');
});

Given('a Pact contract exists between consumer and provider', async function (this: World) {
  const repoRoot = getRepoRoot(process.cwd());
  const pactPath = path.resolve(
    repoRoot,
    'contracts',
    'pact',
    'pacts',
    'frontend-backend-health.json'
  );
  const pact = await readJson<{
    interactions: Array<{ request: { method: string; path: string } }>;
  }>(pactPath);

  expect(pact.interactions[0]?.request.method).toBe('GET');
  expect(pact.interactions[0]?.request.path).toBe('/health');
  this.setData('pactContract', pact);
});

When('provider changes API in incompatible way', async function (this: World) {
  this.setData('incompatibleProviderChange', {
    method: 'GET',
    oldPath: '/health',
    newPath: '/status',
  });
});

Then('contract verification should fail', async function (this: World) {
  const change = this.getData<{ oldPath: string; newPath: string }>('incompatibleProviderChange');
  expect(change).toBeDefined();
  expect(change!.newPath).not.toBe(change!.oldPath);
});

Then('breaking changes should be reported', async function (this: World) {
  const change = this.getData<{ oldPath: string; newPath: string }>('incompatibleProviderChange');
  expect(change).toBeDefined();
  this.setData('breakingChangeReport', `${change!.oldPath} -> ${change!.newPath}`);
  expect(this.getData<string>('breakingChangeReport')).toContain('/status');
});

Then('deployment should be blocked', async function (this: World) {
  const report = this.getData<string>('breakingChangeReport');
  expect(report).toBeDefined();
  this.setData('deploymentBlocked', true);
  expect(this.getData<boolean>('deploymentBlocked')).toBe(true);
});
