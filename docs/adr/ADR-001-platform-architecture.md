# ADR-001: Platform Architecture

## Status
Proposed

## Context
foohut.com is an AI-native documentation platform requiring a scalable, maintainable architecture that supports:
- Real-time collaborative editing
- AI-powered semantic search and RAG
- Bi-directional Git synchronization
- Multi-tenant organization hierarchy
- Custom domain support with SSL

We need to establish clear service boundaries, deployment strategy, and communication patterns that balance development velocity with operational excellence.

## Decision
We will implement a **Modular Monolith** architecture with clear domain boundaries, designed for future service extraction if needed.

### Architecture Style: Modular Monolith
```
+------------------------------------------------------------------+
|                        Load Balancer (Nginx)                      |
|                    (SSL termination, routing)                     |
+------------------------------------------------------------------+
                                |
        +------------------+----+----+------------------+
        |                  |         |                  |
+-------v-------+  +-------v-------+ +-------v-------+  |
|   Frontend    |  |   API Server  | |  Worker Pool  |  |
|  (Vite/React) |  |   (Express)   | | (Bull Queue)  |  |
+---------------+  +-------+-------+ +-------+-------+  |
                           |                 |          |
                   +-------v-----------------v-------+  |
                   |         Domain Modules          |  |
                   |  +----------+ +---------------+ |  |
                   |  | Content  | | Organizations | |  |
                   |  +----------+ +---------------+ |  |
                   |  +----------+ +---------------+ |  |
                   |  |   Auth   | |   Git Sync    | |  |
                   |  +----------+ +---------------+ |  |
                   |  +----------+ +---------------+ |  |
                   |  |    AI    | | Change Req.   | |  |
                   |  +----------+ +---------------+ |  |
                   +----------------+----------------+  |
                                    |                   |
        +---------------------------+-------------------+
        |                           |
+-------v-------+           +-------v-------+
|  PostgreSQL   |           |     Redis     |
| (pgvector)    |           | (Cache/Queue) |
+---------------+           +---------------+
```

### Domain Modules

1. **Content Module** - Pages, blocks, versioning, Markdown serialization
2. **Organizations Module** - Hierarchy (Org > Collection > Space > Page), permissions
3. **Auth Module** - Better-Auth integration, JWT, SSO/SAML
4. **AI Module** - RAG pipeline, embeddings, Claude API
5. **Git Sync Module** - GitHub webhooks, bi-directional sync
6. **Change Request Module** - PR-like workflow for documentation changes

### Service Communication
- **Internal**: Direct function calls within modules via dependency injection
- **Async Jobs**: Bull queue with Redis for background tasks (Git sync, embedding generation, exports)
- **Real-time**: Socket.io for collaborative editing presence

### API Design
RESTful API with consistent patterns:
```
/api/v1/organizations/:orgId
/api/v1/organizations/:orgId/collections/:collectionId
/api/v1/organizations/:orgId/collections/:collectionId/spaces/:spaceId
/api/v1/organizations/:orgId/collections/:collectionId/spaces/:spaceId/pages/:pageId
/api/v1/search
/api/v1/ai/ask
/api/v1/git/sync
```

### Deployment Strategy
```
Production Environment:
+------------------+     +------------------+
|   Vercel Edge    |     |   Railway.app    |
|   (Frontend)     |     |   (API + Worker) |
+------------------+     +------------------+
         |                        |
         +----------+-------------+
                    |
         +----------v-----------+
         |    Neon PostgreSQL   |
         |    (Serverless)      |
         +----------------------+
         |    Upstash Redis     |
         |    (Serverless)      |
         +----------------------+
```

Alternative self-hosted:
- Docker Compose for development
- Kubernetes (k3s) for production with Helm charts

## Consequences

### Positive
- **Faster Development**: Single codebase, shared types, no network overhead between modules
- **Easier Debugging**: Single process, unified logging, simpler traces
- **Lower Operational Complexity**: One deployment unit initially
- **Type Safety**: End-to-end TypeScript with shared domain types
- **Future Flexibility**: Clear module boundaries enable service extraction

### Negative
- **Scaling Constraints**: Must scale entire application together initially
- **Single Point of Failure**: API server failure affects all features
- **Memory Pressure**: All modules share process memory

### Mitigations
- Horizontal scaling with load balancer handles most traffic patterns
- Worker pool isolation prevents long-running jobs from blocking API
- Redis caching reduces database pressure
- Health checks and graceful shutdown enable zero-downtime deploys

## Technical Details

### Project Structure
```
foohut/
├── apps/
│   ├── web/                    # React frontend
│   │   ├── src/
│   │   │   ├── components/
│   │   │   ├── pages/
│   │   │   ├── hooks/
│   │   │   ├── stores/         # Zustand state
│   │   │   └── lib/
│   │   └── vite.config.ts
│   └── api/                    # Express backend
│       ├── src/
│       │   ├── modules/
│       │   │   ├── content/
│       │   │   ├── organizations/
│       │   │   ├── auth/
│       │   │   ├── ai/
│       │   │   ├── git-sync/
│       │   │   └── change-requests/
│       │   ├── shared/
│       │   │   ├── middleware/
│       │   │   ├── database/
│       │   │   └── queue/
│       │   └── index.ts
│       └── tsconfig.json
├── packages/
│   ├── shared-types/           # Shared TypeScript types
│   ├── ui/                     # Shared UI components
│   └── config/                 # Shared configs (ESLint, Prettier)
└── docker/
    ├── docker-compose.yml
    └── Dockerfile
```

### Technology Versions
```json
{
  "node": "20.x LTS",
  "typescript": "5.3+",
  "react": "18.2+",
  "vite": "5.x",
  "express": "4.18+",
  "drizzle-orm": "0.29+",
  "postgresql": "16",
  "redis": "7.x"
}
```

### Cross-Cutting Concerns

**Logging**:
- Structured JSON logging with Pino
- Request ID propagation
- Log levels: error, warn, info, debug

**Error Handling**:
- Domain-specific error classes
- Centralized error middleware
- Client-friendly error responses

**Configuration**:
- Environment variables via dotenv
- Zod schema validation for config
- Separate configs per environment

### Performance Targets
| Metric | Target |
|--------|--------|
| API Response Time (p95) | < 200ms |
| Page Load Time (LCP) | < 2.5s |
| Search Latency | < 500ms |
| Git Sync Latency | < 30s |
| Uptime SLA | 99.9% |

## References
- [Modular Monolith Architecture](https://www.kamilgrzybek.com/blog/posts/modular-monolith-primer)
- [Domain-Driven Design](https://martinfowler.com/bliki/DomainDrivenDesign.html)
- [The Twelve-Factor App](https://12factor.net/)
