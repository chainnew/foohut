# ADR-007: API Design Decisions

## Status
Accepted

## Date
2024-12-31

## Context
Foohut is an AI-native documentation platform requiring a comprehensive REST API to support:
- Hierarchical content organization (Organization > Collection > Space > Page > Block)
- Block-based content editing
- Git repository synchronization
- AI-powered features (semantic search, content generation, suggestions)
- Collaborative editing through change requests
- Role-based access control

This ADR documents the key API design decisions for the Foohut platform.

## Decisions

### 1. OpenAPI Version: 3.1.0

**Decision**: Use OpenAPI 3.1.0 specification.

**Rationale**:
- Full JSON Schema compatibility (draft 2020-12)
- Native `null` type support
- Better `oneOf`/`anyOf` handling for block content polymorphism
- `description` field in `$ref` objects
- Modern tooling support

### 2. Authentication: JWT with Refresh Tokens

**Decision**: Use JWT Bearer authentication with short-lived access tokens and longer-lived refresh tokens.

**Implementation**:
- Access token: 15-minute expiration
- Refresh token: 7-day expiration
- Tokens stored client-side
- Refresh endpoint for seamless token renewal

**Rationale**:
- Stateless authentication scales horizontally
- Short access token lifetime limits exposure if compromised
- Refresh tokens provide good UX without frequent re-authentication
- Standard approach with excellent library support

**Security Considerations**:
- Refresh tokens should be rotated on use
- Implement token revocation for logout
- Use secure, httpOnly cookies for web clients when possible

### 3. Pagination: Cursor-Based

**Decision**: Use cursor-based pagination instead of offset-based.

**Implementation**:
```json
{
  "items": [...],
  "pagination": {
    "cursor": "eyJpZCI6IjEyMyIsInQiOjE2NzA5NDM2MDB9",
    "hasMore": true,
    "total": 150
  }
}
```

**Rationale**:
- Consistent results when data changes between requests
- Better performance for large datasets (no counting offsets)
- Handles real-time content updates gracefully
- Prevents "page drift" issues

**Trade-offs**:
- Cannot jump to arbitrary pages
- Slightly more complex client implementation
- Cursor opacity limits debugging

### 4. Resource Hierarchy in URLs

**Decision**: Use nested routes for parent-child relationships, flat routes for direct access.

**Implementation**:
```
# Nested (creation and listing)
GET  /organizations/{orgId}/collections
POST /organizations/{orgId}/collections

# Flat (direct access)
GET   /collections/{collectionId}
PATCH /collections/{collectionId}
DELETE /collections/{collectionId}
```

**Rationale**:
- Nested routes make ownership explicit during creation
- Flat routes simplify direct resource access
- Reduces URL length for deeply nested resources
- Easier caching with shorter URLs

### 5. Block Content Polymorphism

**Decision**: Use a flexible block schema with type-specific content and properties.

**Implementation**:
```yaml
Block:
  type: object
  properties:
    id:
      type: string
    type:
      enum: [paragraph, heading, code, ...]
    content:
      oneOf:
        - type: string
        - type: object
        - type: array
    properties:
      type: object
      additionalProperties: true
    children:
      type: array
      items:
        $ref: '#/components/schemas/Block'
```

**Rationale**:
- Supports diverse block types without schema explosion
- `additionalProperties` allows type-specific metadata
- Nested children support for lists, toggles, tables
- Flexible enough for future block types

### 6. Versioning Strategy

**Decision**: URL path versioning (v1) with content versioning for pages.

**Implementation**:
- API versioning: `/v1/...`
- Page versioning: Integer version numbers with conflict detection

**Rationale**:
- URL versioning is explicit and cacheable
- Integer versions are simple and sortable
- Base version in updates enables optimistic locking

### 7. Error Response Format

**Decision**: Consistent error envelope with structured details.

**Implementation**:
```json
{
  "error": {
    "code": "BAD_REQUEST",
    "message": "Validation failed",
    "details": [
      {"field": "email", "message": "Invalid email format"}
    ],
    "requestId": "req_abc123"
  }
}
```

**Rationale**:
- Programmatic error codes for client handling
- Human-readable messages for debugging
- Field-level details for form validation
- Request ID enables support correlation

### 8. Rate Limiting

**Decision**: Implement rate limiting with standard headers.

**Headers**:
- `X-RateLimit-Limit`: Requests per window
- `X-RateLimit-Remaining`: Remaining requests
- `X-RateLimit-Reset`: Unix timestamp of reset
- `Retry-After`: Seconds until retry (on 429)

**Rationale**:
- Industry standard headers
- Enables client-side rate management
- `Retry-After` for immediate retry guidance
- Different limits per tier (free/pro/enterprise)

### 9. AI Endpoints as POST

**Decision**: Use POST for all AI operations, even search.

**Implementation**:
```
POST /ai/search
POST /ai/generate
POST /ai/suggest
```

**Rationale**:
- Complex request bodies exceed URL length limits
- AI operations have side effects (usage tracking, model invocation)
- Not cacheable anyway due to dynamic nature
- Consistent pattern across AI features

### 10. Git Sync as Async Operation

**Decision**: Trigger sync returns immediately with status tracking.

**Implementation**:
```
POST /spaces/{spaceId}/sync -> 202 Accepted
{
  "syncId": "uuid",
  "status": "pending"
}

GET /spaces/{spaceId}/git/status -> Current state
```

**Rationale**:
- Git operations can be slow (network, large repos)
- Prevents HTTP timeout issues
- Client can poll or receive webhooks
- Better UX for long-running operations

### 11. Change Request Workflow

**Decision**: GitHub PR-inspired change request system.

**Features**:
- Branches (source/target)
- Reviewers with status
- Merge strategies (merge, squash, rebase)
- Conflict detection

**Rationale**:
- Familiar workflow for developers
- Supports collaborative editing
- Integrates naturally with Git sync
- Enables content review before publication

### 12. Block Operations for Batch Updates

**Decision**: Support batch block operations with operation types.

**Implementation**:
```json
{
  "operations": [
    {"operation": "insert", "block": {...}, "afterBlockId": "..."},
    {"operation": "update", "blockId": "...", "block": {...}},
    {"operation": "delete", "blockId": "..."},
    {"operation": "move", "blockId": "...", "afterBlockId": "..."}
  ],
  "baseVersion": 5
}
```

**Rationale**:
- Reduces HTTP roundtrips
- Atomic updates for complex edits
- Supports optimistic locking
- Enables undo/redo implementation

## Consequences

### Positive
- Clean, consistent API design
- Scalable authentication pattern
- Flexible content model for future expansion
- Good developer experience with standard patterns

### Negative
- Cursor pagination complexity for simple use cases
- Block polymorphism requires client-side handling
- Async operations need polling or webhooks

### Neutral
- Standard trade-offs between REST constraints and practical needs
- Some complexity in exchange for flexibility

## References
- OpenAPI 3.1.0 Specification: https://spec.openapis.org/oas/v3.1.0
- JSON Schema Draft 2020-12: https://json-schema.org/draft/2020-12/json-schema-core.html
- RFC 7807 (Problem Details): https://tools.ietf.org/html/rfc7807
- GitHub REST API: https://docs.github.com/en/rest
- GitBook API: https://developer.gitbook.com/

## Appendix: Endpoint Summary

### Authentication (4 endpoints)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /auth/register | Register new user |
| POST | /auth/login | Authenticate user |
| POST | /auth/logout | End session |
| POST | /auth/refresh | Refresh access token |

### Users (3 endpoints)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /users/me | Get current user |
| PATCH | /users/me | Update current user |
| GET | /users/{userId} | Get user by ID |

### Organizations (9 endpoints)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /organizations | List organizations |
| POST | /organizations | Create organization |
| GET | /organizations/{orgId} | Get organization |
| PATCH | /organizations/{orgId} | Update organization |
| DELETE | /organizations/{orgId} | Delete organization |
| GET | /organizations/{orgId}/members | List members |
| POST | /organizations/{orgId}/members | Add member |
| PATCH | /organizations/{orgId}/members/{userId} | Update member role |
| DELETE | /organizations/{orgId}/members/{userId} | Remove member |
| GET | /organizations/{orgId}/settings | Get settings |
| PATCH | /organizations/{orgId}/settings | Update settings |

### Collections (5 endpoints)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /organizations/{orgId}/collections | List collections |
| POST | /organizations/{orgId}/collections | Create collection |
| GET | /collections/{collectionId} | Get collection |
| PATCH | /collections/{collectionId} | Update collection |
| DELETE | /collections/{collectionId} | Delete collection |

### Spaces (8 endpoints)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /collections/{collectionId}/spaces | List spaces |
| POST | /collections/{collectionId}/spaces | Create space |
| GET | /spaces/{spaceId} | Get space |
| PATCH | /spaces/{spaceId} | Update space |
| DELETE | /spaces/{spaceId} | Delete space |
| GET | /spaces/{spaceId}/git-config | Get Git config |
| PATCH | /spaces/{spaceId}/git-config | Update Git config |
| POST | /spaces/{spaceId}/sync | Trigger Git sync |

### Pages (8 endpoints)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /spaces/{spaceId}/pages | List pages |
| POST | /spaces/{spaceId}/pages | Create page |
| GET | /pages/{pageId} | Get page |
| PATCH | /pages/{pageId} | Update page |
| DELETE | /pages/{pageId} | Delete page |
| GET | /pages/{pageId}/content | Get page content |
| PATCH | /pages/{pageId}/content | Update page content |
| GET | /pages/{pageId}/versions | List page versions |
| POST | /pages/{pageId}/publish | Publish page |

### Blocks (5 endpoints)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /pages/{pageId}/blocks | Get page blocks |
| PATCH | /pages/{pageId}/blocks | Batch update blocks |
| POST | /pages/{pageId}/blocks | Add block |
| GET | /blocks/{blockId} | Get block |
| PATCH | /blocks/{blockId} | Update block |
| DELETE | /blocks/{blockId} | Delete block |

### Change Requests (5 endpoints)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /spaces/{spaceId}/change-requests | List change requests |
| POST | /spaces/{spaceId}/change-requests | Create change request |
| GET | /change-requests/{crId} | Get change request |
| PATCH | /change-requests/{crId} | Update change request |
| DELETE | /change-requests/{crId} | Close change request |
| POST | /change-requests/{crId}/merge | Merge change request |

### AI Features (3 endpoints)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /ai/search | Semantic search |
| POST | /ai/generate | Content generation |
| POST | /ai/suggest | Content suggestions |

### Git Sync (2 endpoints)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /webhooks/github | GitHub webhook |
| GET | /spaces/{spaceId}/git/status | Get Git status |

**Total: 52 endpoints**
