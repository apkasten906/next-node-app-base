# Publishing Packages

This document describes how to publish packages from this monorepo to npm-compatible registries.

## Overview

The publish workflow is **registry-agnostic**, meaning you can publish to:

- **GitHub Packages** (default)
- **Internal registries** (Verdaccio, Artifactory, Nexus) exposed via service mesh
- **npmjs.com** (public registry)

This flexibility allows CI/CD pipelines to route package publishing through different registries without code changes, simply by configuring environment variables.

## Prerequisites

### For GitHub Packages (Default)

1. **GitHub Personal Access Token (PAT)**
   - Go to [GitHub Settings → Developer settings → Personal access tokens](https://github.com/settings/tokens)
   - Click "Generate new token (classic)"
   - Select scopes: `read:packages` and `write:packages`
   - Copy the generated token

2. **Package Scoping**
   - Packages must be scoped to your GitHub username or organization
   - Example: `@apkasten906/types`
   - Already configured in `packages/*/package.json`

### For Internal Registry

1. **Registry URL**
   - Get the URL of your internal registry (e.g., `http://npm-registry.svc.cluster.local:4873`)

2. **Authentication Token**
   - Obtain an auth token from your registry administrator

### For npmjs.com

1. **npm Account**
   - Create an account at [npmjs.com](https://www.npmjs.com/)

2. **Access Token**
   - Generate at [npmjs.com/settings/tokens](https://www.npmjs.com/settings/tokens)

## Local Development

### Setup Authentication

1. Copy the `.npmrc.template` to `.npmrc`:

   ```bash
   cp .npmrc.template .npmrc
   ```

2. Edit `.npmrc` and replace `YOUR_GITHUB_TOKEN` with your actual token:

   ```
   @apkasten906:registry=https://npm.pkg.github.com
   //npm.pkg.github.com/:_authToken=ghp_YOUR_ACTUAL_TOKEN_HERE
   ```

3. **IMPORTANT**: Never commit `.npmrc` with real tokens! It's already in `.gitignore`.

### Dry-Run (Recommended First)

Test the publish flow without actually publishing:

```bash
# Using npm script
pnpm publish:dry-run

# Or directly with environment variable
DRY_RUN=true NPM_AUTH_TOKEN=your-token node scripts/publish-packages.js
```

### Publish to GitHub Packages

```bash
# Using npm script (reads token from .npmrc)
pnpm publish:packages

# Or with environment variable
NPM_AUTH_TOKEN=your-token node scripts/publish-packages.js
```

### Publish to Internal Registry

```bash
REGISTRY_URL=http://npm-registry.svc.cluster.local:4873 \
NPM_AUTH_TOKEN=your-internal-token \
node scripts/publish-packages.js
```

### Publish Specific Packages Only

```bash
PACKAGES_FILTER="@apkasten906/types,@apkasten906/utils" \
NPM_AUTH_TOKEN=your-token \
node scripts/publish-packages.js
```

## CI/CD Workflows

### GitHub Actions Manual Publishing

The repository includes a manually triggered GitHub Actions workflow (`.github/workflows/publish.yml`) for package publishing.

#### Workflow Triggers

- Go to Actions → Publish Packages → Run workflow.
- Dry-run mode is enabled by default.
- You may select a custom registry and package filter.
- Tags and GitHub releases do not trigger package publication.

#### Workflow Jobs

1. **Build Job**
   - Checks out code
   - Installs dependencies with pnpm
   - Builds all packages in `packages/*` directory
   - Uploads build artifacts for publish job

2. **Publish Job**
   - Downloads build artifacts
   - Runs `scripts/publish-packages.js` with appropriate environment
   - Uses `GITHUB_TOKEN` for authentication (automatic)
   - Creates publish summary in GitHub Actions UI

#### Required Secrets

**For GitHub Packages (default):**

- `GITHUB_TOKEN` - Automatically provided by GitHub Actions, no configuration needed
- Workflow has `packages: write` permission

**For Internal Registry:**

- Add secret: `NPM_AUTH_TOKEN` with your registry token
- Optionally add secret: `INTERNAL_REGISTRY_URL`
- Update workflow to use secrets instead of inputs

#### Example: Manual Dry-Run

1. Go to repository → Actions tab
2. Select "Publish Packages" workflow
3. Click "Run workflow"
4. Configure options:
   - ✅ Dry-run mode: `true`
   - Registry URL: (leave empty for GitHub Packages)
   - Packages filter: (leave empty for all)
5. Click "Run workflow"
6. Monitor output in Actions log

#### Example: Publishing to Internal Registry

To configure the workflow for an internal registry:

1. Add repository secrets:
   - `INTERNAL_REGISTRY_URL`: `http://npm-registry.svc.cluster.local:4873`
   - `INTERNAL_REGISTRY_TOKEN`: Your auth token

2. Update `.github/workflows/publish.yml`:

   ```yaml
   env:
     REGISTRY_URL: ${{ secrets.INTERNAL_REGISTRY_URL }}
     NPM_AUTH_TOKEN: ${{ secrets.INTERNAL_REGISTRY_TOKEN }}
   ```

3. Commit and push changes
4. Trigger workflow manually or via tag

**Required Secrets:**

- `NPM_AUTH_TOKEN` or `GITHUB_TOKEN` (automatic in GitHub Actions)

**Workflow triggers:**

- Manual dispatch
- Git tags matching `v*.*.*` pattern
- Release creation

### Environment Variables

| Variable          | Required | Default                      | Description                                         |
| ----------------- | -------- | ---------------------------- | --------------------------------------------------- |
| `REGISTRY_URL`    | No       | `https://npm.pkg.github.com` | Target npm registry URL                             |
| `NPM_AUTH_TOKEN`  | Yes\*    | -                            | Authentication token for the registry               |
| `GITHUB_TOKEN`    | Yes\*    | -                            | Alternative to NPM_AUTH_TOKEN for GitHub Packages   |
| `DRY_RUN`         | No       | `false`                      | Set to `true` to test without publishing            |
| `PACKAGES_FILTER` | No       | All non-private              | Comma-separated list of package names to publish    |
| `PUBLISH_ACCESS`  | No       | `restricted`                 | npm publish access level (`public` or `restricted`) |

\* Either `NPM_AUTH_TOKEN` or `GITHUB_TOKEN` must be provided

## Package Configuration

### Making a Package Publishable

To make a workspace package publishable:

1. Update `package.json`:

   ```json
   {
     "name": "@apkasten906/your-package",
     "version": "1.0.0",
     "private": false,
     "repository": {
       "type": "git",
       "url": "https://github.com/apkasten906/next-node-app-base.git",
       "directory": "packages/your-package"
     },
     "publishConfig": {
       "registry": "https://npm.pkg.github.com",
       "access": "restricted"
     }
   }
   ```

2. Ensure the package has a `dist/` directory with build artifacts
3. Run dry-run to validate: `DRY_RUN=true pnpm publish:packages`

### Keeping a Package Private

Set `"private": true` in `package.json`. The publish script automatically skips private packages.

## Versioning

### Add a Changeset

```bash
pnpm changeset
```

Select the affected workspace packages, choose the semantic version bump, and describe the user-visible change. Pull requests that only change documentation, tests, CI, or repository maintenance do not need a changeset.

### Manually Triggered Version Pull Requests

When a release is ready to prepare, manually run `.github/workflows/version-packages.yml` from the GitHub Actions tab. It uses the changeset files accumulated on `master` to open or update a `chore(release): version packages` pull request. That pull request updates package versions and package-level changelogs independently.

The workflow does not run on ordinary pushes. It versions private packages so the repository can prepare `@repo/types` and future packages such as `@repo/contracts` before they become publishable. It does not publish packages or create tags. Publishing remains an explicit operation through the existing Publish Packages workflow after a package is marked `"private": false` and reviewed.

### Template Repository Releases

Repository/template releases are independent of package versioning. The current project goal is distribution through cloning and GitHub's **Use this template** feature; no workspace package is planned for publication.

After the planned BDD responsibility-taxonomy work is merged:

1. Choose the template milestone version.
2. Create the repository tag manually from the final merged `master` commit.
3. Create the GitHub release from that tag.

Do not run the Version Packages or Publish Packages workflows for this milestone. They are retained for a future decision to distribute workspace packages independently.

## Service Mesh Integration

When running applications inside a Kubernetes cluster with a service mesh (Istio, Linkerd), you can configure an internal registry.

### Deploy Internal Registry (Verdaccio)

This repository includes complete Kubernetes manifests for deploying Verdaccio with Istio integration.

**Quick Deploy:**

```bash
# Deploy all Verdaccio resources
kubectl apply -f kubernetes/verdaccio/

# Or use kustomize
kubectl apply -k kubernetes/verdaccio/

# Verify deployment
kubectl get all -n registry
```

**What's Included:**

- Namespace with Istio injection enabled
- Verdaccio deployment with security best practices
- PersistentVolumeClaim (10Gi) for package storage
- ConfigMap with production-ready Verdaccio configuration
- ClusterIP service for internal access
- Istio VirtualService and DestinationRule for traffic management

**Access the Registry:**

```bash
# From inside cluster
http://npm-registry.registry.svc.cluster.local:4873

# Port forward for local access
kubectl port-forward -n registry svc/npm-registry 4873:4873
open http://localhost:4873
```

**Complete Documentation:**
See [kubernetes/verdaccio/README.md](../kubernetes/verdaccio/README.md) for:

- Configuration options
- User authentication setup
- Monitoring and health checks
- Scaling and high availability
- Troubleshooting guide
- Backup and restore procedures

### Configure CI to Use Internal Registry

Update GitHub Actions workflow:

```yaml
# .github/workflows/publish.yml
env:
  REGISTRY_URL: http://npm-registry.registry.svc.cluster.local:4873
  NPM_AUTH_TOKEN: ${{ secrets.INTERNAL_REGISTRY_TOKEN }}
```

Or add as repository secrets:

1. Go to Settings → Secrets → Actions
2. Add `INTERNAL_REGISTRY_URL`: `http://npm-registry.registry.svc.cluster.local:4873`
3. Add `INTERNAL_REGISTRY_TOKEN`: Your Verdaccio auth token

## Troubleshooting

### Authentication Errors

```
ERROR: Unable to authenticate with registry
```

**Solution**: Verify your token is valid and has the correct scopes:

- For GitHub Packages: `read:packages`, `write:packages`
- For npmjs.com: Automation or Publish token type

### Scope Mismatch

```
ERROR: Package scope does not match registry
```

**Solution**: Ensure package name scope matches your GitHub username/org:

- Package: `@apkasten906/types`
- Registry: `@apkasten906:registry=https://npm.pkg.github.com`

### 404 Not Found During Install

```
ERROR: 404 Not Found - GET https://npm.pkg.github.com/@apkasten906/types
```

**Solutions**:

1. Verify the package was actually published (check GitHub Packages UI)
2. Ensure your `.npmrc` has authentication configured
3. Check you have `read:packages` permission for the repository

### Missing Dist Directory

```
ERROR: No files included in package
```

**Solution**: Build the package before publishing:

```bash
turbo run build --filter=@apkasten906/types
```

## Security Best Practices

1. **Never commit `.npmrc` with tokens**
   - Already in `.gitignore`
   - Use `.npmrc.template` for reference

2. **Rotate tokens regularly**
   - GitHub PATs: Every 90 days
   - Update in GitHub Secrets for CI

3. **Use restricted access by default**
   - Set `"access": "restricted"` in `publishConfig`
   - Only make public when necessary

4. **Audit published packages**
   - Review package contents in dry-run
   - Use `.npmignore` to exclude unnecessary files

5. **Use scoped packages**
   - Prevents namespace conflicts
   - Required for GitHub Packages

## Resources

- [GitHub Packages npm registry](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-npm-registry)
- [Verdaccio Documentation](https://verdaccio.org/docs/what-is-verdaccio)
- [pnpm publish command](https://pnpm.io/cli/publish)
- [npm package.json publishConfig](https://docs.npmjs.com/cli/v10/configuring-npm/package-json#publishconfig)

## Future Enhancements

- [x] **GitHub Actions workflow for manual publishing** - IMPLEMENTED (`.github/workflows/publish.yml`)
- [x] **Changesets versioning** - Version Packages PR automation is implemented
- [ ] Provenance attestation for published packages
- [ ] NPM package signing
- [ ] Pre-publish validation hooks
- [ ] Package size budgets and monitoring

## Completed Features

✅ **Registry-agnostic publishing script** - `scripts/publish-packages.js` supports any npm-compatible registry
✅ **GitHub Actions workflow** - Explicit package publishing through manual dispatch
✅ **Dry-run mode** - Test publishing without actually uploading packages
✅ **Package filtering** - Selectively publish specific packages
✅ **Service mesh support** - Route publishing through internal registries via environment variables
✅ **Verdaccio Kubernetes manifests** - Complete deployment configuration with Istio integration
