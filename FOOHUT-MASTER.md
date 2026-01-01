
# FOOHUT — Master Technical Specification

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│    ███████╗ ██████╗  ██████╗ ██╗  ██╗██╗   ██╗████████╗                    │
│    ██╔════╝██╔═══██╗██╔═══██╗██║  ██║██║   ██║╚══██╔══╝                    │
│    █████╗  ██║   ██║██║   ██║███████║██║   ██║   ██║                       │
│    ██╔══╝  ██║   ██║██║   ██║██╔══██║██║   ██║   ██║                       │
│    ██║     ╚██████╔╝╚██████╔╝██║  ██║╚██████╔╝   ██║                       │
│    ╚═╝      ╚═════╝  ╚═════╝ ╚═╝  ╚═╝ ╚═════╝    ╚═╝                       │
│                                                                             │
│    AI-Native Docs • Dev Platform • Real-Time Collaboration • Community     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Version:** 2.0  
**Status:** Development Specification  
**Live:** https://foohut.com  
**Codebase:** `/Volumes/Hendrix/foohut`

---

## Table of Contents

1. [Vision & Strategy](#1-vision--strategy)
2. [Product Architecture](#2-product-architecture)
3. [User Journeys](#3-user-journeys)
4. [Module Specifications](#4-module-specifications)
5. [Data Architecture](#5-data-architecture)
6. [API Specification](#6-api-specification)
7. [Real-Time Systems](#7-real-time-systems)
8. [AI Systems](#8-ai-systems)
9. [Security & Compliance](#9-security--compliance)
10. [Infrastructure](#10-infrastructure)
11. [Development Phases](#11-development-phases)
12. [Component Inventory](#12-component-inventory)

---

# 1. Vision & Strategy

## 1.1 The One-Liner

**FooHut is where teams write docs, build code, review changes, and ship—together.**

Think: GitBook's polish × GitHub's workflows × Bolt.new's AI magic × Discord's community vibes.

## 1.2 The Problem We Solve

```
Today's dev workflow is fragmented:
┌─────────────┐   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐
│   Notion    │   │   GitHub    │   │   Slack     │   │  Vercel/    │
│   (docs)    │ + │   (code)    │ + │   (chat)    │ + │  Netlify    │
│             │   │             │   │             │   │  (deploy)   │
└─────────────┘   └─────────────┘   └─────────────┘   └─────────────┘
      ↓                 ↓                 ↓                 ↓
  Context lost     No doc review     No doc context    Manual deploys
  
FooHut unifies this:
┌─────────────────────────────────────────────────────────────────────┐
│                           FOOHUT                                     │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐       │
│  │  Docs   │ │  Code   │ │  Chat   │ │ Deploy  │ │   AI    │       │
│  │ Editor  │ │   IDE   │ │  IRC    │ │  Edge   │ │  RAG    │       │
│  └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘       │
│       └──────────┴──────────┴──────────┴──────────┘                │
│                    Unified Data Layer                               │
└─────────────────────────────────────────────────────────────────────┘
```

## 1.3 Core Product Pillars

| Pillar | What It Means | Competitive Edge |
|--------|---------------|------------------|
| **📝 AI-Powered Docs** | RAG search, AI writing, auto-maintenance | GitBook doesn't have real AI |
| **🔄 Git Sync** | Bi-directional GitHub sync, doc PRs | Notion can't do this |
| **👥 Real-Time Collab** | Multiplayer editing, comments, reviews | Better than Google Docs |
| **🎨 Visual Docs** | Napkin-style diagrams inline | Miro is separate tool |
| **💻 Dev Platform** | Browser IDE, sandboxes, deploy | Bolt.new for docs teams |
| **💬 Community** | IRC chat, profiles, friends | GitBook has no community |
| **🏢 Enterprise** | SSO, RBAC, audit logs, compliance | Table stakes |
| **⚡ Instant Deploy** | Edge-hosted, preview deploys | Built-in, not bolted on |

## 1.4 Design Principles

1. **Docs are first-class** — Not an afterthought of code
2. **Git-compatible** — Teams choose their source of truth
3. **Collaboration is contextual** — Comments live on content, not in separate threads
4. **AI is safe + auditable** — Citations, permissions, reviewable actions
5. **Fast by default** — Edge delivery, caching, incremental builds
6. **Community-native** — Built for connection, not just consumption

## 1.5 Non-Goals (For Now)

- Full Jira/Linear replacement (keep tasks lightweight)
- Full Slack replacement (chat is docs-focused)
- Multi-language IDE with full LSP (phase later)
- Mobile apps (web-first, PWA later)

---

# 2. Product Architecture

## 2.1 The Five Spaces

FooHut organizes around five interconnected "spaces":

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FOOHUT APP                                      │
├─────────────┬─────────────┬─────────────┬─────────────┬─────────────────────┤
│    SPACE    │     DEV     │    CYBER    │    CHAT     │      PROFILE        │
│  (Obsidian) │  (Bolt.new) │  (Napkin)   │   (IRC)     │     (GitHub)        │
├─────────────┼─────────────┼─────────────┼─────────────┼─────────────────────┤
│ • Docs/Wiki │ • Projects  │ • Templates │ • Channels  │ • Public page       │
│ • Pages     │ • Browser   │ • Stencils  │ • DMs       │ • Activity feed     │
│ • Folders   │   IDE       │ • Diagrams  │ • Threads   │ • Projects          │
│ • Publish   │ • Sandbox   │ • Threat    │ • @mentions │ • Friends           │
│ • Search    │ • Deploy    │   Intel     │ • /commands │ • Badges            │
│ • AI Chat   │ • FooHub    │ • Export    │ • Presence  │ • Stats             │
└─────────────┴─────────────┴─────────────┴─────────────┴─────────────────────┘
```

## 2.2 Information Architecture

### Marketing Site (`foohut.com`)

```
/                       → Landing page
/features               → Feature breakdown
/pricing                → Plans & pricing
/docs                   → Product documentation (public)
/blog                   → Content marketing
/changelog              → What's new
/about                  → Company info
/login                  → Auth
/register               → Sign up (multi-step)
```

### App (`app.foohut.com` or `/app`)

```
/app                           → Dashboard (home)
/app/spaces                    → All spaces list
/app/space/:id                 → Space workspace
/app/space/:id/page/:pageId    → Page editor
/app/space/:id/changes         → Change requests (doc PRs)
/app/space/:id/settings        → Space settings

/dev                           → Developer dashboard
/dev/projects                  → All projects
/dev/project/:id               → Project IDE
/dev/project/:id/files         → File explorer
/dev/project/:id/preview       → Live preview
/dev/project/:id/deploys       → Deploy history
/dev/explore                   → Explore public projects

/cyber                         → Cyber workspace
/cyber/templates               → Document templates
/cyber/stencils                → Diagram stencils
/cyber/threats                 → Threat intelligence

/chat                          → Chat home
/chat/c/:channel               → Public channel
/chat/dm/:id                   → Direct message
/chat/org/:org/:channel        → Org channel

/u/:username                   → Public profile
/u/:username/projects          → User's projects
/u/:username/friends           → User's friends

/org/:slug                     → Organization home
/org/:slug/members             → Member management
/org/:slug/teams               → Teams
/org/:slug/settings            → Org settings
/org/:slug/billing             → Billing (pro/enterprise)

/settings                      → User settings
/settings/profile              → Edit profile
/settings/security             → Password, 2FA
/settings/notifications        → Notification preferences
/settings/integrations         → Connected apps
```

### Public Docs (`docs.foohut.com` or custom domains)

```
/:spaceSlug                    → Space home
/:spaceSlug/:pageSlug          → Published page
/:spaceSlug/search             → Search within space
```

## 2.3 Navigation Model

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ [🏠] [Space ▼] [Dev] [Cyber] [Chat 💬3]           🔍 Cmd+K    [@matto ▼]   │
├─────────────────────────────────────────────────────────────────────────────┤
│ ┌─────────────┐ ┌───────────────────────────────────────┐ ┌───────────────┐│
│ │ SIDEBAR     │ │ MAIN CONTENT                          │ │ PANEL         ││
│ │             │ │                                       │ │ (AI/Comments/ ││
│ │ Navigation  │ │ Editor / IDE / Dashboard / Chat       │ │  Activity)    ││
│ │ Tree        │ │                                       │ │               ││
│ │             │ │                                       │ │               ││
│ │ [+] Page    │ │                                       │ │               ││
│ │             │ │                                       │ │               ││
│ └─────────────┘ └───────────────────────────────────────┘ └───────────────┘│
└─────────────────────────────────────────────────────────────────────────────┘
```

---

# 3. User Journeys

## 3.1 Persona: Dev Team Lead (Primary)

**Goal:** Replace scattered docs with reviewable, deployable documentation.

```
Journey: Set Up Team Documentation
─────────────────────────────────────────────────────────────────────────────
1. Sign up → Create org "Acme Corp"
2. Create Space "Engineering Docs"
3. Import from GitHub repo /docs folder
4. Team edits in FooHut
5. Changes create "Change Requests" (like PRs)
6. Review → Approve → Merge → Auto-deploy to docs.acme.com
7. AI answers questions from docs with citations
```

## 3.2 Persona: Solo Developer

**Goal:** Build in public, find collaborators, ship projects.

```
Journey: Build & Share a Project
─────────────────────────────────────────────────────────────────────────────
1. Sign up → Set up profile @alice
2. Create project "cool-cli"
3. Code in browser IDE
4. Deploy to cool-cli.foohut.dev
5. Write docs in connected Space
6. Share in #showcase chat channel
7. Get stars, find collaborator in #lookingfor
8. Add friend, collab in real-time
```

## 3.3 Persona: Security Analyst

**Goal:** Create threat reports with diagrams and templates.

```
Journey: Write Threat Report
─────────────────────────────────────────────────────────────────────────────
1. Go to /cyber
2. Choose "Threat Report" template
3. Fill variables (CVE, affected systems, etc.)
4. Add napkin-style attack diagram
5. AI suggests related CVEs from feed
6. Export to PDF for stakeholders
7. Publish internal version to team Space
```

## 3.4 Persona: Community Member

**Goal:** Hang out, learn, contribute to open projects.

```
Journey: Join the Community
─────────────────────────────────────────────────────────────────────────────
1. Sign up → Complete profile
2. Auto-join #foohut channel
3. Browse #help, answer a question
4. Earn "Helpful" badge
5. Find interesting project in /dev/explore
6. Star it, fork it, submit improvement
7. DM the creator, become friends
8. Collab on next project together
```

---

# 4. Module Specifications

## 4.1 Module: Space (Docs/Wiki)

### 4.1.1 Overview

Spaces are collections of pages—like a GitBook space or Notion workspace. They can be:
- **Personal:** Only you can edit
- **Org:** Team members can edit based on roles
- **Public:** Anyone can view (published docs)

### 4.1.2 Page Editor

**Block Types (Priority Order):**

| Block | Description | P0/P1/P2 |
|-------|-------------|----------|
| `paragraph` | Rich text with inline formatting | P0 |
| `heading` | H1-H6 with anchor links | P0 |
| `code` | Syntax highlighting (50+ langs) | P0 |
| `callout` | Info/warning/tip/danger boxes | P0 |
| `image` | Upload/paste, R2 storage | P0 |
| `list` | Bullet, numbered, checklist | P0 |
| `quote` | Blockquotes | P0 |
| `divider` | Horizontal rule | P0 |
| `table` | Resizable columns, sorting | P1 |
| `embed` | YouTube, Figma, Loom, etc. | P1 |
| `file` | File attachments | P1 |
| `toggle` | Collapsible sections | P1 |
| `tabs` | Tabbed content | P1 |
| `api-reference` | OpenAPI renderer | P1 |
| `mermaid` | Mermaid diagrams | P1 |
| `diagram` | Napkin canvas (inline) | P1 |
| `ai-chat` | Inline AI with RAG | P2 |
| `columns` | Multi-column layout | P2 |
| `database` | Notion-style tables | P3 |

**Editor Features:**
- [ ] Slash commands (`/` menu)
- [ ] Markdown shortcuts (##, **, etc.)
- [ ] Drag-drop block reordering
- [ ] Block selection (multi-select)
- [ ] Copy/paste with formatting
- [ ] Undo/redo (Ctrl+Z)
- [ ] Autosave (debounced 500ms)
- [ ] Version history
- [ ] Export (Markdown, HTML, PDF)

### 4.1.3 Navigation Tree

```
┌─────────────────────────┐
│ 📚 Engineering Docs     │ ← Space
│ ├── 🏠 Home            │ ← Pages
│ ├── 📁 Getting Started │ ← Folders
│ │   ├── Installation   │
│ │   └── Quick Start    │
│ ├── 📁 API Reference   │
│ │   ├── Authentication │
│ │   └── Endpoints      │
│ └── Changelog          │
├─────────────────────────┤
│ [+ New Page]           │
└─────────────────────────┘
```

**Features:**
- [ ] Drag-drop reorder
- [ ] Nested folders (unlimited depth)
- [ ] Page icons (emoji picker)
- [ ] Page status: Draft → In Review → Published
- [ ] Search within tree (Cmd+K)
- [ ] Favorites / pinned pages

### 4.1.4 Publishing

**Publishing Modes:**
| Mode | Description |
|------|-------------|
| **Private** | Only workspace members |
| **Password** | Anyone with password |
| **Public** | Anyone on the internet |
| **Unlisted** | Anyone with link |

**Publishing Features:**
- [ ] Custom subdomain: `acme.foohut.com`
- [ ] Custom domain: `docs.acme.com` (Enterprise)
- [ ] SEO controls (title, description, OG image)
- [ ] Sitemap generation
- [ ] Google Analytics integration
- [ ] Feedback widget (thumbs up/down)
- [ ] "Edit this page" links to source

### 4.1.5 Change Requests (Doc PRs)

The killer feature: **review docs like code.**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Change Request #42: Update API Authentication Docs                          │
├─────────────────────────────────────────────────────────────────────────────┤
│ Created by @alice • 2 hours ago • 3 pages changed                           │
│                                                                             │
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐                            │
│ │ 📄 Files    │ │ 💬 Comments │ │ ✓ Checks    │                            │
│ │ Changed (3) │ │ (5)         │ │ Passed      │                            │
│ └─────────────┘ └─────────────┘ └─────────────┘                            │
│                                                                             │
│ ┌─────────────────────────────────────────────────────────────────────────┐│
│ │ api/authentication.md                                          +15 -3  ││
│ │─────────────────────────────────────────────────────────────────────────││
│ │ - Use `Bearer` token in Authorization header                           ││
│ │ + Use `Bearer` token in the `Authorization` header.                    ││
│ │ + Include your API key from the dashboard.                             ││
│ │ +                                                                      ││
│ │ + ```bash                                                              ││
│ │ + curl -H "Authorization: Bearer YOUR_API_KEY" https://api.acme.com    ││
│ │ + ```                                                                  ││
│ └─────────────────────────────────────────────────────────────────────────┘│
│                                                                             │
│ Reviewers: @bob ✓ Approved  @charlie 🔄 Requested changes                  │
│                                                                             │
│ [View Preview] [Request Review] [Merge & Publish]                          │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Workflow:**
1. User edits pages (creates branch internally)
2. User opens Change Request
3. Reviewers get notified
4. Reviewers comment, approve, or request changes
5. Author addresses feedback
6. Approved → Merge → Auto-deploy to production
7. Each CR gets preview URL: `pr-42.docs.acme.foohut.dev`

---

## 4.2 Module: Dev (Bolt.new-style Platform)

### 4.2.1 Overview

The Dev module is FooHut's answer to "I want to build something." It's Bolt.new meets GitHub meets Vercel.

### 4.2.2 Project Dashboard

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Developer Dashboard                    [Import from GitHub] [+ New Project] │
├─────────────────────────────────────────────────────────────────────────────┤
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐            │
│ │ 📁 12       │ │ ⭐ 287      │ │ 📊 247      │ │ 🚀 2        │            │
│ │ Projects    │ │ Total Stars │ │ Commits     │ │ Active      │            │
│ └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘            │
│                                                                             │
│ Your Projects                                    🔍 Search    [All ▼]       │
│ ┌─────────────────────────────────────────────────────────────────────────┐│
│ │ ● my-react-app                                              public      ││
│ │   A modern React application with TypeScript                            ││
│ │   TypeScript • ⭐ 42 • 🍴 12 • Updated 2 hours ago                      ││
│ ├─────────────────────────────────────────────────────────────────────────┤│
│ │ ● api-gateway                                               private     ││
│ │   High-performance API gateway with rate limiting                       ││
│ │   Go • ⭐ 156 • 🍴 34 • Updated yesterday                               ││
│ └─────────────────────────────────────────────────────────────────────────┘│
│                                                                             │
│ Recent Activity                                                             │
│ ├── 🔧 Fix navigation bug • my-react-app • 2 hours ago                    │
│ ├── ⭐ Received a star • api-gateway • 5 hours ago                        │
│ └── 🍴 Project was forked • ml-pipeline • 1 day ago                       │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 4.2.3 Browser IDE

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ my-react-app                              [▶ Run] [📤 Deploy] [⚙️ Settings]│
├──────────────┬──────────────────────────────────┬───────────────────────────┤
│ FILES        │ src/App.tsx                  [×] │ PREVIEW                   │
│              │──────────────────────────────────│                           │
│ ▼ src        │ 1  import React from 'react';   │ ┌───────────────────────┐ │
│   App.tsx  ● │ 2  import { Button } from './ui';│ │                       │ │
│   index.tsx  │ 3                                │ │   Hello World! 👋     │ │
│   styles.css │ 4  export function App() {      │ │                       │ │
│ ▼ components │ 5    return (                   │ │   [Click Me]          │ │
│   Button.tsx │ 6      <div className="app">    │ │                       │ │
│   Header.tsx │ 7        <h1>Hello World!</h1>  │ │                       │ │
│ package.json │ 8        <Button>Click Me</But..│ └───────────────────────┘ │
│ tsconfig.json│ 9      </div>                   │                           │
│              │10    );                         │ localhost:3000            │
│──────────────│11  }                            │───────────────────────────│
│ [+ New File] │                                 │ TERMINAL                  │
│ [+ Folder]   │                                 │ $ npm run dev             │
│              │                                 │ > vite                    │
│ DEPENDENCIES │                                 │ Server running at :3000   │
│ react ^18.2  │                                 │ _                         │
│ typescript   │                                 │                           │
└──────────────┴──────────────────────────────────┴───────────────────────────┘
```

**IDE Features:**
- [ ] Monaco editor (VS Code core)
- [ ] File tree with create/rename/delete
- [ ] Multi-tab editing
- [ ] Split view
- [ ] Syntax highlighting (50+ languages)
- [ ] IntelliSense for JS/TS (via TypeScript worker)
- [ ] Integrated terminal (xterm.js)
- [ ] Live preview with hot reload
- [ ] Package manager (npm install inline)
- [ ] Git panel (commit, push, pull)

### 4.2.4 Templates

**Starter Templates:**
| Template | Stack | Description |
|----------|-------|-------------|
| `react-ts` | React + TypeScript + Vite | Modern React app |
| `next-app` | Next.js + TypeScript | Full-stack React |
| `vue-ts` | Vue 3 + TypeScript + Vite | Vue application |
| `vanilla-js` | HTML + CSS + JavaScript | Simple static site |
| `node-api` | Node.js + Express + TypeScript | REST API |
| `python-api` | Python + FastAPI | Python REST API |
| `docs-site` | Markdown + FooHut theme | Documentation |

### 4.2.5 FooHub (Git-like Features)

Not full Git—simple, understandable version control:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ History                                                      [+ New Commit] │
├─────────────────────────────────────────────────────────────────────────────┤
│ ● a1b2c3d  Add user authentication                    @alice • 2 hours ago │
│ │          Modified: src/auth.ts, src/App.tsx                              │
│ │                                                                          │
│ ● d4e5f6g  Initial commit                             @alice • 1 day ago   │
│            Created: 12 files                                               │
├─────────────────────────────────────────────────────────────────────────────┤
│ [View Diff] [Restore This Version]                                          │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Features:**
- [ ] Commit with message
- [ ] View history
- [ ] Diff viewer
- [ ] Restore to previous version
- [ ] Fork project
- [ ] Star project
- [ ] GitHub import (clone repo)
- [ ] GitHub export (push to repo)

### 4.2.6 Deployment

**Deploy Flow:**
1. User clicks "Deploy"
2. System builds project (Vite for React, esbuild for vanilla)
3. Uploads to Cloudflare Pages
4. Returns URL: `project-name.foohut.dev`

**Deploy Features:**
- [ ] One-click deploy
- [ ] Preview deploys per commit
- [ ] Custom domains (Pro)
- [ ] Environment variables
- [ ] Deploy logs
- [ ] Rollback

---

## 4.3 Module: Cyber (Templates + Diagrams + Threat Intel)

### 4.3.1 Overview

The Cyber module serves security professionals with specialized templates, napkin-style diagrams, and threat intelligence integration.

### 4.3.2 Document Templates

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Templates                                               🔍 Search templates │
├─────────────────────────────────────────────────────────────────────────────┤
│ Security                                                                    │
│ ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐                │
│ │ 🔒 Threat Report│ │ 🚨 Incident     │ │ 📋 Security     │                │
│ │                 │ │    Response     │ │    Advisory     │                │
│ │ Comprehensive   │ │ Step-by-step    │ │ Vulnerability   │                │
│ │ threat analysis │ │ IR playbook     │ │ disclosure      │                │
│ │                 │ │                 │ │                 │                │
│ │ [Use Template]  │ │ [Use Template]  │ │ [Use Template]  │                │
│ └─────────────────┘ └─────────────────┘ └─────────────────┘                │
│                                                                             │
│ Business                                                                    │
│ ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐                │
│ │ 📊 Executive    │ │ 📝 Project      │ │ 🎯 Proposal     │                │
│ │    Brief        │ │    Plan         │ │                 │                │
│ └─────────────────┘ └─────────────────┘ └─────────────────┘                │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Template Features:**
- [ ] Variable interpolation: `{{company_name}}`
- [ ] Conditional sections: `{{#if has_cve}}`
- [ ] Pre-built stencils included
- [ ] Export to PDF, DOCX
- [ ] Save as new template

### 4.3.3 Napkin-Style Diagrams

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Diagram Editor                                      [Export ▼] [Templates]  │
├────────────────┬────────────────────────────────────────────────────────────┤
│ STENCILS       │                                                            │
│                │    ┌─────────┐         ┌─────────┐                        │
│ Architecture   │    │ Client  │ ──────► │   LB    │                        │
│ ├── Server     │    └─────────┘         └────┬────┘                        │
│ ├── Database   │                             │                              │
│ ├── Cloud      │              ┌──────────────┼──────────────┐              │
│ ├── Container  │              │              │              │              │
│ └── API        │              ▼              ▼              ▼              │
│                │         ┌─────────┐   ┌─────────┐   ┌─────────┐          │
│ Network        │         │  Web 1  │   │  Web 2  │   │  Web 3  │          │
│ ├── Firewall   │         └────┬────┘   └────┬────┘   └────┬────┘          │
│ ├── Router     │              │              │              │              │
│ ├── Switch     │              └──────────────┼──────────────┘              │
│ └── VPN        │                             │                              │
│                │                             ▼                              │
│ Shapes         │                        ┌─────────┐                        │
│ ├── Box        │                        │   DB    │                        │
│ ├── Circle     │                        │ ░░░░░░░ │                        │
│ └── Arrow      │                        └─────────┘                        │
│                │                                                            │
│ [+ Upload]     │ [Hand tool] [Select] [Draw] [Text] [Connector]            │
└────────────────┴────────────────────────────────────────────────────────────┘
```

**Stencil Categories:**
| Category | Stencils |
|----------|----------|
| Architecture | Server, Database, Cloud, Container, API, Lambda |
| Network | Firewall, Router, Switch, VPN, Load Balancer |
| Security | Lock, Shield, Key, Alert, Bug, Hacker |
| AWS | EC2, S3, Lambda, RDS, CloudFront, etc. |
| Azure | VM, Blob, Functions, SQL, etc. |
| GCP | Compute, Storage, Functions, etc. |
| Flowchart | Decision, Process, Start/End, Connector |
| UX | Wireframe boxes, buttons, forms |

**Diagram Features:**
- [ ] Drag-drop stencils
- [ ] Auto-routing connectors
- [ ] Alignment guides
- [ ] Group/ungroup
- [ ] Layers
- [ ] Export: PNG, SVG, PDF
- [ ] Embed in docs
- [ ] Real-time collaboration

### 4.3.4 Threat Intelligence

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Threat Intelligence                                              [+ Feed]   │
├─────────────────────────────────────────────────────────────────────────────┤
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐            │
│ │ 🔴 12       │ │ 🟠 34       │ │ 🟡 89       │ │ 🟢 156      │            │
│ │ Critical    │ │ High        │ │ Medium      │ │ Low         │            │
│ └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘            │
│                                                                             │
│ Recent CVEs                                                    [Filter ▼]  │
│ ┌─────────────────────────────────────────────────────────────────────────┐│
│ │ 🔴 CVE-2024-1234 • Critical (9.8)                         2 hours ago  ││
│ │    Remote code execution in libfoo < 2.3.4                              ││
│ │    Affects: Your project "api-gateway" uses libfoo 2.3.0               ││
│ │    [View Details] [Create Task] [Add to Report]                        ││
│ ├─────────────────────────────────────────────────────────────────────────┤│
│ │ 🟠 CVE-2024-5678 • High (7.5)                             1 day ago    ││
│ │    SQL injection in postgres-connector                                  ││
│ └─────────────────────────────────────────────────────────────────────────┘│
│                                                                             │
│ Threat Feeds                                                                │
│ ├── ✓ NVD (National Vulnerability Database)                               │
│ ├── ✓ CISA KEV (Known Exploited Vulnerabilities)                          │
│ ├── ✓ AlienVault OTX                                                      │
│ └── ○ Shodan (requires API key)                                           │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Threat Features:**
- [ ] CVE search & browse
- [ ] Severity filtering
- [ ] Dependency scanning (match CVEs to your projects)
- [ ] RSS feed aggregation
- [ ] IOC tables
- [ ] MITRE ATT&CK mapping (P2)
- [ ] Export to STIX/TAXII (P3)

---

## 4.4 Module: Chat (IRC-Style Community)

### 4.4.1 Overview

Chat is FooHut's community layer—IRC vibes with modern UX. Not a Slack replacement, but a place to hang out, find collaborators, and get help.

### 4.4.2 Channel Layout

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ FooHut Chat                                                    [@matto ▼]   │
├────────────────┬────────────────────────────────────────┬───────────────────┤
│ CHANNELS       │ #foohut                              ⚙️│ ONLINE (47)       │
│                │────────────────────────────────────────│                   │
│ # foohut     3 │ ┌────────────────────────────────────┐│ You               │
│ # help         │ │ @alice                  12:34 PM  ││ ├── @matto        │
│ # lookingfor   │ │ Anyone working on a Rust CLI?     ││                   │
│ # showcase     │ └────────────────────────────────────┘│ Friends           │
│ # cybersec     │ ┌────────────────────────────────────┐│ ├── @alice 🟢    │
│ # frontend     │ │ @bob                    12:35 PM  ││ ├── @bob 🟢      │
│ # backend      │ │ Yeah! Check out my project:       ││ └── @charlie 🟡  │
│ # rust         │ │ 📦 rustcli ⭐ 42                  ││                   │
│ # ai-ml        │ │ [View Project]                    ││ In Channel        │
│ # off-topic    │ └────────────────────────────────────┘│ ├── @dave         │
│                │ ┌────────────────────────────────────┐│ ├── @eve          │
│ DIRECT MSGS    │ │ @matto                  12:36 PM  ││ └── +41 more      │
│ @alice (2)     │ │ sick, just starred it ⭐          ││                   │
│ @bob           │ └────────────────────────────────────┘│                   │
│                │ ┌────────────────────────────────────┐│                   │
│ ORG: Acme      │ │ * @charlie joined #foohut         ││                   │
│ # general      │ └────────────────────────────────────┘│                   │
│ # engineering  │────────────────────────────────────────│                   │
│                │ [Type a message...]           [Send] │                   │
│                │ / for commands • @ to mention        │                   │
└────────────────┴────────────────────────────────────────┴───────────────────┘
```

### 4.4.3 Default Channels

| Channel | Purpose | Auto-Join |
|---------|---------|-----------|
| `#foohut` | General chat, announcements | ✓ |
| `#help` | Get help with FooHut or code | ✓ |
| `#lookingfor` | Find collaborators (LFG) | |
| `#showcase` | Share your projects | |
| `#cybersec` | Security discussions | |
| `#frontend` | Frontend dev chat | |
| `#backend` | Backend/infra chat | |
| `#rust` | Rust programming | |
| `#python` | Python programming | |
| `#ai-ml` | AI/ML discussions | |
| `#off-topic` | Random, memes, vibes | |

### 4.4.4 IRC Commands

| Command | Action |
|---------|--------|
| `/join #channel` | Join a channel |
| `/leave` | Leave current channel |
| `/msg @user message` | Send direct message |
| `/me does something` | Action message: *matto does something* |
| `/whois @user` | View user profile |
| `/project name` | Link to project |
| `/doc name` | Link to document |
| `/search query` | Search messages |
| `/clear` | Clear chat window |
| `/help` | Show all commands |

### 4.4.5 Rich Features

**Link Previews:**
```
┌─────────────────────────────────────────────────────────────────────────────┐
│ @alice: Check out this project!                                             │
│ https://foohut.com/dev/project/abc123                                       │
│ ┌─────────────────────────────────────────────────────────────────────────┐│
│ │ 📦 spawn.new                                                 ⭐ 89     ││
│ │ Multi-agent AI orchestration framework                                  ││
│ │ Rust • @matto • Updated 2 hours ago                                    ││
│ │ [View Project] [Star]                                                  ││
│ └─────────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────────┘
```

**Code Blocks:**
```
@bob: Here's how to fix that:
```rust
fn main() {
    println!("Hello, FooHut!");
}
```
```

**Reactions:**
```
┌────────────────────────────────────────┐
│ @alice: Just shipped v2.0! 🚀         │
│ 🎉 5  🔥 3  ❤️ 2  👀 1               │
└────────────────────────────────────────┘
```

---

## 4.5 Module: Profile & Social

### 4.5.1 Public Profile

**Route:** `/u/:username`

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ ┌──────────┐                                                                │
│ │          │  @matto                                    [Add Friend] [DM]   │
│ │  AVATAR  │  Solution Architect • Perth, AU 🇦🇺                           │
│ │          │  "2024 Office Olympics Gold Medalist 🏆"                       │
│ └──────────┘                                                                │
│                                                                             │
│  🔗 github.com/matto  🐦 twitter.com/matto  🌐 matto.dev                   │
│                                                                             │
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐            │
│ │ 📁 12       │ │ ⭐ 287      │ │ 👥 47       │ │ 📄 34       │            │
│ │ Projects    │ │ Stars       │ │ Friends     │ │ Docs        │            │
│ └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘            │
│                                                                             │
│ 📌 Pinned                                                                   │
│ ┌───────────────────┐ ┌───────────────────┐ ┌───────────────────┐          │
│ │ spawn.new         │ │ threat.new        │ │ hypervisor        │          │
│ │ Multi-agent AI    │ │ Threat intel      │ │ Type 1 hypervisor │          │
│ │ ⭐ 89 • Rust     │ │ ⭐ 34 • TypeScript│ │ ⭐ 156 • Rust    │          │
│ └───────────────────┘ └───────────────────┘ └───────────────────┘          │
│                                                                             │
│ 🔥 Recent Activity                                                          │
│ ├── Created project "foo-cli" • 2 hours ago                                │
│ ├── Published "Getting Started with Rust" • 1 day ago                      │
│ ├── Starred @alice/awesome-tools • 2 days ago                              │
│ └── Commented on @bob/api-gateway • 3 days ago                             │
│                                                                             │
│ 🏆 Badges                                                                   │
│ [🌟 Early Adopter] [💯 100 Commits] [🤝 Helpful] [🐛 Bug Hunter]          │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 4.5.2 Friend System

**Mutual friends (not followers):**

```
Friend Request Flow:
┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│   @alice    │ ───► │  REQUEST    │ ───► │    @bob     │
│ clicks "Add │      │   SENT      │      │  sees       │
│   Friend"   │      │             │      │  notification│
└─────────────┘      └─────────────┘      └──────┬──────┘
                                                 │
                     ┌─────────────┐              │
                     │   NOW       │ ◄────────────┘
                     │  FRIENDS    │       accepts
                     └─────────────┘
```

**Friend Benefits:**
- See each other's activity
- DM without restrictions
- See online status
- Invite to private channels

### 4.5.3 Badges

| Badge | Criteria | Icon |
|-------|----------|------|
| Early Adopter | Joined in beta | 🌟 |
| First Project | Created first project | 🚀 |
| 100 Commits | Made 100 commits | 💯 |
| Helpful | Answered 10 questions in #help | 🤝 |
| Bug Hunter | Reported 5 valid bugs | 🐛 |
| Contributor | Contributed to FooHut | 🛠️ |
| Popular | Project got 100 stars | 🔥 |
| Verified | Verified email + profile | ✓ |

---

## 4.6 Module: Organizations

### 4.6.1 Overview

Organizations let teams collaborate with shared resources, roles, and billing.

### 4.6.2 Org Structure

```
Organization: Acme Corp
├── Owner: @alice
├── Admins: @bob, @charlie
├── Members: @dave, @eve, +12 more
│
├── Teams
│   ├── Engineering (8 members)
│   ├── Security (3 members)
│   └── Documentation (4 members)
│
├── Shared Spaces
│   ├── Engineering Docs
│   ├── Security Policies
│   └── Product Wiki
│
├── Shared Projects
│   ├── acme-api
│   ├── acme-dashboard
│   └── acme-cli
│
└── Org Channels
    ├── #general
    ├── #engineering
    └── #random
```

### 4.6.3 Roles & Permissions

| Role | Permissions |
|------|-------------|
| **Owner** | Full control, delete org, transfer, billing |
| **Admin** | Manage members, teams, spaces, settings |
| **Member** | Access shared resources, create content |
| **Guest** | Limited access to specific resources |

**Space-Level Roles:**
| Role | Can View | Can Edit | Can Publish | Can Admin |
|------|----------|----------|-------------|-----------|
| Viewer | ✓ | | | |
| Commenter | ✓ | | | |
| Editor | ✓ | ✓ | | |
| Publisher | ✓ | ✓ | ✓ | |
| Admin | ✓ | ✓ | ✓ | ✓ |

### 4.6.4 Org Switcher

```
┌─────────────────────────────┐
│ 👤 matto                ▼   │
├─────────────────────────────┤
│ Personal Account            │
│ ─────────────────────────── │
│ 🏢 Acme Corp               │
│ 🏢 FooHut Open Source      │
│ 🏢 Security Research Lab   │
│ ─────────────────────────── │
│ + Create Organization       │
│ ⚙️ Manage Organizations     │
└─────────────────────────────┘
```

---

# 5. Data Architecture

## 5.1 Database Strategy

| Store | Technology | Purpose |
|-------|------------|---------|
| **Primary** | Cloudflare D1 (SQLite) | Users, orgs, metadata |
| **Objects** | Cloudflare R2 | Files, images, exports |
| **Cache** | Cloudflare KV | Sessions, presence, flags |
| **Vectors** | Cloudflare Vectorize | AI embeddings |
| **Real-time** | Durable Objects | WebSocket rooms |
| **Analytics** | PostgreSQL (Hyperdrive) | Time-series, reporting |

## 5.2 Complete Schema

```sql
-- ═══════════════════════════════════════════════════════════════════════════
-- IDENTITY & TENANCY
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE,
  name TEXT,
  avatar_url TEXT,
  bio TEXT,
  location TEXT,
  website TEXT,
  github_username TEXT,
  twitter_username TEXT,
  plan TEXT DEFAULT 'free',           -- 'free', 'pro', 'team'
  status TEXT DEFAULT 'offline',      -- 'online', 'away', 'dnd', 'offline'
  status_message TEXT,
  is_public BOOLEAN DEFAULT TRUE,
  email_verified_at DATETIME,
  last_seen_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  expires_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE organizations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  logo_url TEXT,
  description TEXT,
  website TEXT,
  owner_id TEXT NOT NULL REFERENCES users(id),
  plan TEXT DEFAULT 'free',           -- 'free', 'team', 'enterprise'
  settings JSON DEFAULT '{}',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE org_members (
  org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member', -- 'owner', 'admin', 'member', 'guest'
  joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (org_id, user_id)
);

CREATE TABLE teams (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE team_members (
  team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (team_id, user_id)
);

-- ═══════════════════════════════════════════════════════════════════════════
-- SPACES & DOCUMENTS
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE spaces (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  owner_id TEXT REFERENCES users(id),
  org_id TEXT REFERENCES organizations(id),
  visibility TEXT DEFAULT 'private',   -- 'private', 'public', 'password'
  password_hash TEXT,
  custom_domain TEXT,
  theme JSON DEFAULT '{}',
  settings JSON DEFAULT '{}',
  published_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(owner_id, slug),
  UNIQUE(org_id, slug)
);

CREATE TABLE space_members (
  space_id TEXT NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'editor', -- 'admin', 'publisher', 'editor', 'commenter', 'viewer'
  PRIMARY KEY (space_id, user_id)
);

CREATE TABLE pages (
  id TEXT PRIMARY KEY,
  space_id TEXT NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  parent_id TEXT REFERENCES pages(id) ON DELETE SET NULL,
  title TEXT NOT NULL DEFAULT 'Untitled',
  slug TEXT NOT NULL,
  icon TEXT,
  content JSON,                        -- Tiptap/ProseMirror JSON
  content_text TEXT,                   -- Plain text for search
  status TEXT DEFAULT 'draft',         -- 'draft', 'in_review', 'published', 'archived'
  position INTEGER DEFAULT 0,
  is_homepage BOOLEAN DEFAULT FALSE,
  seo_title TEXT,
  seo_description TEXT,
  og_image_url TEXT,
  created_by TEXT REFERENCES users(id),
  published_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(space_id, slug)
);

CREATE INDEX idx_pages_space ON pages(space_id);
CREATE INDEX idx_pages_parent ON pages(parent_id);
CREATE INDEX idx_pages_status ON pages(status);

CREATE TABLE page_versions (
  id TEXT PRIMARY KEY,
  page_id TEXT NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  content JSON NOT NULL,
  message TEXT,
  created_by TEXT REFERENCES users(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ═══════════════════════════════════════════════════════════════════════════
-- CHANGE REQUESTS (DOC PRs)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE change_requests (
  id TEXT PRIMARY KEY,
  space_id TEXT NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'open',          -- 'open', 'merged', 'closed'
  source_branch TEXT,                  -- internal branch name
  created_by TEXT NOT NULL REFERENCES users(id),
  merged_by TEXT REFERENCES users(id),
  merged_at DATETIME,
  preview_url TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE change_request_pages (
  id TEXT PRIMARY KEY,
  change_request_id TEXT NOT NULL REFERENCES change_requests(id) ON DELETE CASCADE,
  page_id TEXT REFERENCES pages(id),
  action TEXT NOT NULL,                -- 'create', 'update', 'delete'
  original_content JSON,
  new_content JSON,
  diff_html TEXT
);

CREATE TABLE change_request_reviews (
  id TEXT PRIMARY KEY,
  change_request_id TEXT NOT NULL REFERENCES change_requests(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id),
  status TEXT NOT NULL,                -- 'approved', 'changes_requested', 'commented'
  body TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ═══════════════════════════════════════════════════════════════════════════
-- PROJECTS (DEV PLATFORM)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  owner_id TEXT REFERENCES users(id),
  org_id TEXT REFERENCES organizations(id),
  visibility TEXT DEFAULT 'private',   -- 'public', 'private'
  template TEXT,                       -- 'react-ts', 'next-app', 'vanilla'
  language TEXT,                       -- Primary language
  stars_count INTEGER DEFAULT 0,
  forks_count INTEGER DEFAULT 0,
  forked_from TEXT REFERENCES projects(id),
  deploy_url TEXT,                     -- project.foohut.dev
  github_repo_url TEXT,
  github_repo_id TEXT,
  settings JSON DEFAULT '{}',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(owner_id, slug),
  UNIQUE(org_id, slug)
);

CREATE TABLE project_files (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  path TEXT NOT NULL,                  -- 'src/App.tsx'
  content TEXT,                        -- File content (small files)
  r2_key TEXT,                         -- R2 object key (large files)
  mime_type TEXT,
  size_bytes INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(project_id, path)
);

CREATE TABLE commits (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  snapshot JSON,                       -- File tree snapshot
  parent_id TEXT REFERENCES commits(id),
  created_by TEXT REFERENCES users(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE deploys (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  commit_id TEXT REFERENCES commits(id),
  status TEXT DEFAULT 'pending',       -- 'pending', 'building', 'success', 'failed'
  url TEXT,
  logs TEXT,
  is_production BOOLEAN DEFAULT FALSE,
  created_by TEXT REFERENCES users(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME
);

CREATE TABLE project_stars (
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (project_id, user_id)
);

-- ═══════════════════════════════════════════════════════════════════════════
-- COLLABORATION
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE comments (
  id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL,           -- 'page', 'change_request', 'project'
  entity_id TEXT NOT NULL,
  parent_id TEXT REFERENCES comments(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id),
  content TEXT NOT NULL,
  selection_start INTEGER,             -- For inline comments
  selection_end INTEGER,
  resolved BOOLEAN DEFAULT FALSE,
  resolved_by TEXT REFERENCES users(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_comments_entity ON comments(entity_type, entity_id);

CREATE TABLE reactions (
  id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL,           -- 'comment', 'message', 'page'
  entity_id TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(entity_type, entity_id, user_id, emoji)
);

CREATE TABLE mentions (
  id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL,           -- 'comment', 'message', 'page'
  entity_id TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ═══════════════════════════════════════════════════════════════════════════
-- SOCIAL & FRIENDS
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE friend_requests (
  id TEXT PRIMARY KEY,
  from_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  to_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending',       -- 'pending', 'accepted', 'declined'
  message TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  responded_at DATETIME,
  UNIQUE(from_user_id, to_user_id)
);

CREATE TABLE friendships (
  user_a TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_b TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_a, user_b),
  CHECK (user_a < user_b)              -- Consistent ordering
);

CREATE TABLE user_stats (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  projects_count INTEGER DEFAULT 0,
  spaces_count INTEGER DEFAULT 0,
  stars_received INTEGER DEFAULT 0,
  stars_given INTEGER DEFAULT 0,
  friends_count INTEGER DEFAULT 0,
  commits_count INTEGER DEFAULT 0
);

CREATE TABLE badges (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  criteria JSON
);

CREATE TABLE user_badges (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  badge_id TEXT NOT NULL REFERENCES badges(id),
  awarded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, badge_id)
);

CREATE TABLE activities (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,                  -- 'project_created', 'page_published', etc.
  entity_type TEXT,
  entity_id TEXT,
  metadata JSON,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_activities_user ON activities(user_id, created_at DESC);

-- ═══════════════════════════════════════════════════════════════════════════
-- CHAT
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE channels (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  type TEXT DEFAULT 'public',          -- 'public', 'private', 'org', 'dm'
  org_id TEXT REFERENCES organizations(id),
  created_by TEXT REFERENCES users(id),
  is_default BOOLEAN DEFAULT FALSE,
  member_count INTEGER DEFAULT 0,
  last_message_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(slug)
);

CREATE TABLE channel_members (
  channel_id TEXT NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member',          -- 'owner', 'admin', 'member'
  joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_read_at DATETIME,
  notifications TEXT DEFAULT 'all',    -- 'all', 'mentions', 'none'
  PRIMARY KEY (channel_id, user_id)
);

CREATE TABLE messages (
  id TEXT PRIMARY KEY,
  channel_id TEXT NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id),
  content TEXT NOT NULL,
  type TEXT DEFAULT 'text',            -- 'text', 'action', 'system', 'file'
  reply_to TEXT REFERENCES messages(id),
  edited_at DATETIME,
  deleted_at DATETIME,
  metadata JSON,                       -- { mentions: [], links: [], embeds: [] }
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_messages_channel ON messages(channel_id, created_at DESC);

CREATE TABLE dm_conversations (
  id TEXT PRIMARY KEY,
  type TEXT DEFAULT 'dm',              -- 'dm', 'group'
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE dm_participants (
  conversation_id TEXT NOT NULL REFERENCES dm_conversations(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  last_read_at DATETIME,
  PRIMARY KEY (conversation_id, user_id)
);

CREATE TABLE dm_messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES dm_conversations(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id),
  content TEXT NOT NULL,
  type TEXT DEFAULT 'text',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ═══════════════════════════════════════════════════════════════════════════
-- NOTIFICATIONS
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,                  -- 'mention', 'friend_request', 'star', etc.
  title TEXT,
  body TEXT,
  link TEXT,
  actor_id TEXT REFERENCES users(id),
  read_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notifications_user ON notifications(user_id, read_at, created_at DESC);

-- ═══════════════════════════════════════════════════════════════════════════
-- AI & EMBEDDINGS
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE ai_conversations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  space_id TEXT REFERENCES spaces(id),
  title TEXT,
  messages JSON DEFAULT '[]',
  model TEXT DEFAULT 'claude-3-5-sonnet',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE embeddings (
  id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL,           -- 'page', 'project_file'
  entity_id TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  chunk_text TEXT NOT NULL,
  vectorize_id TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE ai_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  type TEXT NOT NULL,                  -- 'chat', 'completion', 'code'
  input_tokens INTEGER,
  output_tokens INTEGER,
  model TEXT,
  duration_ms INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ═══════════════════════════════════════════════════════════════════════════
-- INTEGRATIONS
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE integrations (
  id TEXT PRIMARY KEY,
  org_id TEXT REFERENCES organizations(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,                  -- 'github', 'slack', 'linear'
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at DATETIME,
  settings JSON DEFAULT '{}',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE github_repos (
  id TEXT PRIMARY KEY,
  integration_id TEXT NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,
  space_id TEXT REFERENCES spaces(id),
  project_id TEXT REFERENCES projects(id),
  repo_full_name TEXT NOT NULL,        -- 'owner/repo'
  branch TEXT DEFAULT 'main',
  docs_path TEXT DEFAULT '/docs',
  sync_direction TEXT DEFAULT 'bidirectional', -- 'in', 'out', 'bidirectional'
  last_synced_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ═══════════════════════════════════════════════════════════════════════════
-- AUDIT LOG
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE audit_logs (
  id TEXT PRIMARY KEY,
  org_id TEXT REFERENCES organizations(id),
  user_id TEXT REFERENCES users(id),
  action TEXT NOT NULL,                -- 'login', 'page.create', 'member.add'
  entity_type TEXT,
  entity_id TEXT,
  ip_address TEXT,
  user_agent TEXT,
  metadata JSON,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_org ON audit_logs(org_id, created_at DESC);
CREATE INDEX idx_audit_user ON audit_logs(user_id, created_at DESC);

-- ═══════════════════════════════════════════════════════════════════════════
-- ARTIFACTS & TEMPLATES
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE artifacts (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,                  -- 'react', 'html', 'chart', 'diagram'
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

CREATE TABLE templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,                       -- 'security', 'business', 'technical'
  content JSON NOT NULL,
  variables JSON DEFAULT '[]',         -- [{ name, type, default }]
  stencils JSON DEFAULT '[]',          -- Included stencils
  owner_id TEXT REFERENCES users(id),
  org_id TEXT REFERENCES organizations(id),
  is_public BOOLEAN DEFAULT FALSE,
  usage_count INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE diagrams (
  id TEXT PRIMARY KEY,
  title TEXT,
  content JSON NOT NULL,               -- Canvas state
  thumbnail_url TEXT,
  owner_id TEXT REFERENCES users(id),
  space_id TEXT REFERENCES spaces(id),
  page_id TEXT REFERENCES pages(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ═══════════════════════════════════════════════════════════════════════════
-- THREAT INTEL
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE threat_feeds (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  type TEXT NOT NULL,                  -- 'rss', 'api', 'manual'
  owner_id TEXT REFERENCES users(id),
  org_id TEXT REFERENCES organizations(id),
  last_fetched_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE threat_items (
  id TEXT PRIMARY KEY,
  feed_id TEXT REFERENCES threat_feeds(id) ON DELETE CASCADE,
  title TEXT,
  description TEXT,
  severity TEXT,                       -- 'critical', 'high', 'medium', 'low'
  cve_id TEXT,
  cvss_score REAL,
  affected_products JSON,
  iocs JSON,
  source_url TEXT,
  published_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_threats_severity ON threat_items(severity);
CREATE INDEX idx_threats_cve ON threat_items(cve_id);
```

---

# 6. API Specification

## 6.1 API Overview

**Base URL:** `https://api.foohut.com/v1`

**Authentication:**
- Bearer token: `Authorization: Bearer <token>`
- API keys: `X-API-Key: <key>` (for integrations)

**Response Format:**
```json
{
  "success": true,
  "data": { ... },
  "meta": { "page": 1, "total": 100 }
}
```

**Error Format:**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid email format",
    "details": [{ "field": "email", "message": "Must be valid email" }]
  }
}
```

## 6.2 Endpoint Reference

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/register` | Create account |
| POST | `/auth/login` | Login, get token |
| POST | `/auth/logout` | Logout |
| POST | `/auth/refresh` | Refresh token |
| GET | `/auth/me` | Current user |
| POST | `/auth/oauth/:provider` | OAuth callback |
| POST | `/auth/password/reset` | Request password reset |
| POST | `/auth/password/change` | Change password |

### Users & Profiles

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/users/:username` | Get public profile |
| PATCH | `/users/me` | Update profile |
| GET | `/users/:id/activity` | Get activity feed |
| GET | `/users/:id/projects` | Get user's projects |
| GET | `/users/:id/spaces` | Get user's spaces |
| GET | `/users/:id/badges` | Get user's badges |

### Friends

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/friends` | List my friends |
| GET | `/friends/requests` | Pending requests |
| POST | `/friends/request/:userId` | Send request |
| POST | `/friends/accept/:requestId` | Accept request |
| POST | `/friends/decline/:requestId` | Decline request |
| DELETE | `/friends/:userId` | Remove friend |

### Organizations

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/orgs` | List my orgs |
| POST | `/orgs` | Create org |
| GET | `/orgs/:id` | Get org |
| PATCH | `/orgs/:id` | Update org |
| DELETE | `/orgs/:id` | Delete org |
| GET | `/orgs/:id/members` | List members |
| POST | `/orgs/:id/members` | Invite member |
| PATCH | `/orgs/:id/members/:userId` | Update role |
| DELETE | `/orgs/:id/members/:userId` | Remove member |
| GET | `/orgs/:id/teams` | List teams |
| POST | `/orgs/:id/teams` | Create team |

### Spaces

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/spaces` | List my spaces |
| POST | `/spaces` | Create space |
| GET | `/spaces/:id` | Get space + page tree |
| PATCH | `/spaces/:id` | Update space |
| DELETE | `/spaces/:id` | Delete space |
| GET | `/spaces/:id/members` | List members |
| POST | `/spaces/:id/members` | Add member |
| POST | `/spaces/:id/publish` | Publish space |

### Pages

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/pages/:id` | Get page |
| POST | `/spaces/:id/pages` | Create page |
| PATCH | `/pages/:id` | Update page |
| DELETE | `/pages/:id` | Delete page |
| POST | `/pages/:id/move` | Move page |
| GET | `/pages/:id/versions` | Get versions |
| POST | `/pages/:id/versions` | Save version |

### Change Requests

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/spaces/:id/changes` | List change requests |
| POST | `/spaces/:id/changes` | Create CR |
| GET | `/changes/:id` | Get CR details |
| PATCH | `/changes/:id` | Update CR |
| POST | `/changes/:id/review` | Submit review |
| POST | `/changes/:id/merge` | Merge CR |
| POST | `/changes/:id/close` | Close CR |

### Projects

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/projects` | List my projects |
| POST | `/projects` | Create project |
| GET | `/projects/:id` | Get project |
| PATCH | `/projects/:id` | Update project |
| DELETE | `/projects/:id` | Delete project |
| POST | `/projects/:id/star` | Star project |
| DELETE | `/projects/:id/star` | Unstar project |
| POST | `/projects/:id/fork` | Fork project |

### Project Files

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/projects/:id/files` | List all files |
| GET | `/projects/:id/files/*path` | Get file content |
| PUT | `/projects/:id/files/*path` | Create/update file |
| DELETE | `/projects/:id/files/*path` | Delete file |
| POST | `/projects/:id/files/bulk` | Bulk update |

### Commits & Deploys

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/projects/:id/commits` | List commits |
| POST | `/projects/:id/commits` | Create commit |
| GET | `/projects/:id/deploys` | List deploys |
| POST | `/projects/:id/deploys` | Deploy project |
| GET | `/deploys/:id` | Get deploy status |

### Chat

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/chat/channels` | List channels |
| GET | `/chat/channels/joined` | My channels |
| POST | `/chat/channels` | Create channel |
| GET | `/chat/channels/:id` | Get channel |
| POST | `/chat/channels/:id/join` | Join channel |
| POST | `/chat/channels/:id/leave` | Leave channel |
| GET | `/chat/channels/:id/messages` | Get messages |
| POST | `/chat/channels/:id/messages` | Send message |
| GET | `/chat/dms` | List DMs |
| POST | `/chat/dms` | Start DM |
| GET | `/chat/dms/:id/messages` | Get DM messages |
| POST | `/chat/dms/:id/messages` | Send DM |

### AI

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/ai/chat` | RAG chat |
| POST | `/ai/complete` | Text completion |
| POST | `/ai/code` | Code generation |
| POST | `/ai/summarize` | Summarize content |
| POST | `/ai/embed` | Generate embeddings |

### Files

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/files/upload` | Upload file to R2 |
| GET | `/files/:key` | Get file |
| DELETE | `/files/:key` | Delete file |

### Notifications

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/notifications` | List notifications |
| POST | `/notifications/:id/read` | Mark as read |
| POST | `/notifications/read-all` | Mark all as read |

### Search

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/search` | Global search |
| GET | `/spaces/:id/search` | Search in space |
| GET | `/projects/:id/search` | Search in project |

---

# 7. Real-Time Systems

## 7.1 WebSocket Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           REAL-TIME FLOW                                     │
│                                                                             │
│  Client A          Durable Object          Client B                         │
│     │                   │                     │                             │
│     │──── connect ────►│                     │                             │
│     │                   │◄──── connect ──────│                             │
│     │                   │                     │                             │
│     │── send message ──►│                     │                             │
│     │                   │─── broadcast ──────►│                             │
│     │                   │                     │                             │
│     │◄── presence ─────│───── presence ─────►│                             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 7.2 WebSocket Endpoints

| Endpoint | Purpose |
|----------|---------|
| `/ws/page/:pageId` | Page editing collaboration |
| `/ws/chat/:channelId` | Chat room |
| `/ws/presence` | Global presence |

## 7.3 Message Types

### Page Collaboration

```typescript
// Client → Server
{ type: 'sync', vector: Uint8Array }      // Yjs sync
{ type: 'awareness', state: AwarenessState }  // Cursor/selection

// Server → Client
{ type: 'sync', vector: Uint8Array }
{ type: 'awareness', clientId: string, state: AwarenessState }
```

### Chat

```typescript
// Client → Server
{ type: 'message', content: string, metadata?: object }
{ type: 'typing' }
{ type: 'reaction', messageId: string, emoji: string }

// Server → Client
{ type: 'message', id: string, userId: string, content: string, ... }
{ type: 'typing', userId: string }
{ type: 'user_joined', userId: string }
{ type: 'user_left', userId: string }
```

## 7.4 Presence System

**KV Structure:**
```
presence:{userId} → { status, lastSeen, channel }  // TTL: 60s
channel:{channelId}:members → Set<userId>
```

**Heartbeat:**
- Client sends ping every 30s
- Server updates KV TTL
- On disconnect, KV expires after 60s

---

# 8. AI Systems

## 8.1 RAG Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              RAG PIPELINE                                    │
│                                                                             │
│  Document Saved                                                              │
│       │                                                                     │
│       ▼                                                                     │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐                     │
│  │   Chunk     │───►│   Embed     │───►│   Store     │                     │
│  │  (500 tok)  │    │  (OpenAI)   │    │ (Vectorize) │                     │
│  └─────────────┘    └─────────────┘    └─────────────┘                     │
│                                                                             │
│  User Query                                                                 │
│       │                                                                     │
│       ▼                                                                     │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐ │
│  │   Embed     │───►│   Search    │───►│   Rerank    │───►│   Generate  │ │
│  │   Query     │    │  (top-10)   │    │  (top-5)    │    │  (Claude)   │ │
│  └─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘ │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 8.2 Chunking Strategy

```typescript
interface Chunk {
  id: string;
  entityType: 'page' | 'project_file';
  entityId: string;
  index: number;
  text: string;
  metadata: {
    title: string;
    url: string;
    headings: string[];
    spaceId?: string;
    projectId?: string;
  };
}

// Chunking rules:
// - Target: 500 tokens per chunk
// - Overlap: 50 tokens
// - Boundaries: Prefer paragraph/heading breaks
// - Max: 1000 tokens (hard limit)
```

## 8.3 AI Features

| Feature | Model | Use Case |
|---------|-------|----------|
| RAG Chat | Claude 3.5 Sonnet | Answer questions from docs |
| Writing | Claude 3.5 Sonnet | Draft, rewrite, summarize |
| Code | Claude 3.5 Sonnet | Generate, explain, refactor |
| Embeddings | text-embedding-3-small | Vector search |
| Summaries | Claude 3.5 Haiku | Quick summaries (cheaper) |

## 8.4 AI Safety

**Permission Enforcement:**
- AI only retrieves content user has access to
- Space-level filtering on vector search
- Citations link to source (verifiable)

**Audit Logging:**
- Every AI request logged
- Input/output tokens tracked
- Citations recorded

**Controls:**
- Org-level AI enable/disable
- Model selection (Pro feature)
- Rate limits per user/org

---

# 9. Security & Compliance

## 9.1 Authentication

| Method | Implementation |
|--------|----------------|
| Password | Argon2id hashing |
| Sessions | JWT (15min) + refresh tokens (7d) |
| OAuth | GitHub, Google, Microsoft |
| SSO | SAML 2.0 (Enterprise) |
| MFA | TOTP, WebAuthn (P2) |

## 9.2 Authorization

**RBAC Model:**
```
User → Org Role → Org Permissions
User → Space Role → Space Permissions
User → Project Role → Project Permissions
```

**Permission Checks:**
```typescript
// Every API endpoint checks:
await authorize(user, 'space.page.edit', { spaceId, pageId });
```

## 9.3 Data Security

| Requirement | Implementation |
|-------------|----------------|
| Encryption at rest | Cloudflare D1/R2 encryption |
| Encryption in transit | TLS 1.3 |
| Secrets | Cloudflare Secrets, never in code |
| PII | Minimal collection, deletion support |
| Backups | Daily D1 snapshots |

## 9.4 Audit Logging

**Logged Events:**
- Authentication (login, logout, failed attempts)
- Permission changes (role updates, member adds)
- Content changes (page edits, publishes)
- Integration events (GitHub sync, deploys)
- AI usage (queries, model, tokens)

## 9.5 Compliance

| Framework | Status |
|-----------|--------|
| GDPR | Required (EU users) |
| CCPA | Required (CA users) |
| SOC 2 | Planned (Year 1) |
| HIPAA | Enterprise tier |
| FedRAMP | Enterprise tier |

---

# 10. Infrastructure

## 10.1 Cloudflare Stack

| Service | Purpose |
|---------|---------|
| Workers | API, SSR, edge compute |
| D1 | Primary database |
| R2 | Object storage |
| KV | Cache, sessions, presence |
| Vectorize | AI embeddings |
| Durable Objects | Real-time collaboration |
| Pages | Static site hosting |
| Queues | Async jobs |
| Cron Triggers | Scheduled tasks |

## 10.2 External Services

| Service | Purpose |
|---------|---------|
| Clerk/Auth0 | Authentication (optional) |
| Anthropic | Claude AI |
| OpenAI | Embeddings, GPT fallback |
| Resend | Transactional email |
| PostHog | Analytics |
| Sentry | Error tracking |

## 10.3 CI/CD Pipeline

```yaml
name: CI/CD
on:
  push:
    branches: [main]
  pull_request:

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - run: pnpm install
      - run: pnpm lint
      - run: pnpm test
      - run: pnpm build

  deploy-preview:
    if: github.event_name == 'pull_request'
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: cloudflare/pages-action@v1
        with:
          branch: ${{ github.head_ref }}

  deploy-production:
    if: github.ref == 'refs/heads/main'
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: cloudflare/wrangler-action@v3
        with:
          command: deploy
```

---

# 11. Development Phases

## Phase 0: Foundation (Weeks 1-4)

**Goal:** Platform skeleton with auth and basic storage.

- [ ] Monorepo setup (Turborepo)
- [ ] CI/CD pipeline
- [ ] Design system + component library
- [ ] Auth (register, login, OAuth)
- [ ] Org + user CRUD
- [ ] D1 schema + migrations
- [ ] R2 file uploads
- [ ] Basic audit logging

**Exit:** Users can sign up and create an org.

---

## Phase 1: Docs MVP (Weeks 5-10)

**Goal:** Replace basic GitBook with FooHut.

- [ ] Space CRUD
- [ ] Page CRUD + tree navigation
- [ ] Block editor (15 block types)
- [ ] Autosave + version history
- [ ] Full-text search
- [ ] Publishing (public URLs)
- [ ] Basic theming
- [ ] Comments (non-realtime)

**Exit:** Teams can write and publish docs.

---

## Phase 2: Collaboration (Weeks 11-16)

**Goal:** Real-time editing and review workflow.

- [ ] Real-time co-editing (Yjs)
- [ ] Presence (cursors, avatars)
- [ ] Inline comments + @mentions
- [ ] Notifications (in-app, email)
- [ ] Change Requests (doc PRs)
- [ ] Diff viewer
- [ ] Review workflow (approve/reject)
- [ ] Preview deploys per CR

**Exit:** Docs can be reviewed like code.

---

## Phase 3: Dev Platform (Weeks 17-24)

**Goal:** Build and deploy projects in browser.

- [ ] Project CRUD
- [ ] File tree + Monaco editor
- [ ] Live preview (Sandpack)
- [ ] Terminal (xterm.js)
- [ ] FooHub (commits, history)
- [ ] Deploy to Cloudflare Pages
- [ ] GitHub import/export
- [ ] Public profiles + explore

**Exit:** Users can build and ship projects.

---

## Phase 4: Community (Weeks 25-30)

**Goal:** Social layer for collaboration.

- [ ] IRC-style chat (channels, DMs)
- [ ] Default channels (#foohut, #help, etc.)
- [ ] /commands support
- [ ] Friend system
- [ ] Badges + achievements
- [ ] Activity feeds
- [ ] Link previews in chat

**Exit:** FooHut has a community.

---

## Phase 5: AI Native (Weeks 31-36)

**Goal:** AI that's actually useful.

- [ ] RAG pipeline (embedding, search)
- [ ] AI chat with citations
- [ ] AI writing assistant
- [ ] Code assistant
- [ ] Stale doc detection
- [ ] Auto-summaries
- [ ] AI usage dashboard

**Exit:** AI reduces doc maintenance.

---

## Phase 6: Cyber + Advanced (Weeks 37-42)

**Goal:** Power user features.

- [ ] Document templates
- [ ] Napkin diagrams
- [ ] Stencil library
- [ ] Threat intel feeds
- [ ] CVE integration
- [ ] Export (PDF, DOCX)
- [ ] Mind map mode

**Exit:** Security teams adopt FooHut.

---

## Phase 7: Enterprise (Weeks 43-52)

**Goal:** Enterprise-ready platform.

- [ ] SSO/SAML
- [ ] SCIM provisioning
- [ ] Advanced audit logs
- [ ] Custom domains
- [ ] Retention policies
- [ ] Admin console
- [ ] Billing + plans

**Exit:** Enterprise customers onboarded.

---

# 12. Component Inventory

## 12.1 Existing Components (`foohut.ui/src/`)

### Pages
| Path | Component | Status |
|------|-----------|--------|
| `/` | `LandingPage.tsx` | ✅ Built |
| `/pricing` | `PricingPage.tsx` | ✅ Built |
| `/about` | `AboutPage.tsx` | ✅ Built |
| `/changelog` | `ChangelogPage.tsx` | ✅ Built |
| `/login` | `AuthPage.tsx` | ✅ Built |
| `/app` | `DashboardPage.tsx` | ✅ Built |
| `/app/space/:id` | `SpaceWorkspacePage.tsx` | ✅ Built |
| `/app/space/:id/doc/:id` | `EditorPage.tsx` | ✅ Built |
| `/dev` | `DevDashboard.tsx` | ✅ Built |
| `/dev/project/:id` | `ProjectView.tsx` | ✅ Built |
| `/dev/explore` | `ExplorePage.tsx` | ✅ Built |
| `/u/:username` | `ProfileView.tsx` | ✅ Built |

### Components (Built)
- `components/AI/` - AI panel, chat, suggestions
- `components/Artifacts/` - Code, chart, diagram, React artifacts
- `components/Developer/` - IDE, file explorer, terminal
- `components/Editor/` - Block editor, toolbar, slash menu
- `components/Landing/` - Hero, features, CTA, footer
- `components/Layout/` - App shell, sidebar, header
- `components/Navigation/` - Tree view, nav items
- `components/Presentation/` - Slides, presenter view
- `components/Sandbox/` - Sandpack preview/runner
- `components/Stencils/` - Cyber, data, visual stencils
- `components/Templates/` - Threat report, incident response

### Components (To Build)
- `components/Chat/` - Channels, messages, presence
- `components/Social/` - Friends, badges, activity
- `components/ChangeRequest/` - CR list, diff viewer, reviews
- `components/Org/` - Org switcher, member management
- `components/Threats/` - CVE browser, feed manager

### Stores (Zustand)
| Store | Purpose | Status |
|-------|---------|--------|
| `authStore` | User auth state | ✅ Built |
| `editorStore` | Document editor | ✅ Built |
| `fileStore` | Project files | ✅ Built |
| `projectStore` | Dev projects | ✅ Built |
| `workspaceStore` | Spaces | ✅ Built |
| `aiStore` | AI chat | ✅ Built |
| `layoutStore` | Panel sizes | ✅ Built |
| `uiStore` | Modals, toasts | ✅ Built |
| `chatStore` | Chat state | 🚧 To build |
| `friendStore` | Social | 🚧 To build |
| `notificationStore` | Notifications | 🚧 To build |

---

## Final Notes

This spec represents the full vision for FooHut—a platform that unifies documentation, development, and community in ways that existing tools don't.

**The key differentiators:**
1. **Doc PRs** — Review docs like code
2. **IRC Chat** — Community built-in, not bolted on
3. **AI Native** — RAG that actually helps
4. **Git Sync** — Bi-directional, not one-way
5. **Browser IDE** — Build without leaving

**Priority for shipping:**
1. Auth + save (users need persistence)
2. Publishing (users want to share)
3. Collaboration (teams want multiplayer)
4. Dev platform (builders want to build)
5. Community (people want connection)

---

*"Come for the docs, stay for the vibes"* 🚀

---

**Document History:**
| Version | Date | Changes |
|---------|------|---------|
| 2.0 | Jan 2026 | Complete rewrite with community layer |
| 1.0 | Dec 2025 | Initial spec |
