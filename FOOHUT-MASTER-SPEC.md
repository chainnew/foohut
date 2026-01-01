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

> **See full specification:** This is an index file. The complete spec is in the downloadable document.
> 
> **Quick Links:**
> - `SCOPE.md` — Core platform scope
> - `SCOPE-COMMUNITY.md` — Social & chat features
> - `FOOHUT-MASTER-SPEC.md` — This document (complete)

---

## TL;DR — What FooHut Is

FooHut is **GitBook × GitHub × Bolt.new × Discord** unified:

| Module | What It Does | Competitive Edge |
|--------|--------------|------------------|
| **📝 Space** | Docs/wiki like Obsidian | AI-powered, Git-synced |
| **💻 Dev** | Browser IDE like Bolt.new | Built-in "FooHub" git |
| **🔒 Cyber** | Templates + diagrams | Napkin-style, threat intel |
| **💬 Chat** | IRC-style community | #channels, /commands, friends |
| **👤 Profile** | Public pages like GitHub | Activity, badges, social |

---

## The Five Spaces

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

---

## Development Phases (52 Weeks)

| Phase | Weeks | Focus | Exit Criteria |
|-------|-------|-------|---------------|
| **0** | 1-4 | Foundation | Users can sign up |
| **1** | 5-10 | Docs MVP | Teams can publish docs |
| **2** | 11-16 | Collaboration | Docs reviewed like code |
| **3** | 17-24 | Dev Platform | Users can build & ship |
| **4** | 25-30 | Community | FooHut has a community |
| **5** | 31-36 | AI Native | AI reduces maintenance |
| **6** | 37-42 | Cyber + Advanced | Security teams adopt |
| **7** | 43-52 | Enterprise | Enterprise customers onboard |

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Vite + React 18 + TypeScript |
| **Styling** | Tailwind CSS |
| **State** | Zustand |
| **Editor** | Tiptap (ProseMirror) |
| **Code Editor** | Monaco |
| **Real-time** | Yjs + Durable Objects |
| **Backend** | Cloudflare Workers + Hono |
| **Database** | D1 (SQLite) |
| **Storage** | R2 |
| **Vectors** | Vectorize |
| **AI** | Claude 3.5 Sonnet |

---

## What's Already Built ✅

From `foohut.ui/src/components/`:

- ✅ Block Editor (Tiptap + slash commands)
- ✅ AI Panel (chat, suggestions, inline)
- ✅ Artifacts (code, charts, diagrams, React)
- ✅ Developer Portal (file tree, Monaco, terminal)
- ✅ Sandbox (Sandpack runner)
- ✅ Stencils (cyber, data, visual)
- ✅ Templates (threat reports, incident response)
- ✅ Presentations (slides, speaker notes)
- ✅ Navigation (tree view, groups)
- ✅ Landing Page (hero, features, pricing)

---

## What Needs Building 🚧

- 🚧 Auth backend (JWT, OAuth)
- 🚧 Document persistence (D1)
- 🚧 File uploads (R2)
- 🚧 Real-time collaboration (Durable Objects)
- 🚧 Chat system (channels, DMs, presence)
- 🚧 Friend system (requests, mutual friends)
- 🚧 Change Requests (doc PRs, diff viewer)
- 🚧 AI RAG pipeline (embeddings, search)
- 🚧 Deploy pipeline (Cloudflare Pages)

---

## Priority Order

1. **Auth + Save** — Users need to save work
2. **Publishing** — Users want to share
3. **Collaboration** — Teams want multiplayer
4. **Dev Platform** — Builders want to build
5. **Community** — People want connection
6. **AI** — Everyone expects it now
7. **Cyber** — Differentiation for security folks
8. **Enterprise** — Pay the bills

---

*"Come for the docs, stay for the vibes"* 🚀

---

**Full specification available in download.**
