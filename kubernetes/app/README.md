# Application Kubernetes Templates

This directory contains base Kubernetes templates for the reusable application shell. They are intentionally generic: adopters should set image names, secrets, hostnames, autoscaling, and deployment policy in their own overlays.

## Apply

```bash
kubectl apply -k kubernetes/app
```

The templates include backend and frontend Deployments, ClusterIP Services, a shared ConfigMap, an example Secret, health probes, resource requests and limits, and basic pod/container hardening.
