import { Given, Then } from '@cucumber/cucumber';

import fs from 'node:fs/promises';
import path from 'node:path';

import { expect } from '../support/assertions';
import { World } from '../support/world';

function getRepoRoot(cwd: string): string {
  // Backend Cucumber runs with cwd = apps/backend
  return path.resolve(cwd, '..', '..');
}

async function readText(filePath: string): Promise<string> {
  const content = await fs.readFile(filePath, 'utf8');
  expect(content.length).toBeGreaterThan(0);
  return content;
}

Given('Verdaccio Kubernetes manifests are available', async function (this: World) {
  const repoRoot = getRepoRoot(process.cwd());
  const dir = path.resolve(repoRoot, 'kubernetes', 'verdaccio');

  const files = await fs.readdir(dir);
  expect(files.length).toBeGreaterThan(0);

  this.setData('verdaccioDir', dir);
  this.setData('verdaccioFiles', files);

  // Read key manifests we want to assert against.
  const paths = {
    deployment: path.resolve(dir, 'deployment.yaml'),
    service: path.resolve(dir, 'service.yaml'),
    pvc: path.resolve(dir, 'pvc.yaml'),
    configmap: path.resolve(dir, 'configmap.yaml'),
    istio: path.resolve(dir, 'istio-virtualservice.yaml'),
    kustomize: path.resolve(dir, 'kustomization.yaml'),
    readme: path.resolve(dir, 'README.md'),
  };

  const [deployment, service, pvc, configmap, istio, kustomize, readme] = await Promise.all([
    readText(paths.deployment),
    readText(paths.service),
    readText(paths.pvc),
    readText(paths.configmap),
    readText(paths.istio),
    readText(paths.kustomize),
    readText(paths.readme),
  ]);

  this.setData('verdaccioDeployment', deployment);
  this.setData('verdaccioService', service);
  this.setData('verdaccioPvc', pvc);
  this.setData('verdaccioConfigmap', configmap);
  this.setData('verdaccioIstio', istio);
  this.setData('verdaccioKustomize', kustomize);
  this.setData('verdaccioReadme', readme);
});

Then(
  'Verdaccio manifests should include a Deployment, Service, PVC, and ConfigMap',
  async function (this: World) {
    expect(this.getData<string>('verdaccioDeployment')).toContain('kind: Deployment');
    expect(this.getData<string>('verdaccioService')).toContain('kind: Service');
    expect(this.getData<string>('verdaccioPvc')).toContain('kind: PersistentVolumeClaim');
    expect(this.getData<string>('verdaccioConfigmap')).toContain('kind: ConfigMap');

    // kustomize should reference these resources so `kubectl apply -k` works.
    const kustomize = this.getData<string>('verdaccioKustomize');
    expect(kustomize).toContain('deployment.yaml');
    expect(kustomize).toContain('service.yaml');
    expect(kustomize).toContain('pvc.yaml');
    expect(kustomize).toContain('configmap.yaml');
  }
);

Then('Verdaccio manifests should include Istio traffic management', async function (this: World) {
  const istio = this.getData<string>('verdaccioIstio');

  expect(istio).toContain('apiVersion: networking.istio.io');
  expect(istio).toContain('kind: VirtualService');
  expect(istio).toContain('kind: DestinationRule');

  // README should mention Istio integration so developers know why it exists.
  const readme = this.getData<string>('verdaccioReadme');
  expect(readme).toMatch(/Istio/i);
  expect(readme).toMatch(/service mesh/i);
});

Then('Verdaccio manifests should include basic security hardening', async function (this: World) {
  const deployment = this.getData<string>('verdaccioDeployment');

  // Basic pod security context and least-privilege container settings.
  expect(deployment).toMatch(/runAsNonRoot\s*:\s*true/i);
  expect(deployment).toMatch(/allowPrivilegeEscalation\s*:\s*false/i);
  expect(deployment).toMatch(/capabilities:\s*\n\s*drop:\s*\n\s*-\s*ALL/i);
});
