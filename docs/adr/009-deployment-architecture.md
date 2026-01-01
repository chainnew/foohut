# ADR-009: Deployment Architecture

## Status
Accepted

## Date
2025-12-31

## Context

Foohut requires a robust, scalable, and secure deployment architecture that supports:
- Continuous integration and deployment
- Multiple environments (development, staging, production)
- Zero-downtime deployments
- Easy rollbacks
- Comprehensive monitoring and logging
- Cost-effective scaling

## Decision

We will implement a containerized deployment architecture using Kubernetes (EKS) with the following components:

### Container Orchestration Strategy

**Kubernetes (Amazon EKS)** was chosen as the container orchestration platform because:
1. Industry-standard orchestration with mature ecosystem
2. Native support in all major cloud providers
3. Declarative configuration with GitOps compatibility
4. Built-in service discovery and load balancing
5. Horizontal pod autoscaling
6. Rolling updates with automatic rollback

### Architecture Overview

```
                                    ┌─────────────────────────────────────────┐
                                    │           AWS Cloud                      │
                                    │                                          │
    ┌──────────┐                   │  ┌────────────────────────────────────┐ │
    │  Users   │───────────────────│──│         CloudFront CDN             │ │
    └──────────┘                   │  └────────────────────────────────────┘ │
                                    │                    │                     │
                                    │  ┌─────────────────┴──────────────────┐ │
                                    │  │         Application Load Balancer   │ │
                                    │  └─────────────────┬──────────────────┘ │
                                    │                    │                     │
                                    │  ┌─────────────────────────────────────┐│
                                    │  │           EKS Cluster               ││
                                    │  │  ┌────────────┐  ┌────────────┐    ││
                                    │  │  │  Backend   │  │  Frontend  │    ││
                                    │  │  │   Pods     │  │   Pods     │    ││
                                    │  │  └────────────┘  └────────────┘    ││
                                    │  └─────────────────────────────────────┘│
                                    │                    │                     │
                                    │  ┌─────────────────┴──────────────────┐ │
                                    │  │    RDS PostgreSQL  │  ElastiCache  │ │
                                    │  │    (pgvector)      │  (Redis)      │ │
                                    │  └────────────────────────────────────┘ │
                                    └─────────────────────────────────────────┘
```

### Environment Management

#### Development Environment
- Local Docker Compose setup
- PostgreSQL with pgvector
- Redis for caching
- Hot reload enabled
- Debug ports exposed

#### Staging Environment
- Mirrors production architecture
- Deployed on every push to `main`
- Used for integration testing
- Accessible at `staging.foohut.com`

#### Production Environment
- Multi-AZ deployment for high availability
- Deployed on release tags
- Canary deployments for safety
- Accessible at `foohut.com`

### Deployment Strategy

**Canary Deployments** for production:
1. Deploy new version to 10% of pods (canary)
2. Monitor error rates and latency for 5 minutes
3. If metrics are healthy, promote to full deployment
4. If issues detected, automatic rollback

**Rolling Updates** for staging:
1. Update pods incrementally
2. Wait for each pod to be healthy before proceeding
3. Automatic rollback on failure

### Secret Management

**AWS Secrets Manager** + **Kubernetes Secrets**:

```yaml
# Secrets hierarchy
├── AWS Secrets Manager (source of truth)
│   ├── foohut/production/database
│   ├── foohut/production/jwt
│   ├── foohut/staging/database
│   └── foohut/staging/jwt
└── Kubernetes Secrets (synced via External Secrets Operator)
    ├── database-credentials
    ├── jwt-secrets
    └── third-party-api-keys
```

**Secret Rotation**:
- Database credentials rotated every 30 days
- JWT secrets rotated every 90 days
- API keys rotated on demand

**Environment Variables**:
- Non-sensitive config stored in ConfigMaps
- Sensitive data in Secrets
- Never committed to version control

### Monitoring and Logging Approach

#### Metrics (Prometheus + Grafana)
- Application metrics (request rate, latency, errors)
- Infrastructure metrics (CPU, memory, disk)
- Business metrics (user signups, conversions)
- Custom dashboards per service

#### Logging (CloudWatch + OpenSearch)
- Structured JSON logging
- Log levels: ERROR, WARN, INFO, DEBUG
- Centralized log aggregation
- 30-day retention in hot storage
- 1-year retention in cold storage

#### Tracing (AWS X-Ray)
- Distributed tracing across services
- Request correlation IDs
- Performance bottleneck identification

#### Alerting (PagerDuty)
- Critical alerts: immediate page
- Warning alerts: Slack notification
- Info alerts: daily digest

**Alert Categories**:
| Severity | Response Time | Examples |
|----------|--------------|----------|
| Critical | 5 minutes | Service down, >5% error rate |
| High | 30 minutes | High latency, low disk space |
| Medium | 4 hours | Elevated error rate |
| Low | Next business day | Performance degradation |

### Infrastructure as Code

**Terraform** for cloud infrastructure:
```
infrastructure/
├── modules/
│   ├── eks/
│   ├── rds/
│   ├── elasticache/
│   └── networking/
├── environments/
│   ├── staging/
│   └── production/
└── global/
    ├── iam/
    └── dns/
```

**Helm** for Kubernetes resources:
```
k8s/
├── charts/
│   ├── foohut-backend/
│   └── foohut-frontend/
├── values/
│   ├── staging.yaml
│   └── production.yaml
└── base/
    ├── namespace.yaml
    └── network-policies.yaml
```

### Rollback Strategy

**Automatic Rollback** triggers:
1. Health check failures (3 consecutive)
2. Error rate exceeds 5% for 2 minutes
3. P99 latency exceeds 2 seconds

**Manual Rollback** process:
```bash
# Via kubectl
kubectl rollout undo deployment/foohut-backend -n foohut-production

# Via GitHub Actions (workflow dispatch)
gh workflow run cd.yml -f rollback=true
```

**Database Rollback**:
- Migrations are reversible by default
- Point-in-time recovery enabled (35 days)
- Pre-deployment backups to S3

### Scaling Strategy

**Horizontal Pod Autoscaler**:
```yaml
minReplicas: 3
maxReplicas: 20
metrics:
  - type: Resource
    resource:
      name: cpu
      targetAverageUtilization: 70
  - type: Resource
    resource:
      name: memory
      targetAverageUtilization: 80
```

**Cluster Autoscaler**:
- Node groups scale based on pending pods
- Min: 3 nodes, Max: 20 nodes
- Scale-down delay: 10 minutes

### Security Measures

1. **Network Security**
   - VPC with private subnets for workloads
   - Network policies restricting pod-to-pod traffic
   - WAF in front of ALB

2. **Container Security**
   - Non-root containers
   - Read-only root filesystem
   - Trivy scanning in CI/CD
   - Signed container images

3. **Access Control**
   - RBAC for Kubernetes access
   - IAM roles for service accounts (IRSA)
   - Principle of least privilege

4. **Compliance**
   - Audit logging enabled
   - Encryption at rest and in transit
   - Regular security assessments

## Consequences

### Positive
- High availability with multi-AZ deployment
- Zero-downtime deployments with canary strategy
- Comprehensive observability
- Automated scaling based on demand
- Quick rollback capabilities
- Infrastructure as code for reproducibility

### Negative
- Kubernetes learning curve for team
- Higher operational complexity
- Cloud vendor lock-in (AWS specific services)
- Cost overhead for monitoring stack

### Mitigations
- Team training on Kubernetes and AWS
- Runbooks for common operations
- Cost alerts and budget monitoring
- Abstract cloud-specific services where possible

## References

- [Kubernetes Best Practices](https://kubernetes.io/docs/concepts/cluster-administration/)
- [AWS EKS Documentation](https://docs.aws.amazon.com/eks/)
- [12-Factor App Methodology](https://12factor.net/)
- [GitOps Principles](https://opengitops.dev/)
