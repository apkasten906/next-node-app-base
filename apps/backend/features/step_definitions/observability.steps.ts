import { access, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { DataTable, Given, Then, When } from '@cucumber/cucumber';
import { expect } from '../support/assertions';

interface ObservabilityWorld {
  observabilityArtifact?: string;
  observabilityArtifactPath?: string;
}

const repositoryRoot = resolve(__dirname, '../../../..');

const resolveRepositoryPath = (relativePath: string): string =>
  resolve(repositoryRoot, relativePath);

const readArtifact = async (relativePath: string): Promise<string> =>
  readFile(resolveRepositoryPath(relativePath), 'utf8');

const expectedMarkers = (dataTable: DataTable): string[] =>
  dataTable
    .hashes()
    .map((row) => row['marker'])
    .filter((marker): marker is string => typeof marker === 'string' && marker.length > 0);

const assertContainsMarkers = (artifact: string, markers: string[], artifactPath: string): void => {
  for (const marker of markers) {
    expect(artifact, `${artifactPath} should contain ${JSON.stringify(marker)}`).toContain(marker);
  }
};

Given('the observability repository artifacts are available', async function () {
  await access(resolveRepositoryPath('kubernetes/observability'));
  await access(resolveRepositoryPath('apps/backend/src/infrastructure/observability'));
});

When(
  'I inspect the observability artifact {string}',
  async function (this: ObservabilityWorld, relativePath: string) {
    this.observabilityArtifactPath = relativePath;
    this.observabilityArtifact = await readArtifact(relativePath);
  }
);

Then(
  'the observability artifact should contain:',
  function (this: ObservabilityWorld, dataTable: DataTable) {
    expect(this.observabilityArtifact).toBeDefined();
    expect(this.observabilityArtifactPath).toBeDefined();
    assertContainsMarkers(
      this.observabilityArtifact ?? '',
      expectedMarkers(dataTable),
      this.observabilityArtifactPath ?? 'observability artifact'
    );
  }
);

Then(
  'observability artifact {string} should contain:',
  async function (relativePath: string, dataTable: DataTable) {
    const artifact = await readArtifact(relativePath);
    assertContainsMarkers(artifact, expectedMarkers(dataTable), relativePath);
  }
);
