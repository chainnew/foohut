-- Document Canvas Schema
-- "From chaos to polished deliverable"

-- Documents table - the main document entity
CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
    title TEXT NOT NULL,
    slug TEXT NOT NULL,
    owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    org_id TEXT REFERENCES organizations(id) ON DELETE SET NULL,
    
    -- Template & Classification
    template TEXT, -- 'security_disclosure', 'bug_bounty', 'incident_report', etc.
    classification TEXT DEFAULT 'internal', -- 'public', 'internal', 'confidential', 'restricted'
    
    -- State
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'published', 'archived')),
    visibility TEXT DEFAULT 'private' CHECK (visibility IN ('private', 'unlisted', 'public', 'password')),
    password_hash TEXT, -- For password-protected documents
    
    -- Current version tracking
    current_version TEXT DEFAULT '0.1',
    current_version_id TEXT,
    
    -- Document mode
    mode TEXT DEFAULT 'draft' CHECK (mode IN ('research', 'draft', 'review', 'present', 'export')),
    
    -- Metadata
    description TEXT,
    cover_image TEXT,
    icon TEXT,
    
    -- Timestamps
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    published_at TEXT,
    last_auto_save TEXT,
    
    -- Stats
    word_count INTEGER DEFAULT 0,
    block_count INTEGER DEFAULT 0,
    
    UNIQUE(owner_id, slug)
);

CREATE INDEX idx_documents_owner ON documents(owner_id);
CREATE INDEX idx_documents_org ON documents(org_id);
CREATE INDEX idx_documents_status ON documents(status);
CREATE INDEX idx_documents_visibility ON documents(visibility);
CREATE INDEX idx_documents_template ON documents(template);

-- Blocks table - content blocks within documents
CREATE TABLE IF NOT EXISTS document_blocks (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
    document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    parent_id TEXT REFERENCES document_blocks(id) ON DELETE CASCADE, -- For nested blocks
    
    -- Block type
    type TEXT NOT NULL CHECK (type IN (
        'paragraph', 'heading', 'finding', 'evidence', 'code', 'table',
        'timeline', 'diagram', 'image', 'callout', 'quote', 'divider',
        'artifact', 'reference', 'command', 'hash', 'file', 'list', 'todo'
    )),
    
    -- Content (JSON structure varies by type)
    content TEXT NOT NULL DEFAULT '{}', -- JSON
    
    -- Position & hierarchy
    position INTEGER NOT NULL DEFAULT 0,
    depth INTEGER DEFAULT 0,
    
    -- Display state
    collapsed BOOLEAN DEFAULT FALSE,
    highlighted BOOLEAN DEFAULT FALSE,
    
    -- Layer (which layer this block belongs to)
    layer TEXT DEFAULT 'visible' CHECK (layer IN ('visible', 'notes', 'research', 'artifacts')),
    
    -- Metadata
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    created_by TEXT REFERENCES users(id),
    
    -- For evidence blocks
    source TEXT, -- Where this evidence came from
    verified BOOLEAN DEFAULT FALSE,
    hash TEXT -- SHA256 of content for verification
);

CREATE INDEX idx_blocks_document ON document_blocks(document_id);
CREATE INDEX idx_blocks_parent ON document_blocks(parent_id);
CREATE INDEX idx_blocks_type ON document_blocks(type);
CREATE INDEX idx_blocks_layer ON document_blocks(layer);
CREATE INDEX idx_blocks_position ON document_blocks(document_id, position);

-- Findings table - structured finding blocks (extends blocks)
CREATE TABLE IF NOT EXISTS document_findings (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
    document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    block_id TEXT REFERENCES document_blocks(id) ON DELETE CASCADE,
    
    -- Finding metadata
    finding_id TEXT NOT NULL, -- F1, F2, etc.
    title TEXT NOT NULL,
    severity TEXT NOT NULL CHECK (severity IN ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO')),
    component TEXT,
    status TEXT DEFAULT 'INVESTIGATING' CHECK (status IN ('CONFIRMED', 'SUSPECTED', 'INVESTIGATING', 'RESOLVED', 'FALSE_POSITIVE')),
    
    -- Dates
    discovered_at TEXT,
    confirmed_at TEXT,
    resolved_at TEXT,
    
    -- Confidence & priority
    confidence INTEGER DEFAULT 50 CHECK (confidence >= 0 AND confidence <= 100),
    priority INTEGER DEFAULT 0,
    
    -- Related findings (JSON array of finding IDs)
    related_findings TEXT DEFAULT '[]',
    
    -- CVE/CWE if applicable
    cve_id TEXT,
    cwe_id TEXT,
    
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    
    UNIQUE(document_id, finding_id)
);

CREATE INDEX idx_findings_document ON document_findings(document_id);
CREATE INDEX idx_findings_severity ON document_findings(severity);
CREATE INDEX idx_findings_status ON document_findings(status);

-- Notes table - annotations, todos, questions
CREATE TABLE IF NOT EXISTS document_notes (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
    document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    block_id TEXT REFERENCES document_blocks(id) ON DELETE SET NULL, -- Which block this note is attached to
    
    -- Note type
    type TEXT NOT NULL CHECK (type IN ('note', 'question', 'todo', 'warning', 'idea')),
    
    -- Content
    content TEXT NOT NULL,
    
    -- Position
    position TEXT DEFAULT 'margin' CHECK (position IN ('inline', 'margin', 'floating')),
    
    -- Priority & state
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    resolved BOOLEAN DEFAULT FALSE,
    resolved_at TEXT,
    resolved_by TEXT REFERENCES users(id),
    
    -- For todos
    assignee_id TEXT REFERENCES users(id),
    due_date TEXT,
    
    -- Metadata
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    created_by TEXT REFERENCES users(id)
);

CREATE INDEX idx_notes_document ON document_notes(document_id);
CREATE INDEX idx_notes_block ON document_notes(block_id);
CREATE INDEX idx_notes_type ON document_notes(type);
CREATE INDEX idx_notes_resolved ON document_notes(resolved);

-- Versions table - document version history
CREATE TABLE IF NOT EXISTS document_versions (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
    document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    
    -- Version info
    version TEXT NOT NULL, -- '1.0', '2.1', etc.
    name TEXT, -- Named version like "Public Release"
    description TEXT,
    
    -- Type
    type TEXT DEFAULT 'auto' CHECK (type IN ('auto', 'manual', 'published')),
    
    -- Snapshot of document state (JSON)
    snapshot TEXT NOT NULL, -- Full document content at this version
    
    -- Stats at this version
    word_count INTEGER DEFAULT 0,
    block_count INTEGER DEFAULT 0,
    
    -- Metadata
    created_at TEXT DEFAULT (datetime('now')),
    created_by TEXT REFERENCES users(id)
);

CREATE INDEX idx_versions_document ON document_versions(document_id);
CREATE INDEX idx_versions_type ON document_versions(type);
CREATE INDEX idx_versions_created ON document_versions(created_at);

-- Research items - evidence dump zone
CREATE TABLE IF NOT EXISTS document_research (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
    document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    
    -- Content type
    type TEXT NOT NULL CHECK (type IN ('paste', 'file', 'screenshot', 'url', 'note', 'log', 'command')),
    
    -- Raw content
    content TEXT,
    file_path TEXT, -- For uploaded files (R2 path)
    file_name TEXT,
    file_size INTEGER,
    file_type TEXT,
    
    -- AI analysis results (JSON)
    analysis TEXT,
    
    -- Processing state
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'analyzed', 'archived', 'added')),
    
    -- If added to document, which block
    added_to_block_id TEXT REFERENCES document_blocks(id) ON DELETE SET NULL,
    added_to_finding_id TEXT REFERENCES document_findings(id) ON DELETE SET NULL,
    
    -- Metadata
    source TEXT, -- Where this came from
    captured_at TEXT, -- When the evidence was captured (not when added)
    
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    created_by TEXT REFERENCES users(id)
);

CREATE INDEX idx_research_document ON document_research(document_id);
CREATE INDEX idx_research_type ON document_research(type);
CREATE INDEX idx_research_status ON document_research(status);

-- Collaborators table
CREATE TABLE IF NOT EXISTS document_collaborators (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
    document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Role
    role TEXT DEFAULT 'viewer' CHECK (role IN ('viewer', 'commenter', 'editor', 'admin')),
    
    -- Access scope (JSON array of section/finding IDs, null = full access)
    access_scope TEXT,
    
    -- Invitation
    invited_by TEXT REFERENCES users(id),
    invited_at TEXT DEFAULT (datetime('now')),
    accepted_at TEXT,
    
    -- Activity
    last_viewed_at TEXT,
    
    UNIQUE(document_id, user_id)
);

CREATE INDEX idx_collaborators_document ON document_collaborators(document_id);
CREATE INDEX idx_collaborators_user ON document_collaborators(user_id);

-- Comments table
CREATE TABLE IF NOT EXISTS document_comments (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
    document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    block_id TEXT REFERENCES document_blocks(id) ON DELETE CASCADE,
    parent_id TEXT REFERENCES document_comments(id) ON DELETE CASCADE, -- For replies
    
    -- Content
    content TEXT NOT NULL,
    
    -- State
    resolved BOOLEAN DEFAULT FALSE,
    resolved_at TEXT,
    resolved_by TEXT REFERENCES users(id),
    
    -- Metadata
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    created_by TEXT NOT NULL REFERENCES users(id)
);

CREATE INDEX idx_comments_document ON document_comments(document_id);
CREATE INDEX idx_comments_block ON document_comments(block_id);
CREATE INDEX idx_comments_parent ON document_comments(parent_id);
CREATE INDEX idx_comments_resolved ON document_comments(resolved);

-- Review requests table
CREATE TABLE IF NOT EXISTS document_reviews (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
    document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    reviewer_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    requested_by TEXT NOT NULL REFERENCES users(id),
    
    -- Review scope (JSON array of section/finding IDs, null = full document)
    scope TEXT,
    
    -- Message to reviewer
    message TEXT,
    
    -- State
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'declined')),
    
    -- Review result
    approved BOOLEAN,
    feedback TEXT,
    
    -- Timestamps
    requested_at TEXT DEFAULT (datetime('now')),
    started_at TEXT,
    completed_at TEXT,
    
    UNIQUE(document_id, reviewer_id)
);

CREATE INDEX idx_reviews_document ON document_reviews(document_id);
CREATE INDEX idx_reviews_reviewer ON document_reviews(reviewer_id);
CREATE INDEX idx_reviews_status ON document_reviews(status);

-- Cross-references table
CREATE TABLE IF NOT EXISTS document_references (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
    document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    
    -- Source and target
    from_block_id TEXT NOT NULL REFERENCES document_blocks(id) ON DELETE CASCADE,
    to_block_id TEXT REFERENCES document_blocks(id) ON DELETE CASCADE,
    to_finding_id TEXT REFERENCES document_findings(id) ON DELETE CASCADE,
    to_external_url TEXT,
    
    -- Reference type
    type TEXT NOT NULL CHECK (type IN ('supports', 'contradicts', 'extends', 'see_also', 'prerequisite', 'citation')),
    
    -- Description
    description TEXT,
    
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_references_document ON document_references(document_id);
CREATE INDEX idx_references_from ON document_references(from_block_id);
CREATE INDEX idx_references_to_block ON document_references(to_block_id);
CREATE INDEX idx_references_to_finding ON document_references(to_finding_id);

-- Templates table
CREATE TABLE IF NOT EXISTS document_templates (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
    
    -- Template info
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    category TEXT, -- 'security', 'incident', 'business', etc.
    icon TEXT,
    
    -- Template structure (JSON)
    structure TEXT NOT NULL,
    
    -- Default blocks (JSON array)
    default_blocks TEXT,
    
    -- Visibility
    is_system BOOLEAN DEFAULT FALSE, -- System templates can't be deleted
    is_public BOOLEAN DEFAULT TRUE,
    owner_id TEXT REFERENCES users(id),
    
    -- Stats
    use_count INTEGER DEFAULT 0,
    
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_templates_category ON document_templates(category);
CREATE INDEX idx_templates_public ON document_templates(is_public);

-- Insert default templates
INSERT INTO document_templates (id, name, slug, description, category, icon, is_system, structure, default_blocks) VALUES
('tpl_security', 'Security Disclosure', 'security-disclosure', 'Structured template for security research disclosures with findings, evidence, and impact analysis', 'security', '🔒', TRUE, 
'{"sections":["executive_summary","findings","analysis","appendices"],"metadata":["classification","version","researcher","research_period"]}',
'[{"type":"heading","content":{"text":"Executive Summary","level":1}},{"type":"paragraph","content":{"text":""}},{"type":"heading","content":{"text":"Findings","level":1}},{"type":"heading","content":{"text":"Analysis","level":1}},{"type":"heading","content":{"text":"Appendices","level":1}}]'),

('tpl_bugbounty', 'Bug Bounty Report', 'bug-bounty', 'Template for bug bounty submissions with vulnerability details, PoC, and impact', 'security', '🐛', TRUE,
'{"sections":["summary","vulnerability","poc","impact","remediation"],"metadata":["program","severity","bounty_range"]}',
'[{"type":"heading","content":{"text":"Summary","level":1}},{"type":"heading","content":{"text":"Vulnerability Details","level":1}},{"type":"heading","content":{"text":"Proof of Concept","level":1}},{"type":"heading","content":{"text":"Impact","level":1}},{"type":"heading","content":{"text":"Remediation","level":1}}]'),

('tpl_incident', 'Incident Report', 'incident-report', 'Template for documenting security incidents with timeline, impact, and response actions', 'incident', '🚨', TRUE,
'{"sections":["summary","timeline","impact","response","lessons"],"metadata":["incident_id","severity","status"]}',
'[{"type":"heading","content":{"text":"Incident Summary","level":1}},{"type":"heading","content":{"text":"Timeline","level":1}},{"type":"heading","content":{"text":"Impact Assessment","level":1}},{"type":"heading","content":{"text":"Response Actions","level":1}},{"type":"heading","content":{"text":"Lessons Learned","level":1}}]'),

('tpl_postmortem', 'Post-Mortem Analysis', 'post-mortem', 'Template for post-incident analysis with root cause and preventive measures', 'incident', '📊', TRUE,
'{"sections":["summary","timeline","root_cause","impact","prevention"],"metadata":["incident_ref","date","participants"]}',
'[{"type":"heading","content":{"text":"Summary","level":1}},{"type":"heading","content":{"text":"Timeline","level":1}},{"type":"heading","content":{"text":"Root Cause Analysis","level":1}},{"type":"heading","content":{"text":"Impact","level":1}},{"type":"heading","content":{"text":"Prevention Measures","level":1}}]'),

('tpl_research', 'Research Paper', 'research-paper', 'Academic-style template for research documentation', 'research', '🔬', TRUE,
'{"sections":["abstract","introduction","methodology","results","discussion","conclusion"],"metadata":["authors","institution","keywords"]}',
'[{"type":"heading","content":{"text":"Abstract","level":1}},{"type":"heading","content":{"text":"Introduction","level":1}},{"type":"heading","content":{"text":"Methodology","level":1}},{"type":"heading","content":{"text":"Results","level":1}},{"type":"heading","content":{"text":"Discussion","level":1}},{"type":"heading","content":{"text":"Conclusion","level":1}}]'),

('tpl_blank', 'Blank Document', 'blank', 'Start from scratch with a blank canvas', 'general', '📄', TRUE,
'{"sections":[]}',
'[{"type":"heading","content":{"text":"Untitled Document","level":1}},{"type":"paragraph","content":{"text":""}}]');
