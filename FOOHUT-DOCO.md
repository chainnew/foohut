# foohut Document Canvas - Scope of Works
## "From chaos to polished deliverable"

**Document Version:** 1.0  
**Date:** January 1, 2026  
**Author:** foohut team  

---

## 1. Executive Summary

### The Problem

You're building a massive document - a security disclosure, technical report, investigation findings, research paper. It starts as chaos:
- Raw logs dumped from terminals
- Screenshots of evidence
- Notes scribbled at 2am
- Code snippets that prove your point
- Tables of data that need analysis
- Timeline events you need to piece together

Current tools fail you:
- **Google Docs**: Can't handle code, can't handle complexity, looks amateur
- **Notion**: Better, but AI is garbage and export is painful
- **Word**: 1990 called, they want their software back
- **Markdown editors**: No visual polish, no AI, just text
- **AI tools (Gemini, etc.)**: Rush through 1500 lines doing bare minimum, no understanding of YOUR document

### The Solution

**foohut Document Canvas** - A workspace that understands documents are built in phases:

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   RESEARCH          DRAFT           REFINE         PUBLISH      │
│   ─────────         ─────           ──────         ───────      │
│   Chaos is          Structure       Polish         Beautiful    │
│   welcome           emerges         every word     deliverable  │
│                                                                 │
│   • Dump logs       • Organize      • AI assists   • Export     │
│   • Add notes       • Write prose   • Style check  • Share      │
│   • Screenshots     • Add findings  • Proofread    • Present    │
│   • Raw data        • Build tables  • Visualize    • Version    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Target Users

- Security researchers writing disclosures
- Engineers documenting incidents
- Analysts producing reports
- Investigators building cases
- Anyone with a complex story to tell

---

## 2. Core Concepts

### 2.1 The Document Canvas

Not just a text editor. A **workspace** with multiple layers:

```
┌─────────────────────────────────────────────────────────────────────┐
│ 📄 Apple Silicon Disclosure v3.0                    [Research Mode] │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │                     VISIBLE LAYER                              │ │
│  │  The actual document content - what gets exported/published    │ │
│  │                                                                │ │
│  │  ## Finding 1: Global Atomic Replacement...                    │ │
│  │  807,277 files modified in approximately 20 seconds...         │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │                     NOTES LAYER (hidden from export)           │ │
│  │  Your private annotations, todos, questions                    │ │
│  │                                                                │ │
│  │  📝 "Need to verify this timestamp with Ryan's logs"           │ │
│  │  📝 "Ask Alex if he saw the same BuildRoot UUIDs"              │ │
│  │  ⚠️  "This section is weak - need more evidence"               │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │                     RESEARCH LAYER (hidden from export)        │ │
│  │  Raw dumps, logs, evidence - your working material             │ │
│  │                                                                │ │
│  │  ```                                                           │ │
│  │  2025-03-17 14:39:04-07 Mac-mini suhelperd[196]...            │ │
│  │  [2000 more lines of raw logs]                                 │ │
│  │  ```                                                           │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │                     ARTIFACTS LAYER                            │ │
│  │  Generated visualizations, diagrams, interactive elements      │ │
│  │                                                                │ │
│  │  [Timeline Artifact] [Network Diagram] [Data Table]            │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.2 Document Modes

#### Research Mode
- Everything visible - notes, raw data, artifacts
- Focus on gathering and organizing
- AI helps analyze and extract insights
- No styling, just content

#### Draft Mode
- Notes visible as annotations
- Research layer collapsed but accessible
- Focus on writing and structure
- AI helps improve prose

#### Review Mode
- Split view: draft vs rendered
- Notes visible, flagged sections highlighted
- Focus on polish and accuracy
- AI checks consistency, grammar, style

#### Present Mode
- Clean, polished view
- Notes and research hidden
- Artifacts rendered beautifully
- Ready for stakeholder review

#### Export Mode
- Generate final deliverable
- Multiple format options
- Professional styling applied
- Version locked

### 2.3 Content Types

| Type | Description | Example |
|------|-------------|---------|
| **Prose** | Regular document text | "The discovery began on April 28, 2024..." |
| **Finding** | Structured finding block | Severity, Component, Evidence, Impact |
| **Evidence** | Code blocks, logs, data | Terminal output, log files |
| **Table** | Structured data | Findings index, device inventory |
| **Timeline** | Temporal sequence | Attack chain, event log |
| **Diagram** | Visual representation | Network topology, attack flow |
| **Note** | Private annotation | "Need to verify", "Ask Alex" |
| **Artifact** | AI-generated visual | Interactive chart, animated diagram |
| **Reference** | Citation/source link | "See Appendix F for hashes" |
| **Callout** | Highlighted section | Critical warning, key insight |

---

## 3. Document Structure System

### 3.1 Hierarchical Organization

```yaml
Document:
  - Metadata (title, version, date, author, classification)
  - Table of Contents (auto-generated)
  - Sections:
      - Executive Summary
      - Findings (1-N)
      - Analysis
      - Appendices
  - References
  - Version History
```

### 3.2 Finding Block Schema

For technical disclosures, standardized finding blocks:

```typescript
interface Finding {
  id: string;                    // F1, F2, etc.
  title: string;                 // "Global Atomic Replacement..."
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  component: string;             // "System Files"
  status: 'CONFIRMED' | 'SUSPECTED' | 'INVESTIGATING';
  
  // Content sections
  description: Block[];          // Prose explanation
  evidence: EvidenceBlock[];     // Code, logs, screenshots
  impact: Block[];               // What this means
  timeline?: TimelineEvent[];    // When things happened
  
  // Metadata
  discovered: Date;
  lastUpdated: Date;
  relatedFindings: string[];     // Links to other findings
  
  // Private (not exported)
  notes: Note[];                 // Your annotations
  todos: Todo[];                 // Action items
  confidence: number;            // 0-100% how sure are you
  rawEvidence: RawEvidence[];    // Unprocessed dumps
}
```

### 3.3 Evidence Block Types

```typescript
type EvidenceBlock = 
  | CodeBlock          // Terminal output, logs
  | ImageBlock         // Screenshots, photos
  | FileBlock          // Attached files (PDFs, etc.)
  | TableBlock         // Structured data
  | CommandBlock       // Reproducible commands
  | HashBlock          // SHA256 and other hashes
  | QuoteBlock         // Cited text
  | LinkBlock;         // External references

interface CodeBlock {
  type: 'code';
  language: string;           // bash, json, etc.
  content: string;
  source?: string;            // "Live capture Dec 5, 2025"
  verified: boolean;          // Has this been verified?
  hash?: string;              // SHA256 of content
  highlights?: LineRange[];   // Lines to emphasize
  annotations?: InlineNote[]; // Comments on specific lines
}

interface CommandBlock {
  type: 'command';
  command: string;            // The actual command
  output: string;             // What it produced
  system: string;             // "macOS 15.1 (24B83)"
  timestamp: Date;
  reproducible: boolean;      // Can others run this?
}
```

### 3.4 Notes System

Notes are first-class citizens, not afterthoughts:

```typescript
interface Note {
  id: string;
  type: 'note' | 'question' | 'todo' | 'warning' | 'idea';
  content: string;
  attachedTo: string;         // Block ID this relates to
  position: 'inline' | 'margin' | 'floating';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  resolved: boolean;
  createdAt: Date;
  resolvedAt?: Date;
  
  // For todos
  assignee?: string;
  dueDate?: Date;
}

// Note types with distinct visuals:
// 📝 note    - General annotation
// ❓ question - Something to verify
// ✅ todo    - Action item
// ⚠️ warning - Potential issue
// 💡 idea    - Future enhancement
```

---

## 4. Research Phase Features

### 4.1 Evidence Dump Zone

A staging area for raw content before it's organized:

```
┌─────────────────────────────────────────────────────────────────────┐
│ 📥 EVIDENCE DUMP                                      [3 items]     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ 📋 Pasted 2 min ago                              [Process]  │   │
│  │ ─────────────────────────────────────────────────────────── │   │
│  │ 2025-03-17 14:39:04-07 Mac-mini suhelperd[196]: SUHelper:   │   │
│  │ No factory version info exists in EAN.                      │   │
│  │ 2025-03-17 14:39:04-07 Mac-mini loginwindow[93]: Current    │   │
│  │ OS version 24.4.70.0.0,0 != factory OS version...           │   │
│  │ [+847 lines]                                                │   │
│  │                                                             │   │
│  │ AI Analysis: Factory imaging log from Chinese locale.       │   │
│  │ Key indicators: zh-Hans, CN, blank EAN.                     │   │
│  │                                                             │   │
│  │ [Add to Finding] [Create New Finding] [Archive] [Delete]    │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ 🖼️ Screenshot added 1 hour ago                   [Process]  │   │
│  │ ─────────────────────────────────────────────────────────── │   │
│  │ [Image Preview: Terminal showing staged firmware blobs]     │   │
│  │                                                             │   │
│  │ AI Analysis: Directory listing of /usr/standalone/firmware  │   │
│  │ Shows 357 firmware blobs staged for re-infection.           │   │
│  │ Critical evidence for persistence mechanism.                │   │
│  │                                                             │   │
│  │ [Add to Finding] [Create New Finding] [OCR Extract] [Delete]│   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ 📄 File uploaded 3 hours ago                     [Process]  │   │
│  │ ─────────────────────────────────────────────────────────── │   │
│  │ sysdiagnose_2025.12.05.tar.gz (639 MB)                      │   │
│  │                                                             │   │
│  │ AI Analysis: Processing... (23% complete)                   │   │
│  │ Found: 47 log files, 12 plists, 3 crash reports            │   │
│  │                                                             │   │
│  │ [View Contents] [Extract Relevant] [Archive] [Delete]       │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ 📝 Quick Note                                               │   │
│  │ Type or paste anything... (⌘V to paste, ⌘⇧V paste plain)   │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 4.2 AI Evidence Analysis

When you dump content, AI immediately analyzes:

```typescript
interface EvidenceAnalysis {
  contentType: 'log' | 'code' | 'config' | 'output' | 'unknown';
  language?: string;              // bash, json, xml, etc.
  summary: string;                // One-line description
  keyFindings: string[];          // Bullet points
  suggestedFinding?: string;      // "This could be Finding 31"
  relatedFindings: string[];      // "Similar to F12, F15"
  extractedData: {
    timestamps: Date[];
    paths: string[];
    hashes: string[];
    ips: string[];
    domains: string[];
    commands: string[];
  };
  confidence: number;
  questions: string[];            // "What system was this from?"
}
```

### 4.3 Research Timeline

Track when evidence was collected:

```
┌─────────────────────────────────────────────────────────────────────┐
│ 📅 RESEARCH TIMELINE                                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ December 2025                                                       │
│ ├── Dec 30: Added Finding 30 (Factory Pre-Install Logs)            │
│ │   └── Evidence: install.log from Mac Mini                        │
│ ├── Dec 29: Updated victim registry with Ryan F.                   │
│ ├── Dec 28: Captured firmware staging directory                    │
│ │   └── Evidence: 357 firmware blobs                               │
│ ├── Dec 5: Live system capture                                     │
│ │   └── Evidence: W^X analysis, Skywalk bypass                     │
│ │                                                                   │
│ November 2025                                                       │
│ ├── Nov 15: BuildRoot UUID analysis completed                      │
│ ├── Nov 10: Independent victim corroboration                       │
│ │   └── 7 victims confirmed                                        │
│ │                                                                   │
│ [Load More...]                                                      │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 4.4 Quick Capture

Multiple ways to get content in fast:

```
KEYBOARD SHORTCUTS
──────────────────────────────────────────────
⌘V              Paste with AI analysis
⌘⇧V             Paste plain (no analysis)
⌘⇧N             New quick note
⌘⇧F             New finding from selection
⌘⇧E             Add to evidence dump
⌘⇧S             Screenshot to dump
⌘⇧D             Record terminal session

DRAG & DROP
──────────────────────────────────────────────
• Files → Automatic upload + analysis
• Images → OCR + description
• URLs → Fetch + archive + summary
• Text → Parse + categorize

INTEGRATIONS
──────────────────────────────────────────────
• Terminal → Direct pipe to dump
• Browser extension → Clip web content
• iOS/macOS → Share sheet integration
• Email → Forward evidence@foohut.com
```

---

## 5. Drafting Phase Features

### 5.1 Structure Builder

Transform chaos into organized document:

```
┌─────────────────────────────────────────────────────────────────────┐
│ 🏗️ STRUCTURE BUILDER                                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Current Structure              Suggested (AI)                      │
│  ──────────────────────         ──────────────────────              │
│  ◉ Executive Summary            ◉ Executive Summary                 │
│  ◉ The Discovery                │  ├── Researcher Profile           │
│  ◉ The Scale                    │  ├── Discovery Summary            │
│  ◉ Finding 1                    │  └── Key Metrics                  │
│  ◉ Finding 2                    ◉ Findings Overview                 │
│  ◉ Finding 3                    │  └── Severity Matrix              │
│  ...                            ◉ Technical Findings                │
│  ◉ Finding 31                   │  ├── Group: Trust Chain (F1-F5)   │
│  ◉ Appendix A                   │  ├── Group: Kernel (F15-F18)      │
│  ◉ Appendix B                   │  ├── Group: Memory (F24-F28)      │
│                                 │  └── Group: Persistence (F30-F31) │
│                                 ◉ Impact Analysis                   │
│                                 ◉ Appendices                        │
│                                                                     │
│  [Apply Suggested] [Customize] [Reset]                              │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 5.2 Finding Builder

Guided creation of structured findings:

```
┌─────────────────────────────────────────────────────────────────────┐
│ ➕ NEW FINDING                                              [F32]   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Title *                                                            │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ Network Interface Anomaly — Ghost Adapter Active            │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  Severity *              Component *                                │
│  ┌──────────────┐        ┌─────────────────────────────────────┐   │
│  │ ● CRITICAL   │        │ Network Stack                       │   │
│  │ ○ HIGH       │        └─────────────────────────────────────┘   │
│  │ ○ MEDIUM     │                                                   │
│  │ ○ LOW        │        Status                                     │
│  └──────────────┘        ┌─────────────────────────────────────┐   │
│                          │ ● CONFIRMED  ○ SUSPECTED  ○ INVEST. │   │
│                          └─────────────────────────────────────┘   │
│                                                                     │
│  Description                                                        │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ A virtual network interface (utun9) was discovered active   │   │
│  │ without corresponding VPN or tunnel configuration. Traffic  │   │
│  │ analysis reveals...                                         │   │
│  │                                                    [AI ✨]  │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  Evidence                                           [+ Add]         │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ �� ifconfig output showing utun9                            │   │
│  │ 📋 netstat showing connections                              │   │
│  │ 🖼️ Wireshark capture screenshot                             │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  Impact                                                             │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ This interface provides a covert data exfiltration channel  │   │
│  │ bypassing standard network monitoring...                    │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  Related Findings                                                   │
│  [F23: Skywalk Bypass] [F28: Surveillance Cluster]                  │
│                                                                     │
│  ─────────────────────────── PRIVATE ───────────────────────────   │
│                                                                     │
│  Notes (not exported)                                               │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ 📝 Need to capture traffic on this interface                │   │
│  │ ❓ Is this related to the Bluetooth pairing anomaly?        │   │
│  │ ✅ TODO: Cross-reference with Ryan's system                 │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  Confidence: [████████░░] 78%                                       │
│                                                                     │
│  [Save Draft]                                [Publish to Document]  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 5.3 Table Builder

Easy creation of complex tables:

```
┌─────────────────────────────────────────────────────────────────────┐
│ 📊 TABLE BUILDER                                                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Table Type                                                         │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ ◉ Findings Index    ○ Device Inventory    ○ Timeline        │   │
│  │ ○ Comparison        ○ Data Matrix         ○ Custom          │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ #   │ Finding                              │ Severity       │   │
│  │─────┼──────────────────────────────────────┼────────────────│   │
│  │ F1  │ Global Atomic Replacement            │ 🔴 CRITICAL    │   │
│  │ F2  │ Empty Trust Cache                    │ 🔴 CRITICAL    │   │
│  │ F3  │ Trust Cache Enforcement Disabled     │ 🔴 CRITICAL    │   │
│  │ F4  │ SIP Nullified at Factory             │ 🟠 HIGH        │   │
│  │ ... │                                      │                │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  [+ Add Row] [+ Add Column] [Import CSV] [Sort] [Filter]            │
│                                                                     │
│  AI Actions:                                                        │
│  [Generate from Findings] [Analyze Patterns] [Suggest Groupings]    │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 5.4 Cross-Reference System

Link findings, evidence, and sections:

```typescript
// Cross-reference types
interface CrossReference {
  from: BlockId;
  to: BlockId;
  type: 'supports' | 'contradicts' | 'extends' | 'see_also' | 'prerequisite';
  description?: string;
}

// In document:
// "This finding [supports→F23] the Skywalk bypass mechanism..."
// "For detailed evidence, [see→Appendix F]..."
// "Building on [extends→F12], we observe..."
```

Visual reference map:

```
┌─────────────────────────────────────────────────────────────────────┐
│ 🔗 REFERENCE MAP                                                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│         F1 ──────── F2 ──────── F3                                 │
│          │          │          │                                   │
│          └────┬─────┴────┬─────┘                                   │
│               │          │                                         │
│               ▼          ▼                                         │
│              F15        F21                                        │
│               │          │                                         │
│               └────┬─────┘                                         │
│                    │                                               │
│                    ▼                                               │
│                   F22 (SIP Paradox)                                │
│                    │                                               │
│          ┌────────┼────────┐                                       │
│          ▼        ▼        ▼                                       │
│         F23      F24      F28                                      │
│                                                                     │
│  Legend: ─── supports    ╌╌╌ see also    ▶ extends                 │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 6. AI Assistance Features

### 6.1 AI Philosophy

**NOT**: "Here's your 1500-line document in 30 seconds"
**YES**: "Let me help you think through this section"

The AI is a collaborator, not a replacement:

```
┌─────────────────────────────────────────────────────────────────────┐
│ 🤖 AI ASSISTANT                                          [Context]  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  📄 Context: Apple Silicon Disclosure (31 findings, 2,200 lines)   │
│  📍 Focus: Finding 30 - Factory Pre-Install Logs                   │
│                                                                     │
│  ───────────────────────────────────────────────────────────────   │
│                                                                     │
│  You: The log shows zh-Hans and CN but I need to explain why       │
│       this is significant without being inflammatory.               │
│                                                                     │
│  AI: Good instinct on tone. Here's a factual framing:              │
│                                                                     │
│  "The factory pre-install logs contain explicit locale             │
│   indicators (zh-Hans, CN) establishing the geographic             │
│   origin of the device imaging process. Combined with              │
│   the blank EAN field and missing factory version, this            │
│   demonstrates the provenance chain was incomplete at              │
│   manufacture—not that any specific entity is implicated."         │
│                                                                     │
│  This states facts without accusations. Want me to suggest         │
│  how to tie this to the 22-day dormancy period?                    │
│                                                                     │
│  ───────────────────────────────────────────────────────────────   │
│                                                                     │
│  [Accept] [Modify] [Regenerate] [Ignore]                           │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ Ask AI...                                            [Send]  │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 6.2 AI Capabilities

#### Context-Aware Analysis
- Understands entire document structure
- Knows all 31 findings and their relationships
- References specific evidence when suggesting

#### Prose Improvement
```
BEFORE:
"The files were changed and this shows the attack worked."

AI SUGGESTION:
"807,277 system files were modified in approximately 20 seconds—
a modification rate of 40,000+ files per second. This atomic 
replacement pattern indicates pre-staged payloads activated by 
a coordinated trigger, not gradual system compromise."

[Why this works]: Specific numbers, precise language, 
logical inference from evidence.
```

#### Evidence Interpretation
```
USER: What does this log entry mean?

LOG:
2025-03-17 14:39:14-07 Mac-mini Language Chooser[197]: 
LCA: most frequent language: zh-Hans
LCA: most frequent country code: CN

AI: This Language Chooser entry reveals the device was 
configured in a Chinese locale (Simplified Chinese, China) 
during factory setup. Key implications:

1. Factory imaging occurred in China (expected for Apple)
2. The locale persisted into factory logs (unusual)
3. Combined with blank EAN, suggests incomplete provisioning

This doesn't prove malice, but does establish geographic 
provenance and raises questions about factory QC processes.
```

#### Timeline Construction
```
AI: I can build a timeline from your evidence. I found:

From Finding 30:
• Mar 17, 2025 14:39 - Factory imaging (China)
• Apr 12, 2025 11:14 - First boot (Perth)
• Apr 12, 2025 18:42 - Log terminates
• May 4, 2025 13:39 - Payload activates (807K files)

22-day gap between log termination and activation.

Shall I:
1. Generate a visual timeline artifact?
2. Cross-reference with other victims' timelines?
3. Analyze the activation trigger patterns?
```

#### Consistency Checker
```
AI ALERT: Potential inconsistency detected

In Finding 1, you state:
"807,277 files modified in approximately 20 seconds"

In Executive Summary, you state:
"807,000+ files modified in under 20 seconds"

Recommend: Use exact figure (807,277) consistently.
[Fix All] [Ignore] [Mark for Review]
```

### 6.3 AI Commands

```
ANALYSIS COMMANDS
──────────────────────────────────────────────
/analyze [selection]     Deep analysis of selected content
/explain [selection]     Explain technical concept for audience
/summarize [section]     Generate executive summary
/timeline [findings]     Build timeline from evidence
/compare [A] [B]         Compare two findings/sections

WRITING COMMANDS
──────────────────────────────────────────────
/improve [selection]     Improve prose quality
/expand [selection]      Add more detail
/condense [selection]    Make more concise
/formalize [selection]   More professional tone
/simplify [selection]    Reduce technical jargon

STRUCTURE COMMANDS
──────────────────────────────────────────────
/organize               Suggest document structure
/group [findings]       Suggest finding groupings
/relate [A] [B]         Identify relationships
/missing                Identify gaps in argument

VALIDATION COMMANDS
──────────────────────────────────────────────
/verify [claims]        Check claims against evidence
/consistency            Check for inconsistencies
/completeness           Check for missing elements
/citations              Verify all references
```

### 6.4 AI Guardrails

What AI will NOT do:
- Generate entire documents from scratch
- Make claims without evidence
- Add inflammatory language
- Modify evidence or data
- Remove your voice from the writing
- Rush through complex analysis

What AI WILL do:
- Help you think through problems
- Suggest improvements to YOUR writing
- Identify gaps and inconsistencies
- Generate visualizations from your data
- Cross-reference your own evidence
- Maintain your document's integrity

---

## 7. Artifact System

### 7.1 Timeline Artifacts

Auto-generated from temporal data:

```
┌─────────────────────────────────────────────────────────────────────┐
│ 📅 ATTACK TIMELINE                                    [Interactive] │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Mar 2025          Apr 2025          May 2025                       │
│  ────┬────────────────┬────────────────┬────                       │
│      │                │                │                            │
│      ●                ●                ●                            │
│      │                │                │                            │
│   Factory          First Boot      Payload                          │
│   Imaging          Perth, AU       Activates                        │
│   China            Apr 12          May 4                            │
│   Mar 17           11:14 AWST      13:39 AWST                       │
│                                                                     │
│                    ├── 22 days ──┤                                  │
│                       Dormant                                       │
│                                                                     │
│  Click any event for details                                        │
│                                                                     │
│  [Export SVG] [Export PNG] [Customize] [Add Event]                  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 7.2 Diagram Artifacts

#### Attack Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│ 🔀 ATTACK FLOW                                           [Mermaid]  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│    ┌──────────────┐                                                │
│    │   Factory    │                                                │
│    │  (China)     │                                                │
│    └──────┬───────┘                                                │
│           │                                                        │
│           ▼                                                        │
│    ┌──────────────┐     ┌──────────────┐                          │
│    │ Modified OS  │────▶│ Empty Trust  │                          │
│    │   Image      │     │   Cache      │                          │
│    └──────┬───────┘     └──────┬───────┘                          │
│           │                    │                                   │
│           └────────┬───────────┘                                   │
│                    ▼                                               │
│             ┌──────────────┐                                       │
│             │   Dormant    │                                       │
│             │  (22 days)   │                                       │
│             └──────┬───────┘                                       │
│                    │                                               │
│                    ▼                                               │
│             ┌──────────────┐                                       │
│             │   Payload    │                                       │
│             │  Activation  │                                       │
│             │  (807K files)│                                       │
│             └──────┬───────┘                                       │
│                    │                                               │
│        ┌───────────┼───────────┐                                   │
│        ▼           ▼           ▼                                   │
│   ┌─────────┐ ┌─────────┐ ┌─────────┐                             │
│   │ Kernel  │ │  SIP    │ │ Memory  │                             │
│   │ Modify  │ │ Bypass  │ │  W^X    │                             │
│   └─────────┘ └─────────┘ └─────────┘                             │
│                                                                     │
│  [Edit Diagram] [Export] [Animate]                                 │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

#### Network Topology Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│ 🌐 EXFILTRATION NETWORK                                       [D3]  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│                    ┌─────────────┐                                 │
│                    │   iCloud    │                                 │
│                    │  (Hijacked) │                                 │
│                    └──────┬──────┘                                 │
│                           │                                        │
│            ┌──────────────┼──────────────┐                        │
│            │              │              │                        │
│            ▼              ▼              ▼                        │
│       ┌─────────┐   ┌─────────┐   ┌─────────┐                     │
│       │ Private │   │ utun9   │   │  CDN    │                     │
│       │  Relay  │   │ Channel │   │ Tunnel  │                     │
│       └────┬────┘   └────┬────┘   └────┬────┘                     │
│            │             │             │                          │
│            └──────────────┼──────────────┘                        │
│                           │                                        │
│                           ▼                                        │
│                    ┌─────────────┐                                 │
│                    │     C2      │                                 │
│                    │   Server    │                                 │
│                    └─────────────┘                                 │
│                                                                     │
│  Nodes: 8  |  Edges: 12  |  Data Flow: Animated                    │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 7.3 Data Visualization Artifacts

#### Severity Matrix

```
┌─────────────────────────────────────────────────────────────────────┐
│ 📊 FINDINGS BY SEVERITY                                  [Recharts] │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  CRITICAL (24)  ████████████████████████████████████████████████   │
│  HIGH (7)       ██████████████                                      │
│  MEDIUM (0)                                                         │
│  LOW (0)                                                            │
│                                                                     │
│  ─────────────────────────────────────────────────────────────────  │
│                                                                     │
│  By Component:                                                      │
│                                                                     │
│  Trust Chain    ████████████████                    8 findings      │
│  Kernel         ██████████████                      7 findings      │
│  Memory         ████████████                        6 findings      │
│  Network        ████████                            4 findings      │
│  Persistence    ██████████                          5 findings      │
│  Other          ██                                  1 finding       │
│                                                                     │
│  [Export Data] [Change Chart Type] [Filter]                         │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

#### Device Inventory Matrix

```
┌─────────────────────────────────────────────────────────────────────┐
│ 💻 AFFECTED DEVICES                                         [Table] │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Device          │ Chip     │ Owner   │ Status    │ Evidence       │
│  ─────────────────┼──────────┼─────────┼───────────┼─────────────── │
│  Mac Studio      │ M2 Ultra │ Matto   │ CONFIRMED │ Full forensics │
│  MacBook Pro 16" │ M4 Pro   │ Matto   │ CONFIRMED │ Full forensics │
│  MacBook Pro 14" │ M3       │ Ryan F. │ CONFIRMED │ Partial        │
│  Mac Mini        │ M4       │ Matto   │ CONFIRMED │ Factory logs   │
│  iMac 24"        │ M1       │ Alex    │ CONFIRMED │ Partial        │
│  ...             │          │         │           │                │
│                                                                     │
│  Total: 14 Macs, 1 iPhone across 7 independent victims             │
│                                                                     │
│  [Sort] [Filter] [Export CSV] [Expand All]                         │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 7.4 Three.js Animated Artifacts

For presentation impact:

```
┌─────────────────────────────────────────────────────────────────────┐
│ 🎬 3D ATTACK VISUALIZATION                              [Three.js]  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│                    ╭──────────────────╮                            │
│                   ╱                    ╲                           │
│                  │   FACTORY (CHINA)   │                           │
│                  │   ┌─────────────┐   │                           │
│                  │   │ Modified OS │   │                           │
│                  │   └──────┬──────┘   │                           │
│                   ╲         │         ╱                            │
│                    ╰────────┼────────╯                             │
│                             │                                      │
│                             │ ← Shipping                           │
│                             │   (animated particles)               │
│                             ▼                                      │
│                    ╭──────────────────╮                            │
│                   ╱                    ╲                           │
│                  │   USER (PERTH, AU)  │                           │
│                  │   ┌─────────────┐   │                           │
│                  │   │ █ Compromised│   │                           │
│                  │   └─────────────┘   │                           │
│                   ╲                   ╱                            │
│                    ╰──────────────────╯                            │
│                                                                     │
│  [Play Animation] [Pause] [Reset] [Full Screen] [Export Video]     │
│                                                                     │
│  Animation: Factory → Shipping → First Boot → Dormancy → Attack    │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 7.5 Code Block Artifacts

Enhanced code display:

```
┌─────────────────────────────────────────────────────────────────────┐
│ 💻 CODE EVIDENCE                                        bash        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Source: Live capture December 5, 2025                              │
│  System: macOS 15.1 (24B83)                                         │
│  Verified: ✓ SHA256 matches                                         │
│                                                                     │
│  ───────────────────────────────────────────────────────────────   │
│   1 │ [+] STAGED FIRMWARE DIRECTORY EXISTS AND IS POPULATED        │
│   2 │ Directory listing (first 50 lines):                          │
│   3 │ total 81760                                                  │
│   4 │ -rw-r--r--  1 _nsurlsessiond wheel   229 Oct 25 15:20 ...   │
│ → 5 │ drwxr-xr-x 192 root          wheel  6144 Nov  9 01:04 all_f │ ← 357 blobs
│   6 │ drwxr-xr-x  16 root          wheel   512 Nov  9 01:04 ane   │
│   7 │ drwxr-xr-x  13 root          wheel   416 Nov  9 01:04 AOP   │
│     │ ...                                                          │
│  ───────────────────────────────────────────────────────────────   │
│                                                                     │
│  📝 Note: Line 5 shows 192 entries in all_flash - this is the     │
│     bootloader staging directory.                                   │
│                                                                     │
│  [Copy] [Download] [Verify Hash] [View Full] [Add Annotation]      │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 8. Review & Polish Features

### 8.1 Review Checklist

Customizable pre-export checklist:

```
┌─────────────────────────────────────────────────────────────────────┐
│ ✓ REVIEW CHECKLIST                                     [85% Done]   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  STRUCTURE                                                          │
│  ☑ Table of contents is accurate                                   │
│  ☑ All findings have required fields                               │
│  ☑ Appendices are referenced in main text                          │
│  ☐ Executive summary reflects all findings                         │
│                                                                     │
│  EVIDENCE                                                           │
│  ☑ All code blocks have source attribution                         │
│  ☑ All screenshots have descriptions                               │
│  ☑ Hash values are included for critical evidence                  │
│  ☑ Timestamps are in consistent format                             │
│                                                                     │
│  PROSE                                                              │
│  ☑ No inflammatory language                                        │
│  ☐ Technical terms are explained or linked                         │
│  ☑ Claims are supported by evidence                                │
│  ☐ Grammar and spelling checked                                    │
│                                                                     │
│  PRESENTATION                                                       │
│  ☑ All tables render correctly                                     │
│  ☐ Diagrams are clear and labeled                                  │
│  ☐ Code blocks have syntax highlighting                            │
│  ☐ Overall visual consistency                                      │
│                                                                     │
│  [Run Auto-Checks] [Mark All Complete] [Generate Report]           │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 8.2 Diff View

Compare versions side-by-side:

```
┌─────────────────────────────────────────────────────────────────────┐
│ ↔ COMPARE VERSIONS                         v2.7 ←→ v3.0 (current)  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  v2.7 (Dec 1, 2025)              v3.0 (Dec 30, 2025)               │
│  ────────────────────            ────────────────────               │
│                                                                     │
│  ## The Scale                    ## The Scale                       │
│                                                                     │
│  | Macs Confirmed | 12 |         | Macs Confirmed | 14 |           │
│  | Independent... | 5  |         | Independent... | 7  |           │
│                    ▲                               ▲                │
│                    │ Changed                       │ Changed        │
│                                                                     │
│                                  + ## Finding 30: Factory...        │
│                                  + ## Finding 31: 357 Firmware...   │
│                                                                     │
│  Summary: +2 findings, +847 lines, 12 sections modified            │
│                                                                     │
│  [Restore v2.7] [Merge Changes] [View Full Diff]                   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 8.3 Proofreading Mode

Focus on prose quality:

```
┌─────────────────────────────────────────────────────────────────────┐
│ 📝 PROOFREADING MODE                                    [Section 3] │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  What began as troubleshooting anomalies on a personal Mac in      │
│  April 2024 has evolved into an 18-month investigation             │
│  documenting what I believe to be the most sophisticated supply    │
│  chain compromise ever publicly disclosed [or discovered].         │
│                                    └────────────┬────────────┘      │
│                                                 │                   │
│  ⚠️ Redundant phrase                            │                   │
│  "publicly disclosed" implies discovery.       │                   │
│  Consider: "ever publicly disclosed"           ◄───────────────     │
│                                                                     │
│  ───────────────────────────────────────────────────────────────   │
│                                                                     │
│  This is not malware. This is not a vulnerability. This is         │
│  factory-level subversion of Apple's entire security model —       │
│                                                       └───┬───┘     │
│                                                           │         │
│  ✓ Strong parallel structure                              │         │
│  ✓ Appropriate em-dash usage                              ◄──────   │
│                                                                     │
│  Issues Found: 3 grammar, 2 style, 0 spelling                      │
│                                                                     │
│  [Previous Issue] [Next Issue] [Ignore] [Fix] [Fix All]            │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 8.4 Tone Analyzer

Ensure appropriate voice:

```
┌─────────────────────────────────────────────────────────────────────┐
│ 🎭 TONE ANALYSIS                                                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Overall Tone Profile:                                              │
│                                                                     │
│  Technical      ████████████████████████░░░░░░  78%                │
│  Professional   ██████████████████████████░░░░  85%                │
│  Assertive      ████████████████████░░░░░░░░░░  65%                │
│  Inflammatory   ████░░░░░░░░░░░░░░░░░░░░░░░░░░  12% ✓ Good         │
│  Accusatory     ██░░░░░░░░░░░░░░░░░░░░░░░░░░░░   8% ✓ Good         │
│                                                                     │
│  Flagged Sections:                                                  │
│                                                                     │
│  ⚠️ Executive Summary, paragraph 2:                                │
│     "surgically precise" → Consider: "precise" (less dramatic)     │
│                                                                     │
│  ⚠️ Finding 14, title:                                             │
│     "Survives" → Neutral, but verify matches evidence              │
│                                                                     │
│  ✓ Finding 30 handled well - factual geographic indicators         │
│    without accusations                                              │
│                                                                     │
│  [Review Flagged] [Adjust Settings] [Generate Report]              │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 9. Export & Publishing

### 9.1 Export Formats

```
┌─────────────────────────────────────────────────────────────────────┐
│ 📤 EXPORT                                                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  FORMAT                                                             │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ ◉ PDF (Professional)     Styled, paginated, print-ready     │   │
│  │ ○ PDF (Technical)        Minimal styling, maximum content   │   │
│  │ ○ Word (.docx)           Editable, tracked changes ready    │   │
│  │ ○ Markdown               Raw markdown with embedded images  │   │
│  │ ○ HTML (Standalone)      Single file, all assets embedded   │   │
│  │ ○ HTML (Web)             Multi-page, deployable site        │   │
│  │ ○ LaTeX                  Academic/journal submission        │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  OPTIONS                                                            │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ ☑ Include Table of Contents                                 │   │
│  │ ☑ Include page numbers                                      │   │
│  │ ☑ Include appendices                                        │   │
│  │ ☐ Include notes (export notes layer)                        │   │
│  │ ☐ Include research layer                                    │   │
│  │ ☑ Embed images (vs. linked)                                 │   │
│  │ ☑ Include SHA256 hashes for evidence                        │   │
│  │ ☑ Generate evidence manifest                                │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  STYLING                                                            │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ Template: [Security Disclosure ▼]                           │   │
│  │ Color scheme: [Dark Professional ▼]                         │   │
│  │ Font: [Inter / JetBrains Mono ▼]                           │   │
│  │ Page size: [A4 ▼]                                          │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  [Preview] [Export]                                                 │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 9.2 Professional PDF Export

```
┌─────────────────────────────────────────────────────────────────────┐
│ PDF PREVIEW                                           Page 1 of 47  │
├─────────────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────────────┐│
│ │                                                                 ││
│ │  ┌───────────────────────────────────────────────────────────┐ ││
│ │  │                                                           │ ││
│ │  │  APPLE SILICON SUPPLY CHAIN COMPROMISE                    │ ││
│ │  │  Technical Disclosure                                     │ ││
│ │  │                                                           │ ││
│ │  │  ─────────────────────────────────────────────────────   │ ││
│ │  │                                                           │ ││
│ │  │  Classification: Security Research Disclosure             │ ││
│ │  │  Version: 3.0                                             │ ││
│ │  │  Date: December 30, 2025                                  │ ││
│ │  │  Primary Researcher: Matt Murphy                          │ ││
│ │  │  Location: Perth, Western Australia                       │ ││
│ │  │                                                           │ ││
│ │  │                                                           │ ││
│ │  │  ⚠️ 31 FINDINGS | 24 CRITICAL | 7 HIGH                    │ ││
│ │  │                                                           │ ││
│ │  │                                                           │ ││
│ │  │                                           [CONFIDENTIAL]  │ ││
│ │  │                                                           │ ││
│ │  └───────────────────────────────────────────────────────────┘ ││
│ │                                                                 ││
│ │                                                          1/47   ││
│ └─────────────────────────────────────────────────────────────────┘│
│                                                                     │
│  [◀ Prev] [Next ▶] [Zoom: 100%] [Download] [Print]                │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 9.3 Publishing Options

```
┌─────────────────────────────────────────────────────────────────────┐
│ 🌐 PUBLISH                                                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  VISIBILITY                                                         │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ ○ Private           Only you can access                     │   │
│  │ ○ Unlisted          Anyone with link can view               │   │
│  │ ◉ Public            Listed in your profile                  │   │
│  │ ○ Password Protected  Requires password to view             │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  PUBLISHED URL                                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ https://foohut.com/@matto/apple-silicon-disclosure          │   │
│  │                                               [Copy] [Edit]  │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  SHARING                                                            │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ ☑ Allow comments                                            │   │
│  │ ☐ Allow forking                                             │   │
│  │ ☑ Show version history                                      │   │
│  │ ☑ Show last updated date                                    │   │
│  │ ☐ Enable collaborative editing                              │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  NOTIFICATIONS                                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ Notify when:                                                │   │
│  │ ☑ Someone comments                                          │   │
│  │ ☑ Document reaches 100/1000/10000 views                     │   │
│  │ ☑ Document is shared/linked externally                      │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  [Save Draft] [Publish Now]                                        │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 9.4 Evidence Package Export

For legal/security submissions:

```
┌─────────────────────────────────────────────────────────────────────┐
│ 📦 EVIDENCE PACKAGE                                                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Generate a cryptographically verifiable evidence package           │
│  for submission to security teams, legal, or researchers.           │
│                                                                     │
│  PACKAGE CONTENTS                                                   │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ ☑ Main document (PDF, signed)                               │   │
│  │ ☑ Evidence manifest (SHA256 hashes)                         │   │
│  │ ☑ Raw evidence files                                        │   │
│  │ ☑ Screenshots (original resolution)                         │   │
│  │ ☑ Log files                                                 │   │
│  │ ☑ Timeline data (JSON)                                      │   │
│  │ ☐ Research notes (optional)                                 │   │
│  │ ☐ Draft versions (optional)                                 │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  VERIFICATION                                                       │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ ☑ Generate SHA256 manifest                                  │   │
│  │ ☑ Include GPG signature                                     │   │
│  │ ☑ Timestamp with trusted authority                          │   │
│  │ ☐ Notarize (requires notary service)                        │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  Package size estimate: 2.8 GB                                      │
│                                                                     │
│  [Generate Package]                                                 │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 10. Version Control

### 10.1 Auto-Save & Versions

```
┌─────────────────────────────────────────────────────────────────────┐
│ 📚 VERSION HISTORY                                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  NAMED VERSIONS                                                     │
│  ●  v3.0 - "Public Release" .................. Dec 30, 2025        │
│     └── Added F30, F31, 7 victims, factory logs                    │
│  ●  v2.7 - "W^X Analysis Complete" ........... Dec 1, 2025         │
│     └── Added F24-F28, memory protection findings                  │
│  ●  v2.5 - "BuildRoot Discovery" ............. Nov 20, 2025        │
│     └── Added F15-F18, internal UUID analysis                      │
│  ●  v2.0 - "Multi-Victim Confirmation" ....... Nov 10, 2025        │
│     └── Added independent victims, geographic spread               │
│  ●  v1.0 - "Initial Findings" ................ Oct 15, 2025        │
│     └── Original 12 findings                                       │
│                                                                     │
│  AUTO-SAVES (last 24 hours)                                         │
│  ○  Auto-save ................................ 2 min ago           │
│  ○  Auto-save ................................ 17 min ago          │
│  ○  Auto-save ................................ 1 hour ago          │
│  ○  Auto-save ................................ 3 hours ago         │
│                                                                     │
│  [Create Named Version] [Compare] [Restore] [Export Version]       │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 10.2 Change Tracking

```
┌─────────────────────────────────────────────────────────────────────┐
│ 📝 CHANGES SINCE v2.7                                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  SUMMARY                                                            │
│  ├── +2 new findings (F30, F31)                                    │
│  ├── +2 new victims (Ryan F., expanded forensics)                  │
│  ├── +847 lines added                                              │
│  ├── 12 sections modified                                          │
│  └── 3 appendices updated                                          │
│                                                                     │
│  DETAILED CHANGES                                                   │
│                                                                     │
│  + Finding 30: Factory Pre-Install Logs                            │
│    └── New finding, 89 lines                                       │
│                                                                     │
│  + Finding 31: 357 Firmware Blobs                                  │
│    └── New finding, 67 lines                                       │
│                                                                     │
│  ~ Executive Summary                                                │
│    └── Updated metrics: 12→14 Macs, 5→7 victims                    │
│                                                                     │
│  ~ The Scale (table)                                                │
│    └── Added new device entries                                    │
│                                                                     │
│  [View Full Diff] [Revert Section] [Cherry-Pick]                   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 11. Collaboration Features

### 11.1 Review Requests

```
┌─────────────────────────────────────────────────────────────────────┐
│ 👥 REQUEST REVIEW                                                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Request feedback on your document before publishing.               │
│                                                                     │
│  REVIEWERS                                                          │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ [+ Add reviewer by email or username]                       │   │
│  │                                                             │   │
│  │ 👤 alex@security.org                          [Remove]      │   │
│  │    Access: Full document                                    │   │
│  │    Status: Pending                                          │   │
│  │                                                             │   │
│  │ 👤 ryan.f@proton.me                           [Remove]      │   │
│  │    Access: Finding 30-31 only                               │   │
│  │    Status: Invited                                          │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  MESSAGE TO REVIEWERS                                               │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ Hey, please review the new factory findings (F30-F31).     │   │
│  │ Specifically looking for:                                   │   │
│  │ - Technical accuracy                                        │   │
│  │ - Tone (not too inflammatory)                               │   │
│  │ - Any gaps in the evidence chain                            │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  [Send Review Request]                                              │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 11.2 Comment System

```
┌─────────────────────────────────────────────────────────────────────┐
│ 💬 COMMENTS                                              [3 active] │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Finding 30, paragraph 2                                            │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ 👤 Alex (reviewer) · 2 hours ago                            │   │
│  │                                                             │   │
│  │ "The 22-day dormancy period is fascinating. Have you       │   │
│  │  considered whether this is a common pattern across        │   │
│  │  other victims? Might be worth cross-referencing."         │   │
│  │                                                             │   │
│  │ ↳ 👤 Matto · 1 hour ago                                    │   │
│  │   "Good point. Ryan's device showed similar timing.        │   │
│  │    Adding cross-reference note."                           │   │
│  │                                                             │   │
│  │ [Reply] [Resolve]                                          │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  Finding 31, evidence block                                         │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ 👤 Ryan F. (reviewer) · 30 min ago                         │   │
│  │                                                             │   │
│  │ "I have the same directory on my M3. Should I send you     │   │
│  │  the listing for comparison?"                               │   │
│  │                                                             │   │
│  │ [Reply] [Resolve]                                          │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 12. Templates

### 12.1 Document Templates

```
┌─────────────────────────────────────────────────────────────────────┐
│ 📋 TEMPLATES                                                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  SECURITY & RESEARCH                                                │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐       │
│  │ 🔒              │ │ 🐛              │ │ 🔬              │       │
│  │ Security        │ │ Bug Bounty      │ │ Research        │       │
│  │ Disclosure      │ │ Report          │ │ Paper           │       │
│  │                 │ │                 │ │                 │       │
│  │ Findings, TOC,  │ │ Vuln details,   │ │ Abstract,       │       │
│  │ Evidence, CVE   │ │ PoC, Impact     │ │ Methodology     │       │
│  └─────────────────┘ └─────────────────┘ └─────────────────┘       │
│                                                                     │
│  INCIDENT & OPERATIONS                                              │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐       │
│  │ 🚨              │ │ 📊              │ │ 📝              │       │
│  │ Incident        │ │ Post-Mortem     │ │ Runbook         │       │
│  │ Report          │ │ Analysis        │ │                 │       │
│  │                 │ │                 │ │                 │       │
│  │ Timeline,       │ │ Root cause,     │ │ Steps,          │       │
│  │ Impact, Actions │ │ Lessons learned │ │ Troubleshooting │       │
│  └─────────────────┘ └─────────────────┘ └─────────────────┘       │
│                                                                     │
│  BUSINESS & STRATEGY                                                │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐       │
│  │ 📈              │ │ ��              │ │ 🎯              │       │
│  │ Executive       │ │ Technical       │ │ Project         │       │
│  │ Brief           │ │ Proposal        │ │ Charter         │       │
│  └─────────────────┘ └─────────────────┘ └─────────────────┘       │
│                                                                     │
│  [Use Template] [Preview] [Create Custom]                          │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 12.2 Security Disclosure Template

Pre-built structure for security research:

```yaml
Security Disclosure Template:
  metadata:
    - title
    - classification
    - version
    - date
    - researcher
    - research_period
    
  sections:
    - table_of_contents: auto-generated
    - executive_summary:
        - researcher_profile
        - discovery_summary  
        - key_metrics
        - severity_overview
    - findings:
        - template: finding_block
        - repeat: true
        - fields: [id, title, severity, component, description, evidence, impact]
    - analysis:
        - attack_chain
        - timeline
        - scale
        - response_attempts
    - appendices:
        - contact_info
        - evidence_manifest
        - revision_history
        - raw_data
```

---

## 13. Technical Architecture

### 13.1 Data Model

```typescript
interface Document {
  id: string;
  title: string;
  slug: string;
  owner_id: string;
  
  // Content
  blocks: Block[];
  notes: Note[];
  research: ResearchItem[];
  artifacts: Artifact[];
  
  // Metadata
  template?: string;
  classification?: string;
  version: string;
  
  // State
  status: 'draft' | 'review' | 'published' | 'archived';
  visibility: 'private' | 'unlisted' | 'public';
  
  // Timestamps
  created_at: Date;
  updated_at: Date;
  published_at?: Date;
  
  // Collaboration
  collaborators: Collaborator[];
  comments: Comment[];
  review_requests: ReviewRequest[];
  
  // Versions
  versions: Version[];
  current_version: string;
}

interface Block {
  id: string;
  type: BlockType;
  content: any;
  position: number;
  parent_id?: string;  // For nested blocks
  
  // Metadata
  created_at: Date;
  updated_at: Date;
  created_by: string;
  
  // Display
  collapsed: boolean;
  highlighted: boolean;
}

type BlockType = 
  | 'paragraph'
  | 'heading'
  | 'finding'
  | 'evidence'
  | 'code'
  | 'table'
  | 'timeline'
  | 'diagram'
  | 'image'
  | 'callout'
  | 'quote'
  | 'divider'
  | 'artifact'
  | 'reference';
```

### 13.2 Storage Architecture

```
Document Storage:
├── D1 (SQLite)
│   ├── documents (metadata)
│   ├── blocks (content)
│   ├── notes (annotations)
│   ├── versions (history)
│   ├── comments
│   └── collaborators
│
├── R2 (Object Storage)
│   ├── /documents/{id}/images/
│   ├── /documents/{id}/files/
│   ├── /documents/{id}/exports/
│   └── /documents/{id}/evidence/
│
├── Vectorize (Semantic Search)
│   └── Document chunks for AI context
│
└── KV (Caching)
    ├── document:{id}:rendered
    └── document:{id}:toc
```

### 13.3 API Endpoints

```
Documents:
POST   /api/documents                    Create document
GET    /api/documents                    List documents
GET    /api/documents/:id                Get document
PATCH  /api/documents/:id                Update document
DELETE /api/documents/:id                Delete document

Blocks:
POST   /api/documents/:id/blocks         Add block
PATCH  /api/documents/:id/blocks/:bid    Update block
DELETE /api/documents/:id/blocks/:bid    Delete block
POST   /api/documents/:id/blocks/reorder Reorder blocks

Notes:
POST   /api/documents/:id/notes          Add note
PATCH  /api/documents/:id/notes/:nid     Update note
DELETE /api/documents/:id/notes/:nid     Delete note

Research:
POST   /api/documents/:id/research       Add research item
POST   /api/documents/:id/research/analyze  AI analyze
POST   /api/documents/:id/research/process  Process dump

Versions:
GET    /api/documents/:id/versions       List versions
POST   /api/documents/:id/versions       Create version
GET    /api/documents/:id/versions/:vid  Get version
POST   /api/documents/:id/versions/:vid/restore  Restore

Export:
POST   /api/documents/:id/export/pdf     Export PDF
POST   /api/documents/:id/export/docx    Export Word
POST   /api/documents/:id/export/html    Export HTML
POST   /api/documents/:id/export/package Evidence package

AI:
POST   /api/documents/:id/ai/analyze     Analyze content
POST   /api/documents/:id/ai/improve     Improve prose
POST   /api/documents/:id/ai/timeline    Generate timeline
POST   /api/documents/:id/ai/diagram     Generate diagram
POST   /api/documents/:id/ai/check       Run checks
```

---

## 14. Development Phases

### Phase 1: Foundation (6 weeks)
- [ ] Document data model and database schema
- [ ] Basic CRUD operations
- [ ] Block editor with core block types
- [ ] Auto-save functionality
- [ ] Version history (auto-save)

### Phase 2: Research Mode (4 weeks)
- [ ] Evidence dump zone
- [ ] Quick capture (paste, drag-drop)
- [ ] AI evidence analysis
- [ ] Research timeline
- [ ] Notes layer

### Phase 3: Structured Content (4 weeks)
- [ ] Finding block type
- [ ] Table builder
- [ ] Code block enhancements
- [ ] Cross-reference system
- [ ] Structure builder

### Phase 4: AI Integration (6 weeks)
- [ ] Context-aware AI assistant
- [ ] Prose improvement
- [ ] Evidence interpretation
- [ ] Timeline construction
- [ ] Consistency checker
- [ ] Tone analyzer

### Phase 5: Artifacts (4 weeks)
- [ ] Timeline artifacts
- [ ] Diagram artifacts (Mermaid, D3)
- [ ] Chart artifacts (Recharts)
- [ ] Three.js animated visualizations
- [ ] Code block artifacts

### Phase 6: Review & Polish (4 weeks)
- [ ] Review checklist
- [ ] Proofreading mode
- [ ] Diff view
- [ ] Comment system
- [ ] Review requests

### Phase 7: Export & Publishing (4 weeks)
- [ ] PDF export (professional styling)
- [ ] Word export
- [ ] HTML export
- [ ] Evidence package export
- [ ] Public publishing
- [ ] Sharing controls

### Phase 8: Templates & Polish (4 weeks)
- [ ] Security disclosure template
- [ ] Additional templates
- [ ] Custom template builder
- [ ] Performance optimization
- [ ] Mobile responsiveness

**Total: ~36 weeks**

---

## 15. Success Criteria

### User Goals
| Goal | Success Metric |
|------|----------------|
| Can dump raw evidence quickly | < 5 seconds to add content |
| Can organize chaos into structure | AI suggests structure in < 30s |
| Can write with AI assistance | AI improves prose, doesn't replace |
| Can track what needs work | Notes and todos visible and actionable |
| Can produce polished output | Professional PDF in one click |
| Can share for review | Invite reviewers, track comments |
| Can maintain versions | Full history, named versions |

### Technical Metrics
| Metric | Target |
|--------|--------|
| Page load time | < 2s |
| Auto-save latency | < 500ms |
| AI response time | < 3s |
| Export generation | < 30s for 50-page PDF |
| Search accuracy | > 90% relevance |

### Quality Metrics
| Metric | Target |
|--------|--------|
| AI accuracy | No hallucinated content |
| Export fidelity | 100% content preserved |
| Version integrity | Zero data loss |
| Collaboration sync | Real-time updates |

---

## 16. Appendix: Use Case - Security Disclosure

### Workflow Example

**Day 1-30: Research Phase**
1. Create new document from "Security Disclosure" template
2. Dump initial findings into evidence zone
3. AI analyzes and suggests categorization
4. Add notes: "Need to verify", "Ask Alex", etc.
5. Build out findings as evidence accumulates

**Day 31-60: Draft Phase**
1. Use structure builder to organize 31 findings
2. AI helps group findings by component
3. Write prose descriptions with AI improvement
4. Build tables for findings index, device inventory
5. Cross-reference related findings

**Day 61-75: Review Phase**
1. Run consistency checker
2. Request review from 2 trusted parties
3. Address comments and questions
4. Proofreading pass with tone analyzer
5. Create named version "v3.0 - Public Release"

**Day 76: Publish Phase**
1. Final review checklist
2. Generate professional PDF
3. Generate evidence package with SHA256 manifest
4. Publish to foohut.com/@matto/apple-silicon-disclosure
5. Export for submission to security researchers

### Before/After

**BEFORE (Current Tools)**
- 47 Google Docs with random notes
- Screenshots in 12 different folders
- Log files scattered across machines
- No version control
- Manual formatting for hours
- Hope you don't lose anything

**AFTER (foohut Document Canvas)**
- Single workspace with everything
- Evidence automatically analyzed and categorized
- Notes attached to relevant content
- Full version history
- One-click professional export
- Evidence package with cryptographic verification

---

**END OF SCOPE**

*"From chaos to polished deliverable"*

*foohut Document Canvas - Because your work deserves better than Google Docs*
