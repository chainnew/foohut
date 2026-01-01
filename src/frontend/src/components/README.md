# Components Directory Structure

This document outlines the component organization for the Foohut.com frontend application.

## Directory Structure

```
/components
├── layout/                    # Application shell and navigation
│   ├── AppShell.tsx          # Main application wrapper
│   ├── Header.tsx            # Top navigation bar
│   ├── Sidebar.tsx           # Left navigation panel
│   ├── SidebarToggle.tsx     # Collapse/expand control
│   ├── Breadcrumbs.tsx       # Navigation breadcrumbs
│   ├── NavigationTree.tsx    # Hierarchical page tree
│   ├── OrgSwitcher.tsx       # Organization dropdown
│   └── Footer.tsx            # Application footer
│
├── editor/                    # TipTap block editor
│   ├── BlockEditor.tsx       # Main editor component
│   ├── EditorProvider.tsx    # TipTap context provider
│   ├── BlockToolbar.tsx      # Floating format toolbar
│   ├── SlashCommandMenu.tsx  # "/" command palette
│   ├── BubbleMenu.tsx        # Selection format menu
│   ├── LinkEditor.tsx        # Link insertion/editing
│   ├── ImageUploader.tsx     # Image block upload
│   ├── CodeBlockEditor.tsx   # Code with syntax highlight
│   └── blocks/               # Custom block types
│       ├── ParagraphBlock.tsx
│       ├── HeadingBlock.tsx
│       ├── CodeBlock.tsx
│       ├── CalloutBlock.tsx
│       ├── TableBlock.tsx
│       ├── ImageBlock.tsx
│       ├── VideoBlock.tsx
│       ├── EmbedBlock.tsx
│       ├── DividerBlock.tsx
│       ├── MathBlock.tsx
│       ├── APIBlock.tsx
│       ├── ReusableBlock.tsx
│       └── AIPromptBlock.tsx
│
├── pages/                     # Page-related components
│   ├── PageTree.tsx          # Page hierarchy tree
│   ├── PageTreeItem.tsx      # Individual tree node
│   ├── PageView.tsx          # Page content display
│   ├── PageHeader.tsx        # Page title and actions
│   ├── PageCover.tsx         # Cover image component
│   ├── PageMeta.tsx          # Page metadata display
│   ├── PageBreadcrumb.tsx    # Page-specific breadcrumb
│   ├── PageActions.tsx       # Edit, share, delete buttons
│   ├── PageOutline.tsx       # Table of contents
│   └── PageComments.tsx      # Block-level comments
│
├── spaces/                    # Space management
│   ├── SpaceNav.tsx          # Space-level navigation
│   ├── SpaceHeader.tsx       # Space title and actions
│   ├── SpaceSettings.tsx     # Space configuration panel
│   ├── SpaceMembers.tsx      # Access control UI
│   ├── SpaceVariants.tsx     # Version/branch selector
│   ├── GitConfig.tsx         # Git sync configuration
│   ├── GitStatus.tsx         # Sync status indicator
│   ├── GitConflictResolver.tsx # Conflict resolution UI
│   └── GitHistory.tsx        # Commit history view
│
├── collections/               # Collection components
│   ├── CollectionCard.tsx    # Collection preview card
│   ├── CollectionList.tsx    # Grid of collections
│   ├── CollectionHeader.tsx  # Collection title/actions
│   └── CollectionSettings.tsx
│
├── organizations/             # Organization components
│   ├── OrgDashboard.tsx      # Organization home
│   ├── OrgSettings.tsx       # Organization configuration
│   ├── OrgMembers.tsx        # Member management
│   ├── OrgInvite.tsx         # Invitation form
│   └── OrgBilling.tsx        # Subscription management
│
├── ai/                        # AI-powered features
│   ├── AIAssistant.tsx       # Main AI chat interface
│   ├── AIAssistantTrigger.tsx # Cmd+I activation button
│   ├── AIMessage.tsx         # Individual chat message
│   ├── AISourceCard.tsx      # Source citation display
│   ├── AISuggestionPanel.tsx # Content suggestions sidebar
│   ├── AISuggestionItem.tsx  # Individual suggestion
│   ├── AIContentGenerator.tsx # Content generation UI
│   └── SearchModal.tsx       # Global search (Cmd+K)
│
├── change-requests/           # Change request workflow
│   ├── ChangeRequestList.tsx # List of change requests
│   ├── ChangeRequestCard.tsx # CR summary card
│   ├── ChangeRequestView.tsx # Full CR detail view
│   ├── ChangeRequestDiff.tsx # Visual diff display
│   ├── ChangeRequestComments.tsx
│   ├── ChangeRequestReviewers.tsx
│   └── ChangeRequestActions.tsx
│
├── api-docs/                  # OpenAPI documentation
│   ├── APIExplorer.tsx       # API spec browser
│   ├── APIEndpoint.tsx       # Single endpoint view
│   ├── APIConsole.tsx        # Interactive request maker
│   ├── APIRequest.tsx        # Request builder
│   ├── APIResponse.tsx       # Response display
│   ├── APISchema.tsx         # Schema viewer
│   └── CodeSnippet.tsx       # Multi-language snippets
│
├── auth/                      # Authentication components
│   ├── LoginForm.tsx         # Email/password login
│   ├── RegisterForm.tsx      # Account creation
│   ├── ForgotPasswordForm.tsx
│   ├── ResetPasswordForm.tsx
│   ├── ProtectedRoute.tsx    # Auth route guard
│   ├── SSOButtons.tsx        # SSO provider buttons
│   └── UserMenu.tsx          # User dropdown menu
│
├── common/                    # Shared UI components
│   ├── Button.tsx            # Primary button
│   ├── IconButton.tsx        # Icon-only button
│   ├── Input.tsx             # Text input
│   ├── Textarea.tsx          # Multi-line input
│   ├── Select.tsx            # Dropdown select
│   ├── Checkbox.tsx          # Checkbox input
│   ├── Switch.tsx            # Toggle switch
│   ├── Modal.tsx             # Dialog modal
│   ├── Drawer.tsx            # Side panel
│   ├── Dropdown.tsx          # Dropdown menu
│   ├── Popover.tsx           # Floating popover
│   ├── Tooltip.tsx           # Hover tooltip
│   ├── Toast.tsx             # Notification toast
│   ├── Badge.tsx             # Status badge
│   ├── Avatar.tsx            # User avatar
│   ├── AvatarGroup.tsx       # Stacked avatars
│   ├── Skeleton.tsx          # Loading skeleton
│   ├── Spinner.tsx           # Loading spinner
│   ├── EmptyState.tsx        # No content display
│   ├── ErrorBoundary.tsx     # Error fallback
│   ├── ErrorMessage.tsx      # Inline error display
│   ├── Tabs.tsx              # Tab navigation
│   ├── Accordion.tsx         # Collapsible sections
│   ├── Card.tsx              # Content card
│   ├── DataTable.tsx         # Sortable data table
│   ├── Pagination.tsx        # Page navigation
│   ├── SearchInput.tsx       # Search with icon
│   ├── DatePicker.tsx        # Date selection
│   ├── FileUpload.tsx        # File drop zone
│   ├── RichText.tsx          # Simple rich text
│   └── KeyboardShortcut.tsx  # Hotkey display
│
├── collaboration/             # Real-time collaboration
│   ├── CollaboratorCursors.tsx # Live cursor display
│   ├── CollaboratorList.tsx    # Active users list
│   ├── PresenceIndicator.tsx   # Online status
│   └── RealtimeProvider.tsx    # WebSocket context
│
└── notifications/             # Notification system
    ├── NotificationBell.tsx   # Header notification icon
    ├── NotificationList.tsx   # Notification dropdown
    ├── NotificationItem.tsx   # Single notification
    └── NotificationPreferences.tsx
```

## Component Guidelines

### 1. File Naming Convention

- **PascalCase** for component files: `PageHeader.tsx`
- **camelCase** for utility files: `usePageEditor.ts`
- **index.ts** for barrel exports in each directory

### 2. Component Structure

```typescript
// Standard component template
import { FC, memo } from 'react';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: string;
  emoji?: string;
  onTitleChange?: (title: string) => void;
  className?: string;
}

export const PageHeader: FC<PageHeaderProps> = memo(({
  title,
  emoji,
  onTitleChange,
  className,
}) => {
  return (
    <header className={cn('page-header', className)}>
      {emoji && <span className="page-emoji">{emoji}</span>}
      <h1>{title}</h1>
    </header>
  );
});

PageHeader.displayName = 'PageHeader';
```

### 3. Props Interface Convention

- Suffix props interfaces with `Props`: `PageHeaderProps`
- Export interfaces for reuse
- Use `children?: ReactNode` for composable components

### 4. Styling Approach

- Use **Tailwind CSS** for utility classes
- Use **shadcn/ui** components as base
- Custom components extend shadcn patterns
- Use `cn()` utility for conditional classes

### 5. State Management

- Local state: `useState`, `useReducer`
- Shared UI state: Zustand stores
- Server data: TanStack Query hooks
- Form state: React Hook Form

### 6. Testing

Each component should have:
- Unit tests in `__tests__/ComponentName.test.tsx`
- Storybook stories in `ComponentName.stories.tsx` (optional)

### 7. Accessibility

- All interactive elements must be keyboard accessible
- Use semantic HTML elements
- Include ARIA labels where appropriate
- Support screen readers

## Import Aliases

```typescript
// tsconfig paths
{
  "@/components/*": ["src/components/*"],
  "@/hooks/*": ["src/hooks/*"],
  "@/lib/*": ["src/lib/*"],
  "@/stores/*": ["src/stores/*"],
  "@/types/*": ["src/types/*"],
  "@/services/*": ["src/services/*"],
  "@/utils/*": ["src/utils/*"]
}
```

## Example Imports

```typescript
// From components
import { Button, Modal, Input } from '@/components/common';
import { BlockEditor } from '@/components/editor';
import { AIAssistant } from '@/components/ai';
import { PageTree } from '@/components/pages';

// From hooks
import { useAuth } from '@/hooks/useAuth';
import { usePage } from '@/hooks/usePage';

// From stores
import { useUIStore } from '@/stores/uiStore';
import { useEditorStore } from '@/stores/editorStore';
```
