# ADR-005: Bi-directional Git Synchronization

## Status
Proposed

## Context
foohut.com requires bi-directional synchronization with Git repositories (primarily GitHub) to:
- Allow developers to edit documentation in their preferred environment
- Enable documentation-as-code workflows
- Support version control best practices
- Maintain a single source of truth
- Enable offline editing and batch updates

Key challenges include:
- Conflict resolution between web edits and Git commits
- Real-time sync without overwhelming the system
- Preserving rich content (blocks) in Markdown format
- Handling branch strategies and pull requests
- Managing webhook reliability and security

## Decision
We will implement a **webhook-driven bi-directional sync** system with **conflict detection and resolution UI**, using **Markdown with frontmatter** as the interchange format.

### Sync Architecture Overview
```
+------------------------------------------------------------------+
|                    Git Sync Architecture                          |
+------------------------------------------------------------------+

Web Edit Flow (foohut -> GitHub):
+---------+     +-----------+     +------------+     +----------+
| Editor  | --> |  Save to  | --> | Sync Queue | --> |  GitHub  |
| (Web)   |     |    DB     |     | (Bull)     |     |   API    |
+---------+     +-----------+     +------------+     +----------+

GitHub Webhook Flow (GitHub -> foohut):
+----------+     +-----------+     +------------+     +---------+
|  GitHub  | --> |  Webhook  | --> | Sync Queue | --> |   DB    |
| (Push)   |     | Receiver  |     | (Bull)     |     | Update  |
+----------+     +-----------+     +------------+     +---------+

Conflict Resolution Flow:
+---------+     +------------+     +-------------+     +----------+
| Detect  | --> |  Create    | --> |   User      | --> |  Apply   |
| Conflict|     | Conflict   |     | Resolution  |     | Merge    |
|         |     |  Record    |     |    UI       |     |          |
+---------+     +------------+     +-------------+     +----------+
```

### Markdown Serialization Format

Documentation is stored in Git as Markdown with YAML frontmatter:

```markdown
---
id: 550e8400-e29b-41d4-a716-446655440000
title: Getting Started
slug: getting-started
description: Quick start guide for new users
icon: rocket
coverImage: /images/getting-started-cover.png
createdAt: 2025-01-15T10:30:00Z
updatedAt: 2025-01-20T14:22:00Z
createdBy: user@example.com
---

# Getting Started

Welcome to foohut! This guide will help you get up and running quickly.

## Prerequisites

Before you begin, make sure you have:

- Node.js 18 or higher
- A GitHub account
- Basic familiarity with Markdown

## Installation

```bash
npm install @foohut/cli
```

:::note
This is a callout block that will be preserved as a special block type.
:::

:::warning
Be careful with production deployments!
:::

## Next Steps

- [Configure your workspace](/docs/configuration)
- [Invite team members](/docs/team)
- [Set up integrations](/docs/integrations)
```

### Block Type Mapping

```typescript
// lib/git-sync/markdown.ts

// Block type to Markdown mapping
const BLOCK_TO_MARKDOWN: Record<string, (block: Block) => string> = {
  paragraph: (b) => b.content.text + '\n\n',
  heading: (b) => '#'.repeat(b.content.level) + ' ' + b.content.text + '\n\n',
  bulletList: (b) => b.content.items.map(i => '- ' + i).join('\n') + '\n\n',
  numberedList: (b) => b.content.items.map((i, idx) => `${idx + 1}. ${i}`).join('\n') + '\n\n',
  codeBlock: (b) => '```' + (b.content.language || '') + '\n' + b.content.code + '\n```\n\n',
  blockquote: (b) => '> ' + b.content.text.split('\n').join('\n> ') + '\n\n',
  image: (b) => `![${b.content.alt || ''}](${b.content.src})\n\n`,
  callout: (b) => `:::${b.content.type}\n${b.content.text}\n:::\n\n`,
  table: (b) => serializeTable(b.content) + '\n\n',
  divider: () => '---\n\n',
  embed: (b) => `{{embed url="${b.content.url}"}}\n\n`,
};

// Markdown to Block type mapping (parsing)
const MARKDOWN_PATTERNS = [
  { pattern: /^#{1,6}\s+(.+)$/m, type: 'heading' },
  { pattern: /^```(\w*)\n([\s\S]*?)```$/m, type: 'codeBlock' },
  { pattern: /^:::(note|warning|info|tip)\n([\s\S]*?):::$/m, type: 'callout' },
  { pattern: /^>\s+(.+)$/m, type: 'blockquote' },
  { pattern: /^!\[([^\]]*)\]\(([^)]+)\)$/m, type: 'image' },
  { pattern: /^[-*]\s+(.+)$/m, type: 'bulletList' },
  { pattern: /^\d+\.\s+(.+)$/m, type: 'numberedList' },
  { pattern: /^---$/m, type: 'divider' },
  { pattern: /^\{\{embed url="([^"]+)"\}\}$/m, type: 'embed' },
];

export function serializeToMarkdown(page: Page, blocks: Block[]): string {
  const frontmatter = yaml.stringify({
    id: page.id,
    title: page.title,
    slug: page.slug,
    description: page.description,
    icon: page.icon,
    coverImage: page.coverImage,
    createdAt: page.createdAt,
    updatedAt: page.updatedAt,
    createdBy: page.createdBy,
  });

  const content = blocks
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map(block => BLOCK_TO_MARKDOWN[block.type]?.(block) || '')
    .join('');

  return `---\n${frontmatter}---\n\n${content}`;
}

export function parseFromMarkdown(markdown: string): { page: Partial<Page>; blocks: Block[] } {
  const { data: frontmatter, content } = matter(markdown);

  const blocks = parseMarkdownToBlocks(content);

  return {
    page: {
      id: frontmatter.id,
      title: frontmatter.title,
      slug: frontmatter.slug,
      description: frontmatter.description,
      icon: frontmatter.icon,
      coverImage: frontmatter.coverImage,
    },
    blocks,
  };
}
```

### Repository Structure Convention

```
docs/
├── .foohut/
│   ├── config.yaml           # Sync configuration
│   └── sync-state.json       # Last sync state (gitignored locally)
├── getting-started/          # Space
│   ├── _space.yaml           # Space metadata
│   ├── introduction.md       # Page
│   ├── installation.md       # Page
│   └── configuration/        # Nested pages
│       ├── _index.md         # Parent page
│       ├── basic.md          # Child page
│       └── advanced.md       # Child page
├── api-reference/            # Another space
│   ├── _space.yaml
│   └── endpoints.md
└── _collection.yaml          # Collection metadata
```

### Sync Configuration

```yaml
# .foohut/config.yaml
collection:
  id: 550e8400-e29b-41d4-a716-446655440000
  name: Documentation

sync:
  mode: bidirectional          # unidirectional-to-git, unidirectional-from-git, bidirectional
  branch: main                 # Branch to sync with
  autoSync: true               # Auto-sync on push
  conflictStrategy: ask        # ask, prefer-web, prefer-git, merge

  include:
    - "**/*.md"

  exclude:
    - "**/node_modules/**"
    - "**/.git/**"
    - "**/README.md"           # Don't sync repo README

  transformations:
    # Custom slug generation
    slugify: kebab-case
    # Strip specific frontmatter in Git
    stripFrontmatter:
      - createdBy
      - updatedAt
```

### Webhook Handler

```typescript
// routes/webhooks/github.ts
import { Router } from 'express';
import crypto from 'crypto';
import { syncQueue } from '../../jobs/sync-queue';

const router = Router();

router.post('/github', async (req, res) => {
  // Verify webhook signature
  const signature = req.headers['x-hub-signature-256'] as string;
  const payload = JSON.stringify(req.body);
  const expectedSignature = 'sha256=' + crypto
    .createHmac('sha256', process.env.GITHUB_WEBHOOK_SECRET!)
    .update(payload)
    .digest('hex');

  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  const event = req.headers['x-github-event'];

  if (event === 'push') {
    const { repository, commits, ref } = req.body;

    // Find collection linked to this repo
    const collection = await db.query.collections.findFirst({
      where: eq(collections.gitRepoUrl, repository.clone_url),
    });

    if (!collection) {
      return res.status(200).json({ message: 'No linked collection' });
    }

    // Check if push is to sync branch
    const branch = ref.replace('refs/heads/', '');
    if (branch !== collection.gitBranch) {
      return res.status(200).json({ message: 'Not sync branch' });
    }

    // Queue sync job
    await syncQueue.add('github-push', {
      collectionId: collection.id,
      commits: commits.map(c => ({
        sha: c.id,
        message: c.message,
        added: c.added,
        modified: c.modified,
        removed: c.removed,
        author: c.author.email,
        timestamp: c.timestamp,
      })),
    }, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
    });

    res.status(200).json({ message: 'Sync queued' });
  } else {
    res.status(200).json({ message: 'Event ignored' });
  }
});
```

### Sync Worker

```typescript
// jobs/sync-worker.ts
import { Worker } from 'bullmq';
import { Octokit } from '@octokit/rest';
import { db } from '../db';

const syncWorker = new Worker('sync', async (job) => {
  const { type } = job.name;

  if (type === 'github-push') {
    await handleGitHubPush(job.data);
  } else if (type === 'web-edit') {
    await handleWebEdit(job.data);
  }
}, { connection: redis, concurrency: 3 });

async function handleGitHubPush(data: GitHubPushData) {
  const { collectionId, commits } = data;

  const collection = await db.query.collections.findFirst({
    where: eq(collections.id, collectionId),
    with: { organization: true },
  });

  const octokit = new Octokit({ auth: collection.gitAccessToken });
  const [owner, repo] = parseRepoUrl(collection.gitRepoUrl);

  for (const commit of commits) {
    // Process added files
    for (const filePath of commit.added) {
      if (!isMarkdownFile(filePath)) continue;

      const content = await fetchFileContent(octokit, owner, repo, filePath, commit.sha);
      const { page, blocks } = parseFromMarkdown(content);

      await createPageFromGit(collection, filePath, page, blocks, commit);
    }

    // Process modified files
    for (const filePath of commit.modified) {
      if (!isMarkdownFile(filePath)) continue;

      const content = await fetchFileContent(octokit, owner, repo, filePath, commit.sha);
      const { page, blocks } = parseFromMarkdown(content);

      // Check for conflicts
      const existingPage = await findPageByPath(collection.id, filePath);
      if (existingPage && existingPage.updatedAt > commit.timestamp) {
        // Conflict detected
        await createConflictRecord(existingPage, page, blocks, commit);
        continue;
      }

      await updatePageFromGit(existingPage, page, blocks, commit);
    }

    // Process deleted files
    for (const filePath of commit.removed) {
      if (!isMarkdownFile(filePath)) continue;

      const existingPage = await findPageByPath(collection.id, filePath);
      if (existingPage) {
        await softDeletePage(existingPage, commit);
      }
    }
  }

  // Update sync state
  await updateSyncState(collectionId, commits[commits.length - 1].sha);
}

async function handleWebEdit(data: WebEditData) {
  const { pageId, userId } = data;

  const page = await db.query.pages.findFirst({
    where: eq(pages.id, pageId),
    with: {
      blocks: true,
      space: { with: { collection: true } },
    },
  });

  const collection = page.space.collection;
  if (!collection.gitRepoUrl) return; // No Git sync configured

  const octokit = new Octokit({ auth: collection.gitAccessToken });
  const [owner, repo] = parseRepoUrl(collection.gitRepoUrl);

  // Serialize to Markdown
  const markdown = serializeToMarkdown(page, page.blocks);
  const filePath = getGitFilePath(page);

  // Check for remote changes since last sync
  const remoteContent = await fetchFileContent(octokit, owner, repo, filePath, collection.gitBranch);
  const syncState = await getSyncState(collection.id);

  if (remoteContent && hasRemoteChanges(remoteContent, syncState.lastKnownContent)) {
    // Remote has changes we don't have
    await createConflictRecord(page, parseFromMarkdown(remoteContent), null, {
      source: 'git',
      message: 'Remote changes detected',
    });
    return;
  }

  // Commit to GitHub
  const user = await db.query.users.findFirst({ where: eq(users.id, userId) });

  await octokit.repos.createOrUpdateFileContents({
    owner,
    repo,
    path: filePath,
    message: `docs: update ${page.title}\n\nUpdated via foohut by ${user.name}`,
    content: Buffer.from(markdown).toString('base64'),
    branch: collection.gitBranch,
    sha: syncState.fileShas[filePath], // Required for updates
    committer: {
      name: 'foohut',
      email: 'sync@foohut.com',
    },
    author: {
      name: user.name,
      email: user.email,
    },
  });

  // Update sync state
  await updateFileSyncState(collection.id, filePath, markdown);
}
```

### Conflict Resolution

```typescript
// lib/git-sync/conflicts.ts

interface ConflictRecord {
  id: string;
  pageId: string;
  status: 'pending' | 'resolved' | 'dismissed';
  webVersion: {
    content: string;
    updatedAt: Date;
    updatedBy: string;
  };
  gitVersion: {
    content: string;
    commitSha: string;
    commitMessage: string;
    author: string;
    timestamp: Date;
  };
  resolution?: {
    strategy: 'web' | 'git' | 'merge';
    mergedContent?: string;
    resolvedBy: string;
    resolvedAt: Date;
  };
  createdAt: Date;
}

// Database schema
export const syncConflicts = pgTable('sync_conflicts', {
  id: uuid('id').primaryKey().defaultRandom(),
  pageId: uuid('page_id').notNull().references(() => pages.id),
  status: varchar('status', { length: 20 }).default('pending'),
  webVersion: jsonb('web_version').notNull(),
  gitVersion: jsonb('git_version').notNull(),
  resolution: jsonb('resolution'),
  createdAt: timestamp('created_at').defaultNow(),
});

export async function createConflictRecord(
  page: Page,
  gitContent: { page: Partial<Page>; blocks: Block[] },
  commit: CommitInfo
): Promise<ConflictRecord> {
  const webMarkdown = serializeToMarkdown(page, page.blocks);
  const gitMarkdown = serializeToMarkdown(gitContent.page, gitContent.blocks);

  const conflict = await db.insert(syncConflicts).values({
    pageId: page.id,
    webVersion: {
      content: webMarkdown,
      updatedAt: page.updatedAt,
      updatedBy: page.updatedBy,
    },
    gitVersion: {
      content: gitMarkdown,
      commitSha: commit.sha,
      commitMessage: commit.message,
      author: commit.author,
      timestamp: commit.timestamp,
    },
  }).returning();

  // Notify relevant users
  await notifyConflict(page, conflict);

  return conflict[0];
}

export async function resolveConflict(
  conflictId: string,
  strategy: 'web' | 'git' | 'merge',
  mergedContent: string | null,
  userId: string
): Promise<void> {
  const conflict = await db.query.syncConflicts.findFirst({
    where: eq(syncConflicts.id, conflictId),
    with: { page: { with: { space: { with: { collection: true } } } } },
  });

  let finalContent: string;

  switch (strategy) {
    case 'web':
      finalContent = conflict.webVersion.content;
      break;
    case 'git':
      finalContent = conflict.gitVersion.content;
      break;
    case 'merge':
      if (!mergedContent) throw new Error('Merged content required');
      finalContent = mergedContent;
      break;
  }

  // Update page with resolved content
  const { page, blocks } = parseFromMarkdown(finalContent);
  await updatePage(conflict.pageId, page, blocks, userId);

  // Mark conflict resolved
  await db.update(syncConflicts)
    .set({
      status: 'resolved',
      resolution: {
        strategy,
        mergedContent: strategy === 'merge' ? mergedContent : null,
        resolvedBy: userId,
        resolvedAt: new Date(),
      },
    })
    .where(eq(syncConflicts.id, conflictId));

  // Sync resolved content to Git
  await syncQueue.add('web-edit', {
    pageId: conflict.pageId,
    userId,
    skipConflictCheck: true,
  });
}
```

### GitHub App Integration

```typescript
// lib/github/app.ts
import { App } from '@octokit/app';

const githubApp = new App({
  appId: process.env.GITHUB_APP_ID!,
  privateKey: process.env.GITHUB_APP_PRIVATE_KEY!,
  webhooks: { secret: process.env.GITHUB_WEBHOOK_SECRET! },
});

// Installation flow
export async function handleInstallation(installationId: number, repositories: string[]) {
  const octokit = await githubApp.getInstallationOctokit(installationId);

  // Store installation for later use
  await db.insert(githubInstallations).values({
    installationId,
    repositories,
    accessToken: await getInstallationToken(installationId),
    expiresAt: new Date(Date.now() + 3600000), // 1 hour
  });
}

// Get fresh access token for API calls
export async function getGitHubToken(collectionId: string): Promise<string> {
  const collection = await db.query.collections.findFirst({
    where: eq(collections.id, collectionId),
    with: { githubInstallation: true },
  });

  const installation = collection.githubInstallation;

  // Refresh token if expired
  if (installation.expiresAt < new Date()) {
    const octokit = await githubApp.getInstallationOctokit(installation.installationId);
    const { token, expiresAt } = await octokit.auth({ type: 'installation' });

    await db.update(githubInstallations)
      .set({ accessToken: token, expiresAt })
      .where(eq(githubInstallations.id, installation.id));

    return token;
  }

  return installation.accessToken;
}
```

## Consequences

### Positive
- **Developer Workflow**: Edit docs in IDE with full Git tooling
- **Version Control**: Full history, branching, PRs for documentation
- **Offline Support**: Clone repo, edit offline, push when ready
- **Single Source of Truth**: Either web or Git can be authoritative
- **Automation**: CI/CD can validate/deploy documentation

### Negative
- **Complexity**: Bi-directional sync is inherently complex
- **Conflict Resolution**: Requires user intervention for conflicts
- **Format Limitations**: Some block types don't map cleanly to Markdown
- **Latency**: Webhook processing adds delay to sync

### Mitigations
- Clear conflict UI with visual diff
- Rich Markdown extensions for special blocks (callouts, embeds)
- Real-time webhook processing with queue prioritization
- Comprehensive sync status dashboard

## Technical Details

### Sync State Management
```typescript
interface SyncState {
  collectionId: string;
  lastSyncAt: Date;
  lastCommitSha: string;
  fileShas: Record<string, string>;  // path -> sha for update detection
  pendingWebEdits: string[];          // pageIds with unsync'd changes
  pendingGitChanges: string[];        // paths with unsync'd changes
}
```

### Rate Limiting & Quotas
- GitHub API: 5,000 requests/hour per installation
- Webhook processing: 100 concurrent jobs
- Sync frequency: Max 1 sync per page per minute

### Monitoring
```typescript
// Metrics to track
- sync_latency_seconds (histogram)
- conflicts_created_total (counter)
- conflicts_resolved_total (counter by strategy)
- webhook_processing_duration (histogram)
- sync_errors_total (counter by error type)
```

## References
- [GitHub Apps Documentation](https://docs.github.com/en/apps)
- [GitHub Webhooks](https://docs.github.com/en/webhooks)
- [Octokit.js](https://github.com/octokit/octokit.js)
- [MDX Specification](https://mdxjs.com/docs/)
