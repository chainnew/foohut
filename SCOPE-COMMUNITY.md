# FOOHUT — Community & Social Features Scope

**Addendum to:** `SCOPE.md`  
**Feature Set:** Organizations, Profiles, Friends, IRC Chat

---

## Overview

This adds the **community layer** that makes FooHut more than a tool—it's where devs hang out, find collaborators, and build shit together.

```
┌─────────────────────────────────────────────────────────────────┐
│                      FOOHUT COMMUNITY                            │
├─────────────────┬─────────────────┬─────────────────────────────┤
│   👤 PROFILES   │   🏢 ORGS       │   💬 CHAT (IRC-style)       │
│                 │                 │                              │
│ • Public pages  │ • Team mgmt    │ • #foohut (general)         │
│ • Activity feed │ • Shared spaces │ • #help (support)           │
│ • Friends list  │ • Permissions   │ • #lookingfor (collabs)     │
│ • Badges/stats  │ • Billing       │ • #cybersec, #frontend...   │
│ • DMs           │ • Invites       │ • Private channels          │
└─────────────────┴─────────────────┴─────────────────────────────┘
```

---

## 1. User Registration & Profiles

### 1.1 Registration Flow

```
/register
├── Email + Password (or OAuth)
├── Choose username (unique, alphanumeric, 3-20 chars)
├── Display name
├── Avatar upload (or Gravatar fallback)
└── Optional: Bio, location, website, GitHub link
```

**UI Components:**
```
pages/
├── RegisterPage.tsx      → Multi-step registration
├── OnboardingPage.tsx    → Post-signup setup (interests, follow suggestions)
└── SettingsPage.tsx      → Edit profile, security, notifications
```

### 1.2 Public Profile Page

**Route:** `/u/:username` or `/profile/:username`

```
┌─────────────────────────────────────────────────────────────────┐
│  ┌──────┐                                                       │
│  │ AVA  │  @matto                              [Add Friend] [DM]│
│  │ TAR  │  Solution Architect • Perth, AU                       │
│  └──────┘  "2024 Office Olympics Gold Medalist 🏆"              │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ 🔥 Activity                                                 ││
│  │ ├── Created project "spawn.new" • 2 hours ago              ││
│  │ ├── Published doc "Type 1 Hypervisor Guide" • 1 day ago    ││
│  │ └── Starred "threat-intel-dashboard" • 3 days ago          ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐            │
│  │ 12 Projects  │ │ 47 Friends   │ │ 156 Stars    │            │
│  └──────────────┘ └──────────────┘ └──────────────┘            │
│                                                                  │
│  📌 Pinned Projects                                             │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐   │
│  │ spawn.new       │ │ threat.new      │ │ foohut-cli      │   │
│  │ ⭐ 89 • Rust    │ │ ⭐ 34 • TS     │ │ ⭐ 12 • Go      │   │
│  └─────────────────┘ └─────────────────┘ └─────────────────┘   │
│                                                                  │
│  🏆 Badges                                                       │
│  [Early Adopter] [100 Commits] [Helpful] [Bug Hunter]          │
└─────────────────────────────────────────────────────────────────┘
```

### 1.3 Profile Data Model

```sql
-- Extend users table
ALTER TABLE users ADD COLUMN username TEXT UNIQUE;
ALTER TABLE users ADD COLUMN bio TEXT;
ALTER TABLE users ADD COLUMN location TEXT;
ALTER TABLE users ADD COLUMN website TEXT;
ALTER TABLE users ADD COLUMN github_username TEXT;
ALTER TABLE users ADD COLUMN twitter_username TEXT;
ALTER TABLE users ADD COLUMN is_public BOOLEAN DEFAULT TRUE;
ALTER TABLE users ADD COLUMN last_seen_at DATETIME;

-- User stats (denormalized for performance)
CREATE TABLE user_stats (
  user_id TEXT PRIMARY KEY REFERENCES users(id),
  projects_count INTEGER DEFAULT 0,
  stars_received INTEGER DEFAULT 0,
  stars_given INTEGER DEFAULT 0,
  friends_count INTEGER DEFAULT 0,
  docs_count INTEGER DEFAULT 0,
  commits_count INTEGER DEFAULT 0
);

-- Badges
CREATE TABLE badges (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,           -- emoji or icon key
  criteria JSON        -- auto-award rules
);

CREATE TABLE user_badges (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  badge_id TEXT NOT NULL REFERENCES badges(id),
  awarded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, badge_id)
);

-- Activity feed
CREATE TABLE activities (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,  -- 'project_created', 'doc_published', 'star', 'friend', 'commit'
  entity_type TEXT,    -- 'project', 'document', 'user'
  entity_id TEXT,
  metadata JSON,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_activities_user ON activities(user_id, created_at DESC);
```

---

## 2. Friends / Connections

### 2.1 Friend System

**Not followers—actual mutual friends** (like adding someone on Discord/Steam)

```
Friend Request Flow:
1. User A clicks "Add Friend" on User B's profile
2. User B gets notification
3. User B accepts/declines
4. If accepted: both are now friends, can DM, see private activity
```

### 2.2 Friends API

```
workers/api/src/routes/friends.ts
├── GET    /friends                    → List my friends
├── GET    /friends/requests           → Pending requests (incoming)
├── GET    /friends/requests/sent      → Sent requests (outgoing)
├── POST   /friends/request/:userId    → Send friend request
├── POST   /friends/accept/:requestId  → Accept request
├── POST   /friends/decline/:requestId → Decline request
├── DELETE /friends/:userId            → Remove friend
└── GET    /users/:id/friends          → View someone's friends (if public)
```

### 2.3 Friends Data Model

```sql
CREATE TABLE friend_requests (
  id TEXT PRIMARY KEY,
  from_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  to_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending',  -- 'pending', 'accepted', 'declined'
  message TEXT,                    -- optional "Hey, loved your project!"
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  responded_at DATETIME,
  UNIQUE(from_user_id, to_user_id)
);

CREATE TABLE friendships (
  user_a TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_b TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_a, user_b),
  CHECK (user_a < user_b)  -- Ensure consistent ordering
);

CREATE INDEX idx_friendships_a ON friendships(user_a);
CREATE INDEX idx_friendships_b ON friendships(user_b);
```

### 2.4 Friend UI Components

```
components/Social/
├── FriendsList.tsx        → Grid/list of friends with online status
├── FriendRequest.tsx      → Request card with accept/decline
├── AddFriendButton.tsx    → Button with request state
├── FriendSearch.tsx       → Search users to add
└── OnlineIndicator.tsx    → Green dot for online users
```

---

## 3. Organizations / Teams

### 3.1 Org Structure

```
Organization
├── Members (users with roles)
├── Teams (subgroups)
├── Shared Spaces (docs)
├── Shared Projects (code)
├── Private Channels (chat)
└── Billing (pro features)
```

### 3.2 Org Roles

| Role | Permissions |
|------|-------------|
| **Owner** | Full control, delete org, transfer ownership |
| **Admin** | Manage members, teams, billing |
| **Member** | Access shared spaces/projects, chat |
| **Guest** | Limited access to specific resources |

### 3.3 Org API

```
workers/api/src/routes/orgs.ts
├── GET    /orgs                      → List my orgs
├── POST   /orgs                      → Create org
├── GET    /orgs/:id                  → Get org details
├── PATCH  /orgs/:id                  → Update org
├── DELETE /orgs/:id                  → Delete org (owner only)
├── GET    /orgs/:id/members          → List members
├── POST   /orgs/:id/members          → Invite member (by email/username)
├── PATCH  /orgs/:id/members/:userId  → Change role
├── DELETE /orgs/:id/members/:userId  → Remove member
├── GET    /orgs/:id/teams            → List teams
├── POST   /orgs/:id/teams            → Create team
└── POST   /orgs/:id/leave            → Leave org
```

### 3.4 Org Data Model

```sql
CREATE TABLE organizations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  logo_url TEXT,
  description TEXT,
  website TEXT,
  owner_id TEXT NOT NULL REFERENCES users(id),
  plan TEXT DEFAULT 'free',  -- 'free', 'team', 'enterprise'
  settings JSON DEFAULT '{}',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE org_members (
  org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member',  -- 'owner', 'admin', 'member', 'guest'
  joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (org_id, user_id)
);

CREATE TABLE org_invites (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT,
  invited_by TEXT REFERENCES users(id),
  role TEXT DEFAULT 'member',
  token TEXT UNIQUE NOT NULL,
  expires_at DATETIME,
  accepted_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
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

-- Link spaces/projects to orgs
ALTER TABLE spaces ADD COLUMN org_id TEXT REFERENCES organizations(id);
ALTER TABLE projects ADD COLUMN org_id TEXT REFERENCES organizations(id);
```

### 3.5 Org Switcher (like GitBook)

```
┌─────────────────────────┐
│ 👤 matto            ▼   │  ← Dropdown in header
├─────────────────────────┤
│ Personal Account        │
│ ────────────────────    │
│ 🏢 Acme Corp           │
│ 🏢 FooHut Team         │
│ ────────────────────    │
│ + Create Organization   │
└─────────────────────────┘
```

---

## 4. IRC-Style Chat

### 4.1 Chat Architecture

**mIRC / XChat vibes with modern UX**

```
┌─────────────────────────────────────────────────────────────────┐
│  💬 FooHut Chat                                    [−][□][×]   │
├────────────────┬────────────────────────────────────────────────┤
│ CHANNELS       │ #foohut                                        │
│                │────────────────────────────────────────────────│
│ # foohut       │ [12:34] <@matto> yo anyone working on rust?   │
│ # help         │ [12:35] <alice> yeah building a CLI tool      │
│ # lookingfor   │ [12:36] <bob> check out my project /p/rustcli │
│ # cybersec     │ [12:37] <@matto> sick, starred it ⭐          │
│ # frontend     │ [12:38] * charlie has joined #foohut          │
│ # backend      │                                                │
│ # rust         │────────────────────────────────────────────────│
│ # ai-ml        │ [Type message... ]                    [Send]  │
│                │                                                │
│ DIRECT MSGS    ├────────────────────────────────────────────────┤
│                │ 👥 Online (47)                                 │
│ alice (2)      │ ├── @matto (you)                              │
│ bob            │ ├── alice                                      │
│                │ ├── bob                                        │
│ ORG: Acme      │ └── charlie                                   │
│ # general      │                                                │
│ # engineering  │                                                │
└────────────────┴────────────────────────────────────────────────┘
```

### 4.2 Channel Types

| Type | Description | Example |
|------|-------------|---------|
| **Public** | Anyone can join, visible in directory | `#foohut`, `#help` |
| **Private** | Invite-only, hidden from directory | `#acme-internal` |
| **Org** | Tied to organization, members auto-join | `#acme/general` |
| **DM** | 1:1 private conversation | `@matto ↔ @alice` |
| **Group DM** | Multi-person private chat | `@matto, @alice, @bob` |

### 4.3 Default Public Channels

```
#foohut      → General chat, announcements
#help        → Get help with FooHut or code
#lookingfor  → Find collaborators, "LFG" style
#showcase    → Share your projects
#cybersec    → Security discussions
#frontend    → Frontend dev chat
#backend     → Backend/infra chat
#rust        → Rust programming
#ai-ml       → AI/ML discussions
#off-topic   → Random, memes, vibes
```

### 4.4 Chat Features

**Core (MVP):**
- [ ] Join/leave channels
- [ ] Send text messages
- [ ] @mentions with notifications
- [ ] Emoji reactions
- [ ] Link previews (projects, docs, URLs)
- [ ] Online presence (green dot)
- [ ] Unread counts & badges
- [ ] Message history (infinite scroll)

**Enhanced (Phase 2):**
- [ ] Code blocks with syntax highlighting
- [ ] File/image sharing
- [ ] Thread replies
- [ ] Pin messages
- [ ] Channel search
- [ ] Message search
- [ ] Typing indicators
- [ ] Read receipts

**IRC Power Features:**
- [ ] `/commands` support
  - `/join #channel` - Join channel
  - `/leave` - Leave channel
  - `/msg @user` - DM user
  - `/me does something` - Action message
  - `/whois @user` - View profile
  - `/project name` - Link to project
  - `/doc name` - Link to document
- [ ] Tab-complete for usernames and channels
- [ ] Keyboard navigation (up/down for history)

### 4.5 Chat API

```
workers/api/src/routes/chat.ts

-- Channels
├── GET    /chat/channels              → List available channels
├── GET    /chat/channels/joined       → My joined channels
├── POST   /chat/channels              → Create channel
├── GET    /chat/channels/:id          → Get channel info
├── POST   /chat/channels/:id/join     → Join channel
├── POST   /chat/channels/:id/leave    → Leave channel
├── GET    /chat/channels/:id/members  → List members

-- Messages
├── GET    /chat/channels/:id/messages → Get messages (paginated)
├── POST   /chat/channels/:id/messages → Send message
├── PATCH  /chat/messages/:id          → Edit message
├── DELETE /chat/messages/:id          → Delete message
├── POST   /chat/messages/:id/react    → Add reaction

-- DMs
├── GET    /chat/dms                   → List DM conversations
├── POST   /chat/dms                   → Start DM (or get existing)
├── GET    /chat/dms/:id/messages      → Get DM messages
├── POST   /chat/dms/:id/messages      → Send DM

-- WebSocket
└── WS     /chat/ws                    → Real-time connection
```

### 4.6 Chat Data Model

```sql
-- Channels
CREATE TABLE channels (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,           -- 'foohut', 'help', 'cybersec'
  slug TEXT UNIQUE NOT NULL,    -- URL-safe name
  description TEXT,
  type TEXT DEFAULT 'public',   -- 'public', 'private', 'org', 'dm'
  org_id TEXT REFERENCES organizations(id),
  created_by TEXT REFERENCES users(id),
  is_default BOOLEAN DEFAULT FALSE,  -- Auto-join on signup
  member_count INTEGER DEFAULT 0,
  last_message_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE channel_members (
  channel_id TEXT NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member',   -- 'owner', 'admin', 'member'
  joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_read_at DATETIME,
  notifications TEXT DEFAULT 'all',  -- 'all', 'mentions', 'none'
  PRIMARY KEY (channel_id, user_id)
);

-- Messages
CREATE TABLE messages (
  id TEXT PRIMARY KEY,
  channel_id TEXT NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id),
  content TEXT NOT NULL,
  type TEXT DEFAULT 'text',     -- 'text', 'action', 'system', 'file'
  reply_to TEXT REFERENCES messages(id),
  edited_at DATETIME,
  deleted_at DATETIME,
  metadata JSON,                -- { mentions: [], links: [], embeds: [] }
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_messages_channel ON messages(channel_id, created_at DESC);
CREATE INDEX idx_messages_user ON messages(user_id);

-- Reactions
CREATE TABLE message_reactions (
  message_id TEXT NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,          -- '👍', '🔥', '❤️'
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (message_id, user_id, emoji)
);

-- DM conversations (separate from channels for simplicity)
CREATE TABLE dm_conversations (
  id TEXT PRIMARY KEY,
  type TEXT DEFAULT 'dm',       -- 'dm' or 'group'
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
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Presence (use KV for this actually, but track last seen in D1)
ALTER TABLE users ADD COLUMN status TEXT DEFAULT 'offline';  -- 'online', 'away', 'dnd', 'offline'
ALTER TABLE users ADD COLUMN status_message TEXT;
```

### 4.7 Real-Time with Durable Objects

```typescript
// workers/api/src/chat/ChatRoom.ts
export class ChatRoom implements DurableObject {
  private connections: Map<string, WebSocket> = new Map();
  private users: Map<string, UserPresence> = new Map();

  async fetch(request: Request) {
    const url = new URL(request.url);
    
    if (request.headers.get('Upgrade') === 'websocket') {
      const [client, server] = Object.values(new WebSocketPair());
      await this.handleSession(server, url);
      return new Response(null, { status: 101, webSocket: client });
    }
    
    return new Response('Expected WebSocket', { status: 400 });
  }

  async handleSession(ws: WebSocket, url: URL) {
    ws.accept();
    const userId = url.searchParams.get('userId');
    
    this.connections.set(userId, ws);
    this.broadcast({ type: 'user_joined', userId });
    
    ws.addEventListener('message', async (event) => {
      const data = JSON.parse(event.data);
      
      switch (data.type) {
        case 'message':
          // Save to D1, then broadcast
          await this.saveMessage(data);
          this.broadcast({ type: 'message', ...data });
          break;
        case 'typing':
          this.broadcast({ type: 'typing', userId }, userId);
          break;
        case 'reaction':
          await this.saveReaction(data);
          this.broadcast({ type: 'reaction', ...data });
          break;
      }
    });
    
    ws.addEventListener('close', () => {
      this.connections.delete(userId);
      this.broadcast({ type: 'user_left', userId });
    });
  }

  broadcast(message: any, excludeUser?: string) {
    for (const [userId, ws] of this.connections) {
      if (userId !== excludeUser) {
        ws.send(JSON.stringify(message));
      }
    }
  }
}
```

### 4.8 Chat UI Components

```
components/Chat/
├── ChatWindow.tsx         → Main chat container
├── ChannelList.tsx        → Sidebar with channels
├── ChannelHeader.tsx      → Channel name, members, settings
├── MessageList.tsx        → Scrollable message history
├── Message.tsx            → Individual message with reactions
├── MessageInput.tsx       → Input with slash commands, emoji picker
├── MemberList.tsx         → Online users sidebar
├── UserPresence.tsx       → Online/away/offline indicator
├── DMList.tsx             → Direct messages list
├── TypingIndicator.tsx    → "alice is typing..."
├── EmojiPicker.tsx        → Reaction/emoji selector
├── LinkPreview.tsx        → Project/doc/URL embeds
└── CommandPalette.tsx     → /command autocomplete
```

---

## 5. Route Structure (Updated)

```
/                           → Landing
/login                      → Auth
/register                   → Registration (multi-step)
/onboarding                 → Post-signup setup

/app                        → Dashboard (personal)
/app/space/:id              → Space workspace
/app/settings               → User settings

/u/:username                → Public profile
/u/:username/projects       → User's projects
/u/:username/friends        → User's friends

/dev                        → Dev dashboard
/dev/project/:id            → Project IDE
/dev/explore                → Explore projects

/org/:slug                  → Org dashboard
/org/:slug/members          → Org members
/org/:slug/teams            → Org teams
/org/:slug/settings         → Org settings

/chat                       → Chat home (channel list)
/chat/c/:channel            → Public channel
/chat/dm/:conversationId    → Direct message
/chat/org/:orgSlug/:channel → Org channel

/cyber                      → Cyber workspace
```

---

## 6. Notifications System

Chat + friends needs notifications:

```sql
CREATE TABLE notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,        -- 'friend_request', 'mention', 'dm', 'org_invite'
  title TEXT,
  body TEXT,
  link TEXT,                 -- URL to navigate to
  read_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notifications_user ON notifications(user_id, read_at, created_at DESC);
```

**Notification Types:**
- `friend_request` - Someone sent you a friend request
- `friend_accepted` - Your request was accepted
- `mention` - @mentioned in chat
- `dm` - New direct message
- `org_invite` - Invited to an org
- `channel_invite` - Invited to private channel
- `project_star` - Someone starred your project
- `project_fork` - Someone forked your project

---

## 7. Implementation Priority

### Phase 1: Profiles + Auth (Week 1-2)
- [ ] Multi-step registration flow
- [ ] Profile page (`/u/:username`)
- [ ] Profile editing
- [ ] Activity feed

### Phase 2: Friends (Week 3)
- [ ] Friend request system
- [ ] Friends list
- [ ] Online presence (basic)

### Phase 3: Organizations (Week 4-5)
- [ ] Org creation
- [ ] Member management
- [ ] Org switcher in header
- [ ] Shared spaces/projects

### Phase 4: Chat MVP (Week 6-8)
- [ ] Channel list + join/leave
- [ ] Message sending/receiving
- [ ] WebSocket real-time
- [ ] Basic DMs

### Phase 5: Chat Enhanced (Week 9-10)
- [ ] Reactions
- [ ] @mentions
- [ ] /commands
- [ ] Link previews
- [ ] Notifications

---

## 8. Tech Notes

**Presence/Online Status:**
- Store in Cloudflare KV with 60s TTL
- WebSocket heartbeat updates KV
- Poll KV for friend list online status

**Message Delivery:**
- Durable Objects for real-time rooms
- D1 for persistence
- Fan-out to connected users

**Scale Considerations:**
- Shard channels by ID to different DOs
- Message history pagination (50 per page)
- Lazy load member lists

---

## Vibe Check ✅

This gives FooHut the community layer that GitBook/Notion don't have. Users can:

1. **Build in public** - Projects & docs visible on profiles
2. **Find collaborators** - `#lookingfor` channel, friend system
3. **Get help** - `#help` channel, DM experts
4. **Hang out** - IRC vibes, build relationships
5. **Team up** - Orgs for formal teams

It's like if Discord and GitBook had a baby that writes code 🍼💻

---

*"Come for the docs, stay for the vibes"*
