# FOOHUT — Focused Development Scope

**Based on existing codebase at:** `/Volumes/Hendrix/foohut`  
**Live site:** https://foohut.com  
**Last Updated:** January 2026

---

## TL;DR — What We're Building

FooHut is three interconnected spaces in one app:

```
┌─────────────────────────────────────────────────────────────────┐
│                         FOOHUT                                   │
├─────────────────┬─────────────────┬─────────────────────────────┤
│   📝 SPACE      │   💻 DEV        │   🔒 CYBER                  │
│   (Obsidian)    │   (Bolt.new)    │   (Napkin + Threat Intel)   │
│                 │                 │                              │
│ • Note-taking   │ • Browser IDE   │ • Doc templates             │
│ • Docs/KB       │ • FooHub (git)  │ • Stencil diagrams          │
│ • AI assistant  │ • Deploy/host   │ • Threat dashboards         │
│ • Presentations │ • Sandboxes     │ • Mind mapping              │
└─────────────────┴─────────────────┴─────────────────────────────┘
```

---

## What's Already Built ✅

### Frontend (`foohut.ui/`)

| Component | Status | Notes |
|-----------|--------|-------|
| **Block Editor** | ✅ Built | Tiptap + slash commands, callouts, code blocks |
| **AI Panel** | ✅ Built | Chat, suggestions, inline AI |
| **Artifacts** | ✅ Built | Code, charts, diagrams, React, timeline |
| **Developer Portal** | ✅ Built | File tree, Monaco editor, terminal, tabs |
| **Sandbox** | ✅ Built | Sandpack runner + preview |
| **Stencils** | ✅ Built | Cyber, data, visual, layout, content |
| **Templates** | ✅ Built | Threat report, incident response, advisory |
| **Presentations** | ✅ Built | Slide renderer, navigation |
| **Navigation** | ✅ Built | Tree view, groups, quick actions |
| **Landing Page** | ✅ Built | Hero, features, pricing, CTA |
| **Auth UI** | ✅ Built | Login/register pages |
| **Command Palette** | ✅ Built | Cmd+K search |

### Backend (`workers/api/`)

| Component | Status | Notes |
|-----------|--------|-------|
| **Hono API** | 🟡 Scaffolded | Basic structure exists |
| **D1 Migrations** | 🟡 Started | Some tables defined |
| **Auth** | ❌ Incomplete | Needs JWT/session logic |
| **File Storage** | ❌ Not started | R2 integration needed |
| **AI Endpoints** | ❌ Not started | Claude/OpenAI proxy |
| **Git Backend** | ❌ Not started | FooHub storage layer |

### Stores (Zustand)

| Store | Purpose |
|-------|---------|
| `authStore` | User authentication state |
| `editorStore` | Current document + editor state |
| `fileStore` | File tree for dev portal |
| `projectStore` | Dev projects |
| `workspaceStore` | Workspace/space management |
| `aiStore` | AI chat history + settings |
| `layoutStore` | Panel sizes, sidebar state |
| `uiStore` | Modals, toasts, theme |

---

## What Needs Building 🚧

### Phase 1: Core Loop (Weeks 1-4)

**Goal:** User can sign up, create a space, write docs, and save them.

#### 1.1 Auth System
```
workers/api/src/routes/auth.ts
├── POST /auth/register     → Create user in D1
├── POST /auth/login        → Return JWT
├── POST /auth/logout       → Invalidate session
├── GET  /auth/me           → Current user
└── POST /auth/oauth/:provider → GitHub/Google OAuth
```

**Tasks:**
- [ ] Implement JWT signing/verification in Worker
- [ ] Set up Clerk OR build custom auth (recommend Clerk for speed)
- [ ] Connect `authStore` to real endpoints
- [ ] Protected route middleware

#### 1.2 Spaces & Documents
```
workers/api/src/routes/spaces.ts
├── GET    /spaces              → List user's spaces
├── POST   /spaces              → Create space
├── GET    /spaces/:id          → Get space + doc tree
├── PATCH  /spaces/:id          → Update space
└── DELETE /spaces/:id          → Delete space

workers/api/src/routes/docs.ts
├── GET    /docs/:id            → Get document
├── POST   /spaces/:sid/docs    → Create document
├── PATCH  /docs/:id            → Update document (auto-save)
├── DELETE /docs/:id            → Delete document
└── POST   /docs/:id/move       → Reorder in tree
```

**D1 Schema:**
```sql
CREATE TABLE spaces (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  icon TEXT,
  owner_id TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE documents (
  id TEXT PRIMARY KEY,
  space_id TEXT NOT NULL REFERENCES spaces(id),
  parent_id TEXT REFERENCES documents(id),
  title TEXT NOT NULL DEFAULT 'Untitled',
  content JSON,  -- Tiptap JSON
  position INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**Tasks:**
- [ ] D1 migrations for spaces + docs
- [ ] Wire `workspaceStore` to API
- [ ] Auto-save debounce in editor (500ms)
- [ ] Optimistic updates for smooth UX

#### 1.3 File Uploads
```
workers/api/src/routes/files.ts
├── POST /files/upload    → Upload to R2, return URL
├── GET  /files/:key      → Serve file from R2
└── DELETE /files/:key    → Remove file
```

**Tasks:**
- [ ] R2 bucket setup via Wrangler
- [ ] Drag-drop image upload in editor
- [ ] Paste image from clipboard
- [ ] File size limits (10MB free, 100MB pro)

---

### Phase 2: Dev Portal (Weeks 5-8)

**Goal:** User clicks "Dev" button, opens Bolt.new-style IDE, creates project, deploys.

#### 2.1 Projects API
```
workers/api/src/routes/projects.ts
├── GET    /projects              → List user's projects
├── POST   /projects              → Create project
├── GET    /projects/:id          → Get project + file tree
├── PATCH  /projects/:id          → Update project metadata
├── DELETE /projects/:id          → Delete project
└── POST   /projects/:id/fork     → Fork project
```

#### 2.2 Project Files
```
workers/api/src/routes/project-files.ts
├── GET    /projects/:id/files         → List all files
├── GET    /projects/:id/files/*path   → Get file content
├── PUT    /projects/:id/files/*path   → Create/update file
├── DELETE /projects/:id/files/*path   → Delete file
└── POST   /projects/:id/files/bulk    → Multi-file update
```

**Storage Strategy:**
- Small files (<1MB): Store in D1 `project_files.content`
- Large files (>1MB): Store in R2, reference via `r2_key`

**Tasks:**
- [ ] Project CRUD endpoints
- [ ] File tree endpoints
- [ ] Connect `fileStore` to real API
- [ ] Sync `projectStore` with backend

#### 2.3 FooHub (Git-like Features)

Not full Git—just the essentials:
- **Commits:** Snapshot project state with message
- **History:** View past commits, restore
- **Branches:** (Phase 3) Main + feature branches
- **Public/Private:** Visibility toggle

```sql
CREATE TABLE commits (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id),
  message TEXT,
  snapshot JSON,  -- File tree at commit time
  created_by TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### 2.4 Sandbox Execution

Already have Sandpack for client-side—extend with:
- [ ] Python via Pyodide (already in plan)
- [ ] Package installation (esm.sh for npm)
- [ ] Console output capture
- [ ] Error boundaries

#### 2.5 Deployment

**Simple hosting via Cloudflare Pages:**
```
POST /projects/:id/deploy
  → Build project (Vite/static)
  → Upload to Pages
  → Return URL: project-name.foohut.dev
```

**Tasks:**
- [ ] Build pipeline (Vite for React, esbuild for vanilla)
- [ ] Pages API integration
- [ ] Custom domain support (later)
- [ ] Deploy status webhook

---

### Phase 3: Cyber / Docs Suite (Weeks 9-12)

**Goal:** Power users create complex documents with napkin-style diagrams, threat intel, templates.

#### 3.1 Enhanced Stencils

Already built: `Stencils/cyber`, `Stencils/data`, `Stencils/visual`

**Extend with:**
- [ ] Drag stencils onto canvas (not just into editor)
- [ ] Connect stencils with arrows
- [ ] Export as PNG/SVG
- [ ] Stencil marketplace (share custom stencils)

#### 3.2 Mind Map Mode

New component: `components/MindMap/`
- [ ] D3-based force-directed graph
- [ ] Create nodes from docs/headings
- [ ] Drag to reorganize
- [ ] Zoom/pan canvas
- [ ] Export as image

#### 3.3 Template System Enhancement

Already have templates—make them smarter:
- [ ] Variable interpolation ({{company_name}})
- [ ] Conditional sections
- [ ] Export to PDF/DOCX
- [ ] Template gallery with search

#### 3.4 Threat Intel Integration

For the cyber nerds:
```
workers/api/src/routes/threats.ts
├── GET /threats/cve/:id       → Fetch CVE from NVD
├── GET /threats/search        → Search CVE database
├── POST /threats/ioc          → Submit IOC for analysis
└── GET /threats/feeds         → RSS feed aggregator
```

**Data Sources:**
- NVD API (free)
- CISA KEV (free)
- AlienVault OTX (free API)
- Shodan (paid, optional)

---

### Phase 4: AI Integration (Weeks 13-16)

**Goal:** AI assistant knows your docs, helps write, generates code.

#### 4.1 RAG Pipeline

```
Document saved
  → Chunk into ~500 token pieces
  → Generate embeddings (text-embedding-3-small)
  → Store in Vectorize

User asks question
  → Embed query
  → Vector search (top 5 chunks)
  → Build prompt with context
  → Stream response from Claude
```

**Endpoints:**
```
POST /ai/chat          → RAG-powered chat
POST /ai/complete      → Text completion
POST /ai/code          → Code generation
POST /ai/embed         → Manual embedding
```

#### 4.2 Model Selection

- Default: Claude 3.5 Sonnet (best balance)
- Option: GPT-4o, Claude 3 Opus
- BYO API key for power users

**Tasks:**
- [ ] Vectorize namespace per workspace
- [ ] Chunking pipeline (on doc save)
- [ ] Streaming responses via SSE
- [ ] Citation links in responses

#### 4.3 Inline AI Features

Already have `AIInline.tsx`—connect to backend:
- [ ] Autocomplete while typing
- [ ] "Improve writing" selection action
- [ ] "Explain this" for code blocks
- [ ] Generate from outline

---

## Route Structure

```
/                           → Landing (LandingPage.tsx)
/pricing                    → Pricing (PricingPage.tsx)
/about                      → About (AboutPage.tsx)
/changelog                  → Changelog (ChangelogPage.tsx)
/login                      → Auth (AuthPage.tsx)
/register                   → Auth (AuthPage.tsx)

/app                        → Dashboard (DashboardPage.tsx)
/app/space/:id              → Space workspace (SpaceWorkspacePage.tsx)
/app/space/:id/doc/:docId   → Document editor (EditorPage.tsx)
/app/space/:id/present      → Presentation mode (PresentPage.tsx)

/dev                        → Dev dashboard (DevDashboard.tsx)
/dev/new                    → New project (NewProjectPage.tsx)
/dev/project/:id            → Project IDE (ProjectView.tsx)
/dev/explore                → Explore public projects (ExplorePage.tsx)
/dev/profile/:username      → Public profile (ProfileView.tsx)

/cyber                      → Cyber workspace (NEW)
/cyber/templates            → Template gallery (NEW)
/cyber/threats              → Threat dashboard (NEW)
```

---

## Database Schema (Complete)

```sql
-- ═══════════════════════════════════════════════════════════════
-- USERS & AUTH
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  username TEXT UNIQUE,
  avatar_url TEXT,
  plan TEXT DEFAULT 'free',  -- 'free', 'pro', 'team'
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ═══════════════════════════════════════════════════════════════
-- SPACES & DOCS (Obsidian-like)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE spaces (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  icon TEXT,
  description TEXT,
  owner_id TEXT NOT NULL REFERENCES users(id),
  is_public BOOLEAN DEFAULT FALSE,
  settings JSON DEFAULT '{}',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(owner_id, slug)
);

CREATE TABLE documents (
  id TEXT PRIMARY KEY,
  space_id TEXT NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  parent_id TEXT REFERENCES documents(id) ON DELETE SET NULL,
  title TEXT NOT NULL DEFAULT 'Untitled',
  icon TEXT,
  content JSON,          -- Tiptap JSON
  content_text TEXT,     -- Plain text for search
  position INTEGER DEFAULT 0,
  is_published BOOLEAN DEFAULT FALSE,
  created_by TEXT REFERENCES users(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_docs_space ON documents(space_id);
CREATE INDEX idx_docs_parent ON documents(parent_id);

-- ═══════════════════════════════════════════════════════════════
-- PROJECTS & FILES (Bolt.new-like)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  owner_id TEXT NOT NULL REFERENCES users(id),
  visibility TEXT DEFAULT 'private',  -- 'public', 'private'
  template TEXT,         -- 'react', 'vue', 'vanilla', 'python'
  stars_count INTEGER DEFAULT 0,
  forks_count INTEGER DEFAULT 0,
  forked_from TEXT REFERENCES projects(id),
  deploy_url TEXT,       -- project-name.foohut.dev
  settings JSON DEFAULT '{}',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(owner_id, slug)
);

CREATE TABLE project_files (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  path TEXT NOT NULL,    -- 'src/App.tsx'
  content TEXT,          -- File content (small files)
  r2_key TEXT,           -- R2 object key (large files)
  mime_type TEXT,
  size_bytes INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(project_id, path)
);

CREATE TABLE commits (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  message TEXT,
  snapshot JSON,         -- File tree snapshot
  created_by TEXT REFERENCES users(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE project_stars (
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (project_id, user_id)
);

-- ═══════════════════════════════════════════════════════════════
-- ARTIFACTS & SANDBOXES
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE artifacts (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,    -- 'react', 'html', 'chart', 'diagram', 'mermaid'
  title TEXT,
  code TEXT NOT NULL,
  dependencies JSON DEFAULT '[]',
  owner_id TEXT REFERENCES users(id),
  space_id TEXT REFERENCES spaces(id),
  project_id TEXT REFERENCES projects(id),
  is_public BOOLEAN DEFAULT FALSE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ═══════════════════════════════════════════════════════════════
-- AI & EMBEDDINGS
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE ai_conversations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  space_id TEXT REFERENCES spaces(id),
  title TEXT,
  messages JSON DEFAULT '[]',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Embeddings stored in Vectorize, metadata here
CREATE TABLE embeddings (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  chunk_text TEXT NOT NULL,
  vectorize_id TEXT,     -- Reference to Vectorize vector
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ═══════════════════════════════════════════════════════════════
-- CYBER / THREAT INTEL
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE threat_feeds (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  type TEXT NOT NULL,    -- 'rss', 'api', 'manual'
  last_fetched DATETIME,
  owner_id TEXT REFERENCES users(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE threat_items (
  id TEXT PRIMARY KEY,
  feed_id TEXT REFERENCES threat_feeds(id) ON DELETE CASCADE,
  title TEXT,
  description TEXT,
  severity TEXT,         -- 'critical', 'high', 'medium', 'low'
  cve_id TEXT,
  iocs JSON,             -- Array of IOCs
  source_url TEXT,
  published_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

## API Cheatsheet

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/register` | Create account |
| POST | `/auth/login` | Login, get JWT |
| POST | `/auth/logout` | Logout |
| GET | `/auth/me` | Current user |

### Spaces & Docs
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/spaces` | List spaces |
| POST | `/spaces` | Create space |
| GET | `/spaces/:id` | Get space + tree |
| GET | `/docs/:id` | Get document |
| POST | `/spaces/:id/docs` | Create doc |
| PATCH | `/docs/:id` | Update doc |
| DELETE | `/docs/:id` | Delete doc |

### Projects & Files
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/projects` | List projects |
| POST | `/projects` | Create project |
| GET | `/projects/:id` | Get project |
| GET | `/projects/:id/files` | List files |
| GET | `/projects/:id/files/*` | Get file |
| PUT | `/projects/:id/files/*` | Save file |
| POST | `/projects/:id/deploy` | Deploy |
| POST | `/projects/:id/commit` | Commit |

### AI
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/ai/chat` | RAG chat |
| POST | `/ai/complete` | Completion |
| POST | `/ai/code` | Code gen |

### Files
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/files/upload` | Upload to R2 |
| GET | `/files/:key` | Serve file |

---

## Tech Stack Summary

| Layer | Tech |
|-------|------|
| **Frontend** | Vite + React 18 + TypeScript |
| **Styling** | Tailwind CSS |
| **State** | Zustand |
| **Editor** | Tiptap (ProseMirror) |
| **Code Editor** | Monaco |
| **Sandbox** | Sandpack + Pyodide |
| **Backend** | Cloudflare Workers + Hono |
| **Database** | Cloudflare D1 (SQLite) |
| **Storage** | Cloudflare R2 |
| **Cache** | Cloudflare KV |
| **Vectors** | Cloudflare Vectorize |
| **AI** | Claude API + OpenAI API |
| **Auth** | Clerk OR custom JWT |

---

## Priority Order

1. **Auth + Save** — Users need to save their work
2. **Dev Deploy** — The "wow" feature, ship projects
3. **AI Chat** — Everyone expects AI now
4. **Cyber Templates** — Differentiation for security folks
5. **FooHub Git** — Advanced users want version control
6. **Mind Maps** — Nice to have, visual brainstorming

---

## Next Steps

1. **This week:** Finish auth flow, spaces CRUD, doc save
2. **Next week:** R2 file uploads, image paste in editor  
3. **Week 3:** Projects API, file tree backend
4. **Week 4:** Deploy pipeline via Cloudflare Pages

---

*Generated from existing codebase analysis*
