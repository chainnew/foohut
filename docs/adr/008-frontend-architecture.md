# ADR-008: Frontend Architecture

**Status:** Accepted
**Date:** 2024-12-31
**Deciders:** Frontend Development Team
**Context:** Foohut.com AI-Native Documentation Platform

## Context and Problem Statement

Foohut.com requires a modern, scalable frontend architecture that supports:
- Block-based content editing with TipTap
- Four-tier navigation (Org > Collection > Space > Page)
- Real-time collaboration features
- AI assistant integration
- Git synchronization workflows
- Enterprise-grade performance requirements

## Decision

We will implement a React 18+ application using TypeScript, with Zustand for client state, TanStack Query for server state, and a component-based architecture following atomic design principles.

## Component Hierarchy

```
App
├── AuthProvider
│   └── ThemeProvider
│       └── QueryClientProvider
│           └── RouterProvider
│               ├── PublicRoutes
│               │   ├── LoginPage
│               │   ├── RegisterPage
│               │   └── PublicSpaceView
│               │
│               └── ProtectedRoutes
│                   └── AppShell
│                       ├── Header
│                       │   ├── Logo
│                       │   ├── GlobalSearch
│                       │   ├── NotificationBell
│                       │   └── UserMenu
│                       │
│                       ├── Sidebar
│                       │   ├── OrgSwitcher
│                       │   ├── NavigationTree
│                       │   │   ├── CollectionNode
│                       │   │   │   └── SpaceNode
│                       │   │   │       └── PageNode
│                       │   │   └── QuickActions
│                       │   └── SidebarFooter
│                       │
│                       └── MainContent
│                           ├── Breadcrumbs
│                           └── [Page Component]
│                               ├── Dashboard
│                               ├── OrgDashboard
│                               ├── CollectionView
│                               ├── SpaceView
│                               └── PageEditor
│                                   ├── PageHeader
│                                   ├── BlockEditor
│                                   │   ├── TipTapEditor
│                                   │   ├── BlockToolbar
│                                   │   └── SlashCommandMenu
│                                   └── PageFooter
│
└── Modals (Portal)
    ├── SearchModal (Cmd+K)
    ├── AIAssistantModal (Cmd+I)
    ├── ShareModal
    ├── SettingsModal
    └── ConfirmationModal
```

## State Management Strategy

### 1. Client State (Zustand)

```typescript
// Store Architecture
stores/
├── authStore.ts         // Authentication state
├── uiStore.ts           // UI state (sidebar, modals, theme)
├── editorStore.ts       // Editor state (selection, toolbar)
├── navigationStore.ts   // Navigation tree state
└── collaborationStore.ts // Real-time presence
```

**Auth Store:**
```typescript
interface AuthStore {
  user: User | null;
  isAuthenticated: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
  refreshToken: () => Promise<void>;
}
```

**UI Store:**
```typescript
interface UIStore {
  sidebar: SidebarState;
  modal: ModalState;
  theme: 'light' | 'dark' | 'system';
  toggleSidebar: () => void;
  openModal: (type: ModalType, props?: Record<string, unknown>) => void;
  closeModal: () => void;
}
```

**Editor Store:**
```typescript
interface EditorStore {
  isEditing: boolean;
  hasUnsavedChanges: boolean;
  selectedBlockId: string | null;
  setEditing: (editing: boolean) => void;
  setSelectedBlock: (blockId: string | null) => void;
  markDirty: () => void;
  markClean: () => void;
}
```

### 2. Server State (TanStack Query)

```typescript
// Query Keys Structure
const queryKeys = {
  orgs: {
    all: ['organizations'] as const,
    detail: (id: string) => ['organizations', id] as const,
    members: (id: string) => ['organizations', id, 'members'] as const,
  },
  collections: {
    all: (orgId: string) => ['collections', { orgId }] as const,
    detail: (id: string) => ['collections', id] as const,
  },
  spaces: {
    all: (collectionId: string) => ['spaces', { collectionId }] as const,
    detail: (id: string) => ['spaces', id] as const,
    pages: (id: string) => ['spaces', id, 'pages'] as const,
  },
  pages: {
    detail: (id: string) => ['pages', id] as const,
    content: (id: string) => ['pages', id, 'content'] as const,
  },
  ai: {
    session: (id: string) => ['ai', 'sessions', id] as const,
    suggestions: (pageId: string) => ['ai', 'suggestions', pageId] as const,
  },
};
```

**Query Configuration:**
```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,      // 5 minutes
      gcTime: 30 * 60 * 1000,         // 30 minutes (formerly cacheTime)
      retry: 2,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 1,
    },
  },
});
```

### 3. Real-time State (WebSocket)

```typescript
// Collaboration Provider
interface CollaborationContext {
  isConnected: boolean;
  collaborators: CollaboratorPresence[];
  sendCursor: (position: CursorPosition) => void;
  sendSelection: (range: SelectionRange) => void;
  subscribe: (pageId: string) => void;
  unsubscribe: (pageId: string) => void;
}
```

## Routing Structure

```typescript
// React Router v6 Configuration
const router = createBrowserRouter([
  // Public Routes
  {
    path: '/',
    element: <PublicLayout />,
    children: [
      { index: true, element: <LandingPage /> },
      { path: 'login', element: <LoginPage /> },
      { path: 'register', element: <RegisterPage /> },
      { path: 'verify-email', element: <VerifyEmailPage /> },
      { path: 'reset-password', element: <ResetPasswordPage /> },
    ],
  },

  // Protected Routes
  {
    path: '/',
    element: <ProtectedRoute><AppShell /></ProtectedRoute>,
    children: [
      { path: 'dashboard', element: <Dashboard /> },

      // Settings
      {
        path: 'settings',
        element: <SettingsLayout />,
        children: [
          { index: true, element: <Navigate to="profile" /> },
          { path: 'profile', element: <ProfileSettings /> },
          { path: 'notifications', element: <NotificationSettings /> },
          { path: 'security', element: <SecuritySettings /> },
        ],
      },

      // Organization Routes
      {
        path: ':orgSlug',
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

                  // Page Routes
                  { path: ':pagePath+', element: <PageEditor /> },
                ],
              },
            ],
          },
        ],
      },
    ],
  },

  // 404
  { path: '*', element: <NotFoundPage /> },
]);
```

## Performance Considerations

### 1. Code Splitting

```typescript
// Lazy load routes
const Dashboard = lazy(() => import('./pages/Dashboard'));
const PageEditor = lazy(() => import('./pages/PageEditor'));
const SettingsLayout = lazy(() => import('./pages/settings/SettingsLayout'));

// Lazy load heavy components
const BlockEditor = lazy(() => import('./components/editor/BlockEditor'));
const AIAssistant = lazy(() => import('./components/ai/AIAssistant'));
```

### 2. Bundle Optimization

```typescript
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-editor': ['@tiptap/core', '@tiptap/react', '@tiptap/starter-kit'],
          'vendor-ui': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
          'vendor-query': ['@tanstack/react-query'],
        },
      },
    },
  },
});
```

### 3. Virtualization

```typescript
// For large page trees and search results
import { useVirtualizer } from '@tanstack/react-virtual';

const PageTreeVirtualized = ({ items }: { items: PageTreeNode[] }) => {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 36, // Row height
    overscan: 10,
  });

  // ...render virtualized items
};
```

### 4. Optimistic Updates

```typescript
// Example: Page title update
const useUpdatePageTitle = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ pageId, title }: { pageId: string; title: string }) =>
      api.pages.updateTitle(pageId, title),

    onMutate: async ({ pageId, title }) => {
      await queryClient.cancelQueries({ queryKey: ['pages', pageId] });

      const previous = queryClient.getQueryData(['pages', pageId]);

      queryClient.setQueryData(['pages', pageId], (old: Page) => ({
        ...old,
        title,
      }));

      return { previous };
    },

    onError: (err, variables, context) => {
      queryClient.setQueryData(['pages', variables.pageId], context?.previous);
    },

    onSettled: (data, error, { pageId }) => {
      queryClient.invalidateQueries({ queryKey: ['pages', pageId] });
    },
  });
};
```

### 5. Image Optimization

```typescript
// Progressive image loading
const OptimizedImage = ({ src, alt, ...props }: ImageProps) => {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className="relative">
      {!loaded && <ImageSkeleton />}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        onLoad={() => setLoaded(true)}
        className={cn('transition-opacity', loaded ? 'opacity-100' : 'opacity-0')}
        {...props}
      />
    </div>
  );
};
```

### 6. Debouncing and Throttling

```typescript
// Editor auto-save with debounce
const useAutoSave = (content: JSONContent, pageId: string) => {
  const debouncedContent = useDebounce(content, 1000); // 1 second
  const mutation = useSavePageContent();

  useEffect(() => {
    if (debouncedContent) {
      mutation.mutate({ pageId, content: debouncedContent });
    }
  }, [debouncedContent, pageId]);
};

// Search with debounce
const useSearch = () => {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 300);

  const { data, isLoading } = useQuery({
    queryKey: ['search', debouncedQuery],
    queryFn: () => api.search(debouncedQuery),
    enabled: debouncedQuery.length >= 2,
  });

  return { query, setQuery, results: data, isLoading };
};
```

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                           React Components                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────────────┐  │
│  │   UI Store    │  │  Auth Store   │  │   TanStack Query      │  │
│  │   (Zustand)   │  │   (Zustand)   │  │   (Server State)      │  │
│  └───────┬───────┘  └───────┬───────┘  └───────────┬───────────┘  │
│          │                  │                      │               │
│          └──────────────────┴──────────────────────┘               │
│                             │                                       │
│                    ┌────────┴────────┐                             │
│                    │   API Service   │                             │
│                    │   (Axios)       │                             │
│                    └────────┬────────┘                             │
│                             │                                       │
│  ┌──────────────────────────┼──────────────────────────────────┐  │
│  │                          │                                   │  │
│  │  ┌───────────────┐  ┌────┴────┐  ┌───────────────────────┐  │  │
│  │  │   WebSocket   │  │  REST   │  │   AI Service          │  │  │
│  │  │   (Collab)    │  │  API    │  │   (Streaming)         │  │  │
│  │  └───────────────┘  └─────────┘  └───────────────────────┘  │  │
│  │                                                              │  │
│  │                      Backend APIs                            │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## Testing Strategy

### 1. Unit Tests (Vitest)
- Component rendering
- Hook behavior
- Store actions
- Utility functions

### 2. Integration Tests (Testing Library)
- User flows
- Form submissions
- API interactions (MSW)

### 3. E2E Tests (Playwright)
- Critical user journeys
- Cross-browser compatibility
- Performance benchmarks

```typescript
// Example: Page Editor Integration Test
describe('PageEditor', () => {
  it('should save content on blur', async () => {
    const { user } = renderWithProviders(<PageEditor pageId="123" />);

    const editor = screen.getByRole('textbox');
    await user.type(editor, 'New content');
    await user.tab(); // Trigger blur

    await waitFor(() => {
      expect(mockSaveContent).toHaveBeenCalledWith(
        expect.objectContaining({ content: expect.stringContaining('New content') })
      );
    });
  });
});
```

## Consequences

### Positive
- Clear separation of concerns between UI, server, and real-time state
- Optimistic updates provide excellent UX
- Code splitting reduces initial bundle size
- Type safety across the entire frontend

### Negative
- Multiple state solutions increase complexity
- Learning curve for team members unfamiliar with Zustand/TanStack Query
- Real-time features require careful WebSocket management

### Risks
- TipTap updates may require migration effort
- Performance issues with very large documents (>1000 blocks)

## Related Decisions
- ADR-001: Overall System Architecture
- ADR-003: API Design (REST + WebSocket)
- ADR-005: AI Integration Architecture
- ADR-007: Real-time Collaboration Strategy
