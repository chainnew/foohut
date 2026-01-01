# ADR-003: Authentication and Authorization

## Status
Proposed

## Context
foohut.com requires a robust authentication system supporting:
- Email/password authentication for individual users
- SSO/SAML integration for enterprise organizations
- JWT-based API authentication
- Role-based access control (RBAC) with five tiers
- Multi-tenant organization isolation
- Session management across web and API clients

We need a solution that balances security, developer experience, and extensibility.

## Decision
We will use **Better-Auth** as the authentication framework with **JWT** access tokens and **HTTP-only cookie** refresh tokens, supporting both standard and SSO authentication flows.

### Authentication Architecture
```
+------------------------------------------------------------------+
|                      Authentication Flow                          |
+------------------------------------------------------------------+

Standard Login:
+--------+     +-------------+     +-------------+     +-----------+
| Client | --> | Login Form  | --> | Better-Auth | --> | Database  |
+--------+     +-------------+     +-------------+     +-----------+
    ^                                    |
    |          +--------------+          |
    +--------- | JWT + Cookie | <--------+
               +--------------+

SSO/SAML Login:
+--------+     +-------------+     +-------------+     +-----------+
| Client | --> | SSO Button  | --> | IdP (Okta,  | --> | SAML      |
+--------+     +-------------+     | Azure AD)   |     | Response  |
    ^                              +-------------+     +-----------+
    |                                                       |
    |          +--------------+     +-------------+         |
    +--------- | JWT + Cookie | <-- | Better-Auth | <-------+
               +--------------+     +-------------+
```

### Better-Auth Configuration
```typescript
// lib/auth.ts
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { jwt, magicLink, saml } from 'better-auth/plugins';
import { db } from './db';

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
  }),

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    minPasswordLength: 12,
  },

  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24,     // Update session every 24 hours
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5, // 5 minute cookie cache
    },
  },

  plugins: [
    jwt({
      jwt: {
        expiresIn: '15m',        // Short-lived access tokens
        issuer: 'foohut.com',
      },
      refreshToken: {
        expiresIn: '7d',
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
      },
    }),

    magicLink({
      sendMagicLink: async ({ email, url }) => {
        await sendEmail({
          to: email,
          subject: 'Sign in to foohut',
          template: 'magic-link',
          data: { url },
        });
      },
    }),

    saml({
      // Enterprise SSO configuration
      callbackUrl: '/api/auth/saml/callback',
      metadataUrl: '/api/auth/saml/metadata',
    }),
  ],

  // Custom hooks for organization context
  hooks: {
    after: {
      signIn: async ({ user, session }) => {
        // Load user's organization memberships into session
        const memberships = await loadUserMemberships(user.id);
        return { user, session, memberships };
      },
    },
  },
});
```

### JWT Token Structure
```typescript
// Access Token Payload
interface AccessTokenPayload {
  sub: string;           // User ID
  email: string;
  name: string;
  iat: number;           // Issued at
  exp: number;           // Expiration
  iss: string;           // Issuer (foohut.com)
  org?: string;          // Current organization context
  role?: UserRole;       // Role in current org
}

// Token sizes
// Access Token: ~500 bytes (compact, frequent transmission)
// Refresh Token: ~200 bytes (HTTP-only cookie)
```

### Role-Based Access Control (RBAC)

#### Role Hierarchy
```
Administrator (5)
    └── Creator (4)
        └── Editor (3)
            └── Commenter (2)
                └── Visitor (1)
```

#### Permission Matrix
```typescript
// types/permissions.ts
export const PERMISSIONS = {
  // Organization level
  'org:manage': ['administrator'],
  'org:invite': ['administrator', 'creator'],
  'org:billing': ['administrator'],

  // Collection level
  'collection:create': ['administrator', 'creator'],
  'collection:edit': ['administrator', 'creator'],
  'collection:delete': ['administrator'],
  'collection:view': ['administrator', 'creator', 'editor', 'commenter', 'visitor'],

  // Space level
  'space:create': ['administrator', 'creator'],
  'space:edit': ['administrator', 'creator', 'editor'],
  'space:delete': ['administrator', 'creator'],
  'space:view': ['administrator', 'creator', 'editor', 'commenter', 'visitor'],

  // Page level
  'page:create': ['administrator', 'creator', 'editor'],
  'page:edit': ['administrator', 'creator', 'editor'],
  'page:delete': ['administrator', 'creator'],
  'page:publish': ['administrator', 'creator'],
  'page:view': ['administrator', 'creator', 'editor', 'commenter', 'visitor'],

  // Change Request level
  'cr:create': ['administrator', 'creator', 'editor'],
  'cr:review': ['administrator', 'creator'],
  'cr:merge': ['administrator', 'creator'],
  'cr:comment': ['administrator', 'creator', 'editor', 'commenter'],

  // Comment level
  'comment:create': ['administrator', 'creator', 'editor', 'commenter'],
  'comment:edit': ['administrator', 'creator', 'editor', 'commenter'], // Own only
  'comment:delete': ['administrator', 'creator'],
} as const;

export type Permission = keyof typeof PERMISSIONS;
export type UserRole = 'administrator' | 'creator' | 'editor' | 'commenter' | 'visitor';
```

### Authorization Middleware
```typescript
// middleware/authorize.ts
import { Request, Response, NextFunction } from 'express';
import { Permission, PERMISSIONS } from '../types/permissions';
import { db } from '../db';
import { memberships } from '../schema';

export function authorize(permission: Permission) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user?.id;
    const orgId = req.params.orgId || req.query.orgId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get user's role in this organization
    const membership = await db.query.memberships.findFirst({
      where: and(
        eq(memberships.userId, userId),
        eq(memberships.organizationId, orgId)
      ),
    });

    if (!membership) {
      return res.status(403).json({ error: 'Not a member of this organization' });
    }

    // Check if role has permission
    const allowedRoles = PERMISSIONS[permission];
    if (!allowedRoles.includes(membership.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    // Attach membership to request for downstream use
    req.membership = membership;
    next();
  };
}

// Usage in routes
router.post(
  '/organizations/:orgId/collections',
  authenticate,
  authorize('collection:create'),
  createCollectionHandler
);
```

### SSO/SAML Integration Points
```typescript
// config/sso.ts
export interface SSOConfig {
  provider: 'okta' | 'azure-ad' | 'google-workspace' | 'onelogin' | 'custom';
  entityId: string;
  ssoUrl: string;
  certificate: string;
  attributeMapping: {
    email: string;
    firstName: string;
    lastName: string;
    groups?: string;
  };
  jitProvisioning: boolean;  // Just-in-time user creation
  defaultRole: UserRole;
  groupRoleMapping?: Record<string, UserRole>;
}

// Organization SSO settings stored in organizations.settings JSONB
interface OrganizationSettings {
  sso?: {
    enabled: boolean;
    config: SSOConfig;
    enforced: boolean;  // Require SSO for all users
    allowedDomains: string[];  // Email domains allowed
  };
}
```

### API Authentication Flow
```typescript
// middleware/authenticate.ts
import { auth } from '../lib/auth';

export async function authenticate(req: Request, res: Response, next: NextFunction) {
  // Try JWT from Authorization header first (API clients)
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    try {
      const payload = await auth.api.verifyToken({ token });
      req.user = payload;
      return next();
    } catch (error) {
      return res.status(401).json({ error: 'Invalid token' });
    }
  }

  // Fall back to session cookie (web clients)
  const session = await auth.api.getSession({ headers: req.headers });
  if (session) {
    req.user = session.user;
    return next();
  }

  return res.status(401).json({ error: 'Authentication required' });
}
```

### Security Headers and CSRF Protection
```typescript
// middleware/security.ts
import helmet from 'helmet';
import csrf from 'csurf';

export const securityMiddleware = [
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],  // Required for Vite HMR in dev
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'", 'https://api.anthropic.com'],
      },
    },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  }),

  csrf({
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    },
  }),
];
```

## Consequences

### Positive
- **Developer Experience**: Better-Auth provides batteries-included auth with minimal config
- **Security**: HTTP-only cookies prevent XSS token theft; short JWT expiry limits damage
- **Enterprise Ready**: SAML support enables enterprise SSO without custom implementation
- **Scalability**: Stateless JWT verification scales horizontally
- **Flexibility**: Plugin architecture allows adding OAuth providers easily

### Negative
- **Token Refresh Complexity**: Requires client-side logic for token refresh
- **Session Revocation**: JWT revocation requires allowlist/blocklist management
- **SAML Complexity**: Enterprise SSO requires per-customer configuration

### Mitigations
- Implement automatic token refresh in API client wrapper
- Use Redis for JWT blocklist with TTL matching token expiry
- Build SSO configuration wizard in admin panel

## Technical Details

### Database Schema for Auth
```sql
-- Better-Auth managed tables (auto-generated)
CREATE TABLE auth_users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  email_verified BOOLEAN DEFAULT false,
  name VARCHAR(255),
  image VARCHAR(500),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE auth_sessions (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
  token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE auth_accounts (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
  provider VARCHAR(50) NOT NULL,  -- 'email', 'saml', 'google', etc.
  provider_account_id VARCHAR(255) NOT NULL,
  access_token TEXT,
  refresh_token TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(provider, provider_account_id)
);

-- Custom extension for SAML configs
CREATE TABLE sso_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  provider VARCHAR(50) NOT NULL,
  entity_id VARCHAR(255) NOT NULL,
  sso_url VARCHAR(500) NOT NULL,
  certificate TEXT NOT NULL,
  attribute_mapping JSONB NOT NULL,
  jit_provisioning BOOLEAN DEFAULT true,
  default_role VARCHAR(20) DEFAULT 'visitor',
  group_role_mapping JSONB,
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id)
);
```

### Frontend Auth Integration
```typescript
// hooks/useAuth.ts
import { createAuthClient } from 'better-auth/react';

const authClient = createAuthClient({
  baseURL: '/api/auth',
});

export function useAuth() {
  const { data: session, isPending, error, refetch } = authClient.useSession();

  return {
    user: session?.user ?? null,
    isLoading: isPending,
    isAuthenticated: !!session?.user,
    signIn: authClient.signIn,
    signOut: authClient.signOut,
    signUp: authClient.signUp,
  };
}

// Protected route wrapper
export function ProtectedRoute({ children, permission }: {
  children: React.ReactNode;
  permission?: Permission;
}) {
  const { user, isLoading, isAuthenticated } = useAuth();
  const { membership } = useOrganization();

  if (isLoading) return <LoadingSpinner />;
  if (!isAuthenticated) return <Navigate to="/login" />;
  if (permission && !hasPermission(membership?.role, permission)) {
    return <AccessDenied />;
  }

  return children;
}
```

### Rate Limiting for Auth Endpoints
```typescript
// middleware/rateLimit.ts
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { redis } from '../lib/redis';

export const authRateLimiter = rateLimit({
  store: new RedisStore({
    sendCommand: (...args: string[]) => redis.call(...args),
  }),
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 10,                    // 10 attempts per window
  message: { error: 'Too many login attempts, please try again later' },
  keyGenerator: (req) => req.ip + ':' + req.body?.email,
});

// Apply to auth routes
router.post('/auth/signin', authRateLimiter, signInHandler);
router.post('/auth/signup', authRateLimiter, signUpHandler);
router.post('/auth/forgot-password', authRateLimiter, forgotPasswordHandler);
```

### Audit Logging
```typescript
// lib/audit.ts
interface AuditEvent {
  userId: string;
  action: string;
  resourceType: string;
  resourceId: string;
  metadata: Record<string, unknown>;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
}

export async function logAuditEvent(event: AuditEvent) {
  await db.insert(auditLogs).values({
    ...event,
    id: crypto.randomUUID(),
  });

  // Also send to external SIEM if configured
  if (process.env.SIEM_ENDPOINT) {
    await fetch(process.env.SIEM_ENDPOINT, {
      method: 'POST',
      body: JSON.stringify(event),
    });
  }
}
```

## References
- [Better-Auth Documentation](https://better-auth.com/)
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [SAML 2.0 Technical Overview](https://docs.oasis-open.org/security/saml/Post2.0/sstc-saml-tech-overview-2.0.html)
