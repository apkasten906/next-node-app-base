# Verdaccio Internal NPM Registry

This directory contains Kubernetes manifests for deploying [Verdaccio](https://verdaccio.org/), a lightweight private npm registry, inside your Kubernetes cluster with Istio service mesh integration.

## Overview

Verdaccio serves as an internal npm registry that:

- Caches packages from npmjs.com for faster installs
- Hosts private scoped packages (e.g., `@apkasten906/*`)
- Provides a web UI for package management
- Integrates with Istio for mTLS and traffic management
- Supports the registry-agnostic publish flow in this monorepo

## Architecture

```txt
┌─────────────────────────────────────────────────┐
│ Istio Service Mesh                               │
│                                                   │
│  ┌──────────────────────────────────────────┐   │
│  │ VirtualService (npm-registry)             │   │
│  │ - Routing rules                           │   │
│  │ - Timeouts, retries                       │   │
│  └──────────────────────────────────────────┘   │
│                    │                             │
│  ┌──────────────────────────────────────────┐   │
│  │ DestinationRule                           │   │
│  │ - Connection pooling                      │   │
│  │ - Circuit breaker                         │   │
│  │ - Outlier detection                       │   │
│  └──────────────────────────────────────────┘   │
│                    │                             │
│  ┌──────────────────────────────────────────┐   │
│  │ Service (npm-registry:4873)               │   │
│  └──────────────────────────────────────────┘   │
│                    │                             │
│  ┌──────────────────────────────────────────┐   │
│  │ Deployment (verdaccio)                    │   │
│  │ - Pod with Istio sidecar                  │   │
│  │ - ConfigMap (config.yaml)                 │   │
│  │ - PVC (package storage)                   │   │
│  └──────────────────────────────────────────┘   │
│                                                   │
└─────────────────────────────────────────────────┘
```

## Prerequisites

- Kubernetes cluster (1.24+)
- `kubectl` configured for your cluster
- Istio installed and configured (1.18+)
- Sufficient storage for package artifacts (default: 10Gi PVC)

## Quick Start

### 1. Deploy Verdaccio

```bash
# Apply all manifests
kubectl apply -f kubernetes/verdaccio/

# Or apply in order
kubectl apply -f kubernetes/verdaccio/namespace.yaml
kubectl apply -f kubernetes/verdaccio/pvc.yaml
kubectl apply -f kubernetes/verdaccio/configmap.yaml
kubectl apply -f kubernetes/verdaccio/deployment.yaml
kubectl apply -f kubernetes/verdaccio/service.yaml
kubectl apply -f kubernetes/verdaccio/istio-virtualservice.yaml
```

### 2. Verify Deployment

```bash
# Check namespace
kubectl get namespace registry

# Check all resources
kubectl get all -n registry

# Check pod status
kubectl get pods -n registry

# View logs
kubectl logs -n registry -l app=npm-registry -f

# Check Istio injection
kubectl get pods -n registry -o jsonpath='{.items[*].spec.containers[*].name}'
# Should show: verdaccio istio-proxy
```

### 3. Access the Registry

#### From Inside the Cluster

```bash
# Full DNS name
http://npm-registry.registry.svc.cluster.local:4873

# Short name (from within registry namespace)
http://npm-registry:4873
```

#### Port Forward for Local Access

```bash
# Forward local port 4873 to registry
kubectl port-forward -n registry svc/npm-registry 4873:4873

# Access in browser
open http://localhost:4873
```

### 4. Create Registry User

```bash
# Exec into the pod
kubectl exec -it -n registry deployment/verdaccio -- sh

# Inside the pod, create htpasswd file with user
npm set registry http://localhost:4873
npm adduser --registry http://localhost:4873

# Enter credentials when prompted:
# Username: admin
# Password: <your-password>
# Email: admin@example.com

# Exit pod
exit
```

## Configuration

### Storage

The default storage size is **10Gi**. To change:

1. Edit `pvc.yaml`:

   ```yaml
   resources:
     requests:
       storage: 50Gi # Increase as needed
   ```

2. For cloud providers, uncomment and set `storageClassName`:

   ```yaml
   storageClassName: standard # GKE
   # storageClassName: gp2       # AWS EKS
   # storageClassName: managed-premium  # Azure AKS
   ```

### Verdaccio Config

Configuration is stored in `configmap.yaml`. Key settings:

- **Authentication**: Uses htpasswd file stored in PVC
- **Package Access**: Authenticated users can publish/access `@apkasten906/*` packages
- **Uplink**: Proxies to npmjs.com for missing packages
- **Max Body Size**: 100MB for package uploads
- **Listen Address**: `0.0.0.0:4873` (required for Kubernetes)

To update configuration:

```bash
# Edit configmap.yaml
kubectl apply -f kubernetes/verdaccio/configmap.yaml

# Restart deployment to pick up changes
kubectl rollout restart deployment/verdaccio -n registry
```

### Istio Configuration

#### VirtualService

- **Hosts**: Accessible via `npm-registry.registry.svc.cluster.local`
- **Timeout**: 60s for package operations
- **Retries**: 3 attempts with 20s per-try timeout
- **Retry Conditions**: Gateway errors, connection failures

#### DestinationRule

- **Connection Pooling**: Max 100 TCP connections, 100 HTTP/2 requests
- **Load Balancing**: Round-robin
- **Circuit Breaker**: Ejects unhealthy instances after 5 consecutive errors

## Usage

### Publishing Packages from CI/CD

Update GitHub Actions workflow to use internal registry:

```yaml
# .github/workflows/publish.yml
env:
  REGISTRY_URL: http://npm-registry.registry.svc.cluster.local:4873
  NPM_AUTH_TOKEN: ${{ secrets.VERDACCIO_TOKEN }}
```

### Local Development with Verdaccio

1. **Port forward** (if outside cluster):

   ```bash
   kubectl port-forward -n registry svc/npm-registry 4873:4873
   ```

2. **Configure npm**:

   ```bash
   # Set registry for scoped packages
   npm config set @apkasten906:registry http://localhost:4873

   # Or create .npmrc
   echo "@apkasten906:registry=http://localhost:4873" >> .npmrc
   ```

3. **Authenticate**:

   ```bash
   npm adduser --registry http://localhost:4873
   ```

4. **Publish packages**:

   ```bash
   # From monorepo root
   DRY_RUN=false \
   REGISTRY_URL=http://localhost:4873 \
   NPM_AUTH_TOKEN=<your-token> \
   node scripts/publish-packages.js
   ```

### Installing Packages

```bash
# Install scoped package from internal registry
npm install @apkasten906/types

# Install public package (proxied from npmjs.com)
npm install express
```

## Security

### Authentication

Verdaccio uses htpasswd authentication:

- Users stored in `/verdaccio/storage/htpasswd` (in PVC)
- Passwords hashed with bcrypt
- JWT tokens expire after 7 days

### Network Security

With Istio:

- mTLS enabled between services (if PeerAuthentication is STRICT)
- Registry only accessible from inside cluster
- No external ingress by default

To restrict access further, create an AuthorizationPolicy:

```yaml
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: npm-registry-authz
  namespace: registry
spec:
  selector:
    matchLabels:
      app: npm-registry
  action: ALLOW
  rules:
    - from:
        - source:
            namespaces: ['default', 'ci-cd'] # Allowed namespaces
```

### Container Security

- Runs as non-root user (10001)
- Read-only root filesystem (where possible)
- Capabilities dropped (ALL)
- Resource limits enforced

## Monitoring

### Prometheus Metrics

Verdaccio exposes metrics at `/-/metrics`:

```bash
# Check metrics endpoint
kubectl port-forward -n registry svc/npm-registry 4873:4873
curl http://localhost:4873/-/metrics
```

### Health Checks

- **Liveness Probe**: `GET /-/ping` (30s initial delay)
- **Readiness Probe**: `GET /-/ping` (10s initial delay)

### Logs

```bash
# Stream logs
kubectl logs -n registry -l app=npm-registry -f

# View last 100 lines
kubectl logs -n registry -l app=npm-registry --tail=100

# Include Istio sidecar logs
kubectl logs -n registry -l app=npm-registry -c istio-proxy -f
```

## Scaling

Current setup uses a single replica due to shared PVC (ReadWriteOnce). For high availability:

### Option 1: ReadWriteMany PVC

Use a storage class that supports RWX (e.g., NFS, EFS, Azure Files):

```yaml
# pvc.yaml
accessModes:
  - ReadWriteMany

# deployment.yaml
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
```

### Option 2: External Storage Backend

Configure Verdaccio to use S3, Google Cloud Storage, or Azure Blob:

```yaml
# configmap.yaml
store:
  s3-storage:
    bucket: verdaccio-packages
    region: us-east-1
    keyPrefix: packages/
```

## Troubleshooting

### Pod Not Starting

```bash
# Check pod events
kubectl describe pod -n registry -l app=npm-registry

# Check PVC binding
kubectl get pvc -n registry

# Check Istio injection
kubectl get namespace registry -o yaml | grep istio-injection
```

### Authentication Issues

```bash
# Check htpasswd file exists
kubectl exec -n registry deployment/verdaccio -- cat /verdaccio/storage/htpasswd

# Create new user
kubectl exec -it -n registry deployment/verdaccio -- npm adduser --registry http://localhost:4873
```

### Package Not Found

```bash
# Check uplink to npmjs.com
kubectl exec -n registry deployment/verdaccio -- ping -c 3 registry.npmjs.org

# Check Verdaccio logs for proxy errors
kubectl logs -n registry -l app=npm-registry | grep -i error
```

### Performance Issues

```bash
# Check resource usage
kubectl top pod -n registry

# Increase resources in deployment.yaml
resources:
  requests:
    memory: "512Mi"
    cpu: "200m"
  limits:
    memory: "1Gi"
    cpu: "1000m"
```

## Cleanup

```bash
# Delete all resources
kubectl delete -f kubernetes/verdaccio/

# Or delete namespace (removes everything)
kubectl delete namespace registry
```

## Advanced Configuration

### Custom Domain with Istio Gateway

```yaml
apiVersion: networking.istio.io/v1beta1
kind: Gateway
metadata:
  name: npm-registry-gateway
  namespace: registry
spec:
  selector:
    istio: ingressgateway
  servers:
    - port:
        number: 80
        name: http
        protocol: HTTP
      hosts:
        - npm.example.com
---
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: npm-registry-external
  namespace: registry
spec:
  hosts:
    - npm.example.com
  gateways:
    - npm-registry-gateway
  http:
    - route:
        - destination:
            host: npm-registry.registry.svc.cluster.local
            port:
              number: 4873
```

### Backup and Restore

```bash
# Backup packages and htpasswd
kubectl cp registry/$(kubectl get pod -n registry -l app=npm-registry -o jsonpath='{.items[0].metadata.name}'):/verdaccio/storage ./verdaccio-backup

# Restore
kubectl cp ./verdaccio-backup registry/$(kubectl get pod -n registry -l app=npm-registry -o jsonpath='{.items[0].metadata.name}'):/verdaccio/storage
```

## Resources

- [Verdaccio Documentation](https://verdaccio.org/docs/what-is-verdaccio)
- [Istio Traffic Management](https://istio.io/latest/docs/concepts/traffic-management/)
- [Kubernetes Persistent Volumes](https://kubernetes.io/docs/concepts/storage/persistent-volumes/)
- [Monorepo Publishing Guide](../../docs/PUBLISHING.md)

## Support

For issues specific to:

- **Verdaccio**: See [Verdaccio GitHub](https://github.com/verdaccio/verdaccio)
- **Istio**: See [Istio Discuss](https://discuss.istio.io/)
- **This setup**: Create an issue in this repository
