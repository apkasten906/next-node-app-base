@wip
Feature: Kubernetes and DevOps Infrastructure
  As a DevOps engineer
  We need Kubernetes deployment and CI/CD pipelines
  So that we can deploy and scale applications reliably

  Background:
    Given Kubernetes cluster is available
    And DevOps tools are configured

  @k8s @deployment
  Scenario: Kubernetes deployment manifest
    Given a Kubernetes deployment manifest exists
    When I apply the deployment
    Then pods should be created
    And desired replica count should be met
    And containers should be running

  @k8s @service
  Scenario: Kubernetes service for load balancing
    Given a Kubernetes service is defined
    When the service is created
    Then a cluster IP should be assigned
    And traffic should be load-balanced across pods
    And service discovery should work

  @k8s @ingress
  Scenario: Ingress controller for external access
    Given an Ingress resource is configured
    When I access the application via domain
    Then traffic should be routed to correct service
    And TLS termination should work
    And HTTP to HTTPS redirect should work

  @k8s @configmap
  Scenario: ConfigMap for configuration management
    Given a ConfigMap with application config
    When pods are deployed
    Then configuration should be injected as env vars
    And pods should use the configuration
    When ConfigMap is updated
    Then pods should be restarted with new config

  @k8s @secrets
  Scenario: Kubernetes Secrets for sensitive data
    Given secrets are stored in Kubernetes Secrets
    When pods are deployed
    Then secrets should be injected securely
    And secrets should not be visible in pod spec
    And secrets should be encrypted at rest

  @k8s @hpa
  Scenario: Horizontal Pod Autoscaler
    Given HPA is configured for the deployment
    And target CPU utilization is 70%
    When CPU usage exceeds 70%
    Then additional pods should be created
    When CPU usage drops below 70%
    Then excess pods should be terminated

  @k8s @vpa
  Scenario: Vertical Pod Autoscaler
    Given VPA is configured
    When pod resource usage is monitored
    Then VPA should recommend resource limits
    And pods should be updated with new limits

  @k8s @resource-limits
  Scenario: Resource requests and limits
    Given pods have resource limits defined
    Then each pod should have:
      | resource     | request | limit |
      | cpu          | 100m    | 500m  |
      | memory       | 128Mi   | 512Mi |
    And pods should not exceed limits
    And resource requests should be guaranteed

  @k8s @health-probes
  Scenario: Liveness and readiness probes
    Given health probes are configured
    When a pod starts
    Then readiness probe should prevent traffic until ready
    When a pod becomes unhealthy
    Then liveness probe should restart the pod

  @k8s @rolling-update
  Scenario: Rolling update deployment strategy
    Given a new version is ready to deploy
    When I update the deployment
    Then pods should be updated gradually
    And old pods should be terminated only after new pods are ready
    And zero downtime should be achieved

  @k8s @rollback
  Scenario: Deployment rollback
    Given a new deployment caused issues
    When I rollback the deployment
    Then previous revision should be restored
    And problematic pods should be replaced
    And service should return to normal

  @k8s @persistent-volume
  Scenario: Persistent Volume for stateful data
    Given a PersistentVolumeClaim is defined
    When a pod mounts the PVC
    Then data should persist across pod restarts
    And volume should be provisioned dynamically

  @k8s @statefulset
  Scenario: StatefulSet for stateful applications
    Given a StatefulSet is configured for database
    When StatefulSet is deployed
    Then pods should have stable network identities
    And pods should have persistent storage
    And pods should be created/deleted in order

  @k8s @network-policy
  Scenario: Network policies for pod communication
    Given NetworkPolicies are defined
    Then pod-to-pod communication should be restricted
    And only allowed traffic should pass
    And unauthorized traffic should be blocked

  @k8s @monitoring
  Scenario: Kubernetes metrics with Prometheus
    Given Prometheus is deployed in cluster
    When I query Kubernetes metrics
    Then pod metrics should be available
    And node metrics should be available
    And cluster metrics should be available

  @cicd @github-actions
  Scenario: GitHub Actions CI/CD pipeline
    Given GitHub Actions workflow is configured
    When I push code to repository
    Then CI pipeline should trigger
    And tests should run
    And build should occur
    When tests pass
    Then Docker image should be built
    And image should be pushed to registry

  @cicd @github-actions @impl_workflow_lint_actionlint
  @ready
  Scenario: Workflow linting is wired with actionlint
    Given workflow lint tooling is present
    Then root package.json should expose a workflows lint command
    And a workflow-lint GitHub Actions workflow should exist
    And the workflow-lint workflow should run actionlint

  @cicd @build @impl_docker_multistage_build
  @ready
  Scenario: Multi-stage Docker build
    Given a multi-stage Dockerfile exists
    When I build the Docker image
    Then build should use caching
    And final image should be optimized
    And image size should be minimal

  @k8s @verdaccio @impl_verdaccio_k8s_manifests
  @ready
  Scenario: Verdaccio in-cluster registry manifests are present
    Given Verdaccio Kubernetes manifests are available
    Then Verdaccio manifests should include a Deployment, Service, PVC, and ConfigMap
    And Verdaccio manifests should include Istio traffic management
    And Verdaccio manifests should include basic security hardening

  @docker @compose @impl_docker_compose_dev
  @ready
  Scenario: Docker Compose development environment is configured
    Given Docker Compose configuration exists
    Then the Compose file should define required services
    And backend service should build from the backend Dockerfile
    And frontend service should build from the frontend Dockerfile

  @cicd @test-stage
  Scenario: CI pipeline test stage
    Given CI pipeline has test stage
    When tests run in CI
    Then unit tests should execute
    And integration tests should execute
    And coverage report should be generated
    And test results should be published

  @cicd @security-scan
  Scenario: Container security scanning
    Given security scanning is enabled in CI
    When Docker image is built
    Then image should be scanned for vulnerabilities
    And high-severity vulnerabilities should fail the build
    And scan report should be archived

  @cicd @deploy-staging
  Scenario: Automated deployment to staging
    Given tests pass in CI
    When deployment stage runs
    Then application should deploy to staging cluster
    And smoke tests should run against staging
    And staging should be validated

  @cicd @deploy-production
  Scenario: Production deployment with approval
    Given staging deployment succeeded
    When production deployment is triggered
    Then manual approval should be required
    When the deployment is approved
    Then application should deploy to production
    And health checks should verify deployment

  @cicd @canary-deployment
  Scenario: Canary deployment strategy - healthy metrics
    Given canary deployment is configured
    When new version is deployed
    Then 10% of traffic should go to new version
    And metrics should be monitored
    When metrics are healthy
    Then traffic should gradually shift to 100%

  @cicd @canary-deployment
  Scenario: Canary deployment strategy - unhealthy metrics
    Given canary deployment is configured
    When new version is deployed
    Then 10% of traffic should go to new version
    And metrics should be monitored
    When metrics show issues
    Then rollback should occur

  @cicd @blue-green
  Scenario: Blue-green deployment
    Given blue environment is running
    When green environment is deployed
    Then both environments should run in parallel
    And tests should run against green
    When green is validated
    Then traffic should switch to green
    And blue should be kept for rollback

  @cicd @gitops
  Scenario: GitOps with ArgoCD/FluxCD
    Given GitOps is configured
    When I commit to Git repository
    Then GitOps controller should detect changes
    And cluster state should sync with Git
    And deployments should be automated

  @cicd @secrets-management
  Scenario: Secrets management in CI/CD
    Given secrets are stored in vault
    When CI/CD pipeline runs
    Then secrets should be injected securely
    And secrets should never be logged
    And secrets should be rotated regularly

  @cicd @notifications
  Scenario: Build and deployment notifications
    Given notification integrations are configured
    When build fails
    Then team should be notified via Slack
    When deployment succeeds
    Then notification should be sent
    When deployment fails
    Then on-call engineer should be paged

  @k8s @service-mesh
  Scenario: Service mesh with Istio/Linkerd
    Given service mesh is deployed
    When services communicate
    Then traffic should be encrypted (mTLS)
    And traffic should be observable
    And circuit breaking should be available
    And retries should be automatic

  @k8s @operator
  Scenario: Kubernetes operator for custom resources
    Given a custom operator is deployed
    When I create a custom resource
    Then operator should reconcile the resource
    And desired state should be achieved
    And operator should handle updates

  @k8s @backup
  Scenario: Cluster backup and restore
    Given backup solution is configured
    When backup is triggered
    Then all resources should be backed up
    And PersistentVolumes should be snapshotted
    When disaster occurs
    Then cluster should be restorable from backup

  @k8s @cost-optimization
  Scenario: Resource cost monitoring
    Given cost monitoring is enabled
    When I view cost reports
    Then cost per namespace should be shown
    And resource utilization should be analyzed
    And cost optimization recommendations should be provided
