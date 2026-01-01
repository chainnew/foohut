# Pages Directory Structure

This document outlines the page routing structure for the Foohut.com frontend application.

## Route Hierarchy

```
/                                    # Landing/Marketing page (public)
├── /login                          # User login
├── /register                       # User registration
├── /verify-email                   # Email verification callback
├── /reset-password                 # Password reset
│
├── /dashboard                      # User's personal dashboard
│
├── /settings                       # User settings
│   ├── /settings/profile          # Profile configuration
│   ├── /settings/notifications    # Notification preferences
│   ├── /settings/security         # Security & 2FA
│   └── /settings/integrations     # Connected apps
│
└── /:orgSlug                       # Organization context
    ├── /                          # Organization dashboard
    ├── /settings                  # Organization settings
    ├── /members                   # Member management
    ├── /billing                   # Subscription & billing
    │
    └── /:collectionSlug           # Collection context
        ├── /                      # Collection view
        ├── /settings              # Collection settings
        │
        └── /:spaceSlug            # Space context
            ├── /                  # Space overview/root page
            ├── /settings          # Space configuration
            ├── /git               # Git sync settings
            ├── /changes           # Change request list
            ├── /changes/:crId     # Change request detail
            │
            └── /:pagePath+        # Page editor (nested paths)
```

## Page Directory Structure

```
/pages
├── public/                        # Public (unauthenticated) pages
│   ├── LandingPage.tsx           # Marketing homepage
│   ├── LoginPage.tsx             # Authentication
│   ├── RegisterPage.tsx          # Account creation
│   ├── VerifyEmailPage.tsx       # Email verification
│   ├── ResetPasswordPage.tsx     # Password recovery
│   ├── PublicSpaceView.tsx       # Public documentation view
│   └── NotFoundPage.tsx          # 404 error page
│
├── dashboard/                     # User dashboard
│   ├── Dashboard.tsx             # Personal dashboard
│   ├── RecentPages.tsx           # Recently viewed
│   ├── Favorites.tsx             # Starred pages
│   └── ActivityFeed.tsx          # User activity
│
├── settings/                      # User settings
│   ├── SettingsLayout.tsx        # Settings page wrapper
│   ├── ProfileSettings.tsx       # Profile configuration
│   ├── NotificationSettings.tsx  # Notification prefs
│   ├── SecuritySettings.tsx      # Password, 2FA
│   └── IntegrationSettings.tsx   # Connected accounts
│
├── organization/                  # Organization pages
│   ├── OrgLayout.tsx             # Organization wrapper
│   ├── OrgDashboard.tsx          # Org home page
│   ├── OrgSettings.tsx           # Org configuration
│   ├── OrgMembers.tsx            # Member management
│   ├── OrgInvites.tsx            # Pending invitations
│   └── OrgBilling.tsx            # Subscription management
│
├── collection/                    # Collection pages
│   ├── CollectionLayout.tsx      # Collection wrapper
│   ├── CollectionView.tsx        # Collection overview
│   └── CollectionSettings.tsx    # Collection config
│
├── space/                         # Space pages
│   ├── SpaceLayout.tsx           # Space wrapper with nav
│   ├── SpaceView.tsx             # Space overview/root
│   ├── SpaceSettings.tsx         # Space configuration
│   ├── GitConfigPage.tsx         # Git sync setup
│   ├── ChangeRequestList.tsx     # All change requests
│   └── ChangeRequestView.tsx     # Single CR detail
│
└── editor/                        # Page editing
    ├── PageEditor.tsx            # Main editor page
    ├── PagePreview.tsx           # Preview mode
    └── PageHistory.tsx           # Version history
```

## Route Configuration

```typescript
// src/routes/index.tsx
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';

// Layouts
import { PublicLayout } from '@/layouts/PublicLayout';
import { AppLayout } from '@/layouts/AppLayout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

// Lazy-loaded pages
const LandingPage = lazy(() => import('@/pages/public/LandingPage'));
const LoginPage = lazy(() => import('@/pages/public/LoginPage'));
const RegisterPage = lazy(() => import('@/pages/public/RegisterPage'));
const Dashboard = lazy(() => import('@/pages/dashboard/Dashboard'));
const OrgDashboard = lazy(() => import('@/pages/organization/OrgDashboard'));
const CollectionView = lazy(() => import('@/pages/collection/CollectionView'));
const SpaceView = lazy(() => import('@/pages/space/SpaceView'));
const PageEditor = lazy(() => import('@/pages/editor/PageEditor'));

export const router = createBrowserRouter([
  // Public Routes
  {
    element: <PublicLayout />,
    children: [
      { path: '/', element: <LandingPage /> },
      { path: '/login', element: <LoginPage /> },
      { path: '/register', element: <RegisterPage /> },
      { path: '/verify-email', element: <VerifyEmailPage /> },
      { path: '/reset-password', element: <ResetPasswordPage /> },
    ],
  },

  // Protected Routes
  {
    element: <ProtectedRoute><AppLayout /></ProtectedRoute>,
    children: [
      // Dashboard
      { path: '/dashboard', element: <Dashboard /> },

      // User Settings
      {
        path: '/settings',
        element: <SettingsLayout />,
        children: [
          { index: true, element: <Navigate to="profile" replace /> },
          { path: 'profile', element: <ProfileSettings /> },
          { path: 'notifications', element: <NotificationSettings /> },
          { path: 'security', element: <SecuritySettings /> },
          { path: 'integrations', element: <IntegrationSettings /> },
        ],
      },

      // Organization Routes
      {
        path: '/:orgSlug',
        element: <OrgLayout />,
        children: [
          { index: true, element: <OrgDashboard /> },
          { path: 'settings', element: <OrgSettings /> },
          { path: 'members', element: <OrgMembers /> },
          { path: 'billing', element: <OrgBilling /> },

          // Collection Routes
          {
            path: ':collectionSlug',
            element: <CollectionLayout />,
            children: [
              { index: true, element: <CollectionView /> },
              { path: 'settings', element: <CollectionSettings /> },

              // Space Routes
              {
                path: ':spaceSlug',
                element: <SpaceLayout />,
                children: [
                  { index: true, element: <SpaceView /> },
                  { path: 'settings', element: <SpaceSettings /> },
                  { path: 'git', element: <GitConfigPage /> },
                  { path: 'changes', element: <ChangeRequestList /> },
                  { path: 'changes/:crId', element: <ChangeRequestView /> },

                  // Page Editor (catch-all for nested paths)
                  { path: '*', element: <PageEditor /> },
                ],
              },
            ],
          },
        ],
      },
    ],
  },

  // 404 Fallback
  { path: '*', element: <NotFoundPage /> },
]);
```

## URL Examples

| URL | Page | Description |
|-----|------|-------------|
| `/` | LandingPage | Public marketing page |
| `/login` | LoginPage | User authentication |
| `/dashboard` | Dashboard | User's home dashboard |
| `/settings/profile` | ProfileSettings | User profile config |
| `/acme` | OrgDashboard | Acme org's dashboard |
| `/acme/settings` | OrgSettings | Acme org settings |
| `/acme/docs` | CollectionView | "Docs" collection view |
| `/acme/docs/api-reference` | SpaceView | "API Reference" space |
| `/acme/docs/api-reference/settings` | SpaceSettings | Space config |
| `/acme/docs/api-reference/git` | GitConfigPage | Git sync setup |
| `/acme/docs/api-reference/getting-started` | PageEditor | Edit "Getting Started" |
| `/acme/docs/api-reference/guides/auth` | PageEditor | Nested page "guides/auth" |
| `/acme/docs/api-reference/changes` | ChangeRequestList | All CRs |
| `/acme/docs/api-reference/changes/cr-123` | ChangeRequestView | Single CR |

## Page Templates

### Standard Page Template

```typescript
// pages/organization/OrgDashboard.tsx
import { FC } from 'react';
import { useParams } from 'react-router-dom';
import { useOrganization } from '@/hooks/useOrganization';
import { PageHeader } from '@/components/common/PageHeader';
import { Skeleton } from '@/components/common/Skeleton';
import { ErrorMessage } from '@/components/common/ErrorMessage';

const OrgDashboard: FC = () => {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const { data: org, isLoading, error } = useOrganization(orgSlug);

  if (isLoading) {
    return <OrgDashboardSkeleton />;
  }

  if (error) {
    return <ErrorMessage error={error} />;
  }

  return (
    <div className="org-dashboard">
      <PageHeader
        title={org.name}
        subtitle="Organization Dashboard"
        actions={<OrgActions org={org} />}
      />

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <RecentActivity orgId={org.id} />
        <QuickStats orgId={org.id} />
        <CollectionsList orgId={org.id} />
      </div>
    </div>
  );
};

export default OrgDashboard;
```

### Layout Template

```typescript
// pages/space/SpaceLayout.tsx
import { FC } from 'react';
import { Outlet, useParams } from 'react-router-dom';
import { useSpace } from '@/hooks/useSpace';
import { SpaceNav } from '@/components/spaces/SpaceNav';
import { PageTree } from '@/components/pages/PageTree';
import { Skeleton } from '@/components/common/Skeleton';

const SpaceLayout: FC = () => {
  const { orgSlug, collectionSlug, spaceSlug } = useParams();
  const { data: space, isLoading } = useSpace(orgSlug, collectionSlug, spaceSlug);

  if (isLoading) {
    return <SpaceLayoutSkeleton />;
  }

  return (
    <div className="flex h-full">
      {/* Space sidebar with page tree */}
      <aside className="w-64 border-r">
        <SpaceNav space={space} />
        <PageTree spaceId={space.id} />
      </aside>

      {/* Main content area */}
      <main className="flex-1 overflow-auto">
        <Outlet context={{ space }} />
      </main>
    </div>
  );
};

export default SpaceLayout;
```

## Data Loading Patterns

### Route Loaders (React Router v6)

```typescript
// For pre-fetching data before render
export const orgLoader = async ({ params }: LoaderFunctionArgs) => {
  const { orgSlug } = params;

  // Prefetch organization data
  await queryClient.prefetchQuery({
    queryKey: ['organizations', orgSlug],
    queryFn: () => api.organizations.getBySlug(orgSlug),
  });

  return null;
};

// Usage in router config
{
  path: '/:orgSlug',
  element: <OrgLayout />,
  loader: orgLoader,
  children: [...]
}
```

### Parallel Data Fetching

```typescript
// Fetch multiple resources in parallel
const SpaceView: FC = () => {
  const { spaceId } = useParams();

  // These queries run in parallel
  const spaceQuery = useSpace(spaceId);
  const pagesQuery = useSpacePages(spaceId);
  const membersQuery = useSpaceMembers(spaceId);

  const isLoading = spaceQuery.isLoading ||
                    pagesQuery.isLoading ||
                    membersQuery.isLoading;

  // ...
};
```

## SEO & Meta Tags

```typescript
// Using react-helmet-async for meta tags
import { Helmet } from 'react-helmet-async';

const PageEditor: FC = () => {
  const { page } = usePageData();

  return (
    <>
      <Helmet>
        <title>{page.title} | {space.name} | Foohut</title>
        <meta name="description" content={page.metadata.description} />
        <meta property="og:title" content={page.title} />
        <meta property="og:description" content={page.metadata.description} />
        <link rel="canonical" href={`https://foohut.com${page.path}`} />
      </Helmet>

      {/* Page content */}
    </>
  );
};
```

## Error Boundaries

```typescript
// pages/ErrorBoundaryPage.tsx
import { useRouteError, isRouteErrorResponse } from 'react-router-dom';

const ErrorBoundaryPage: FC = () => {
  const error = useRouteError();

  if (isRouteErrorResponse(error)) {
    if (error.status === 404) {
      return <NotFoundPage />;
    }
    if (error.status === 403) {
      return <ForbiddenPage />;
    }
  }

  return <GenericErrorPage error={error} />;
};
```

## Navigation Guards

```typescript
// Prevent navigation with unsaved changes
const PageEditor: FC = () => {
  const { hasUnsavedChanges } = useEditorStore();

  // Block navigation when there are unsaved changes
  useBlocker(
    ({ currentLocation, nextLocation }) =>
      hasUnsavedChanges &&
      currentLocation.pathname !== nextLocation.pathname
  );

  // Also handle browser back/refresh
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // ...
};
```
