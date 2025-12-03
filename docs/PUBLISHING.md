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

### GitHub Actions

The publish workflow is configured in `.github/workflows/publish.yml` (to be created).

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

### Manual Version Bumps

```bash
# In the package directory
cd packages/types
pnpm version patch  # 1.0.0 → 1.0.1
pnpm version minor  # 1.0.0 → 1.1.0
pnpm version major  # 1.0.0 → 2.0.0
```

### Automated Versioning (TODO)

Future enhancement: Integrate [changesets](https://github.com/changesets/changesets) or [semantic-release](https://github.com/semantic-release/semantic-release) for automated versioning based on conventional commits.

## Service Mesh Integration

When running applications inside a Kubernetes cluster with a service mesh (Istio, Linkerd), you can configure an internal registry:

### Deploy Internal Registry (Verdaccio Example)

```yaml
# kubernetes/verdaccio/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: npm-registry
spec:
  replicas: 1
  selector:
    matchLabels:
      app: npm-registry
  template:
    metadata:
      labels:
        app: npm-registry
    spec:
      containers:
        - name: verdaccio
          image: verdaccio/verdaccio:5
          ports:
            - containerPort: 4873
          volumeMounts:
            - name: storage
              mountPath: /verdaccio/storage
      volumes:
        - name: storage
          persistentVolumeClaim:
            claimName: npm-registry-pvc
---
apiVersion: v1
kind: Service
metadata:
  name: npm-registry
spec:
  selector:
    app: npm-registry
  ports:
    - port: 4873
      targetPort: 4873
```

### Configure CI to Use Internal Registry

```yaml
# .github/workflows/publish.yml
env:
  REGISTRY_URL: http://npm-registry.svc.cluster.local:4873
  NPM_AUTH_TOKEN: ${{ secrets.INTERNAL_REGISTRY_TOKEN }}
```

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

- [ ] GitHub Actions workflow for automated publishing
- [ ] Automated versioning with changesets or semantic-release
- [ ] Provenance attestation for published packages
- [ ] NPM package signing
- [ ] Pre-publish validation hooks
- [ ] Package size budgets and monitoring
