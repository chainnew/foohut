# FooHut Cyber - Complete Technical Specification

## Hunt. Analyze. Respond. Report.

**Version:** 1.0.0  
**Last Updated:** January 2026  
**Status:** Complete Specification  
**Classification:** Internal Development Document

---

## Executive Summary

FooHut Cyber is an enterprise-grade threat intelligence and incident response platform that combines safe code analysis, MITRE ATT&CK integration, AI-powered log analysis, and comprehensive incident management into a unified security operations center.

### Core Philosophy

> "Every incident tells a story. FooHut Cyber helps you read it."

### Target Users

| Role | Primary Use Cases |
|------|-------------------|
| SOC Analyst | Triage alerts, analyze samples, hunt threats |
| Incident Responder | Manage incidents, coordinate response, document actions |
| Threat Intel Analyst | Track actors, enrich IOCs, produce intelligence |
| Forensic Investigator | Analyze evidence, build timelines, maintain chain of custody |
| Security Manager | Track metrics, review reports, resource allocation |
| CISO/Executive | Executive summaries, compliance reporting, risk visibility |

### Key Differentiators

1. **Unified Platform**: All IR capabilities in one place - no tool switching
2. **AI-Native**: Not bolted-on AI - built from ground up with intelligence
3. **MITRE-First**: Every analysis maps to ATT&CK automatically
4. **Evidence-Grade**: Chain of custody and forensic integrity built-in
5. **Beautiful Reports**: AI writes reports humans actually want to read

---

## Module Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         FOOHUT CYBER                                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐               │
│  │   SANDBOX    │  │    MITRE     │  │  INCIDENTS   │               │
│  │     🧪       │  │     🎯       │  │     🚨       │               │
│  │  JS / HTML   │  │   ATT&CK     │  │   Response   │               │
│  │  Deobfusc.   │  │   Navigator  │  │   Playbooks  │               │
│  └──────────────┘  └──────────────┘  └──────────────┘               │
│                                                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐               │
│  │  AI ANALYSIS │  │     IOCs     │  │   EVIDENCE   │               │
│  │     🤖       │  │     💀       │  │     📁       │               │
│  │  Log Parse   │  │  Management  │  │    Vault     │               │
│  │  Correlate   │  │  Enrichment  │  │   Custody    │               │
│  └──────────────┘  └──────────────┘  └──────────────┘               │
│                                                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐               │
│  │   TIMELINE   │  │   REPORTS    │  │ THREAT INTEL │               │
│  │     📅       │  │     📄       │  │     🌐       │               │
│  │   Builder    │  │  Generator   │  │    Feeds     │               │
│  │   AI Recon   │  │  AI Writer   │  │   Tracking   │               │
│  └──────────────┘  └──────────────┘  └──────────────┘               │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 1. Cyber Dashboard

The command center for security operations - real-time visibility into threats, incidents, and team activity.

### 1.1 Threat Level Indicator

**Threat Levels:**

| Level | Color | Criteria |
|-------|-------|----------|
| CRITICAL | �� Red | Active breach, ransomware execution, data exfiltration confirmed |
| HIGH | 🟠 Orange | Multiple critical incidents, targeted campaign detected |
| ELEVATED | 🟡 Yellow | Active incidents, IOC matches, anomalous activity |
| GUARDED | 🔵 Blue | Minor incidents, routine alerts |
| LOW | 🟢 Green | No active incidents, all systems nominal |

### 1.2 Key Metrics

- **MTTD** (Mean Time to Detect): Track detection efficiency
- **MTTR** (Mean Time to Respond): Track response efficiency
- **Active Incidents**: Real-time incident count by severity
- **Resolution Rate**: Percentage of incidents closed within SLA
- **IOCs Tracked**: Total indicators in database
- **Logs Analyzed**: Volume of log data processed

### 1.3 Components

- ThreatLevelIndicator: Dynamic color-coded threat status
- ActiveIncidentsPanel: Live incident cards with severity
- SecurityMetricsGrid: Key performance indicators
- MitreHeatmapMini: Top techniques visualization
- ActivityFeed: Real-time team activity stream

---

## 2. Code Sandbox 🧪

Safe, isolated execution environment for analyzing malicious JavaScript, HTML, and other web-based threats.

### 2.1 JavaScript Sandbox

**Features:**
- **Safe Isolated Execution**: Web Worker-based sandboxing with no network access
- **API Hooking**: Intercept eval(), fetch(), XMLHttpRequest, DOM methods
- **Deobfuscation Toolkit**: Auto-detect obfuscators (javascript-obfuscator, etc.)
- **Behavior Analysis**: Track all API calls, network attempts, DOM modifications
- **Network Simulation**: Isolated / Simulated / Live modes

**Deobfuscation Steps:**
1. Array Shuffle Reversal
2. String Array Substitution
3. Variable Renaming
4. Dead Code Removal
5. Control Flow Unflattening
6. String Concatenation Resolution

**Analysis Outputs:**
- Deobfuscated code with transformations
- API calls log with threat indicators
- Console output capture
- Extracted IOCs (IPs, domains, URLs, hashes)
- MITRE ATT&CK technique mapping
- Verdict with confidence score

### 2.2 HTML/Web Sandbox

**Features:**
- **Safe Rendering**: Isolated iframe with CSP restrictions
- **Phishing Detection**: Brand impersonation scoring
- **Visual Similarity**: Compare against known brand assets
- **Form Analysis**: Extract all form actions and hidden fields
- **Hidden Elements**: Detect hidden iframes, invisible inputs

**Brand Detection:**
- Logo similarity scoring
- Layout comparison
- Color scheme matching
- Typography analysis
- Overall confidence score

### 2.3 Encoding/Decoding Tools

- Base64 (single and double encoding)
- Hexadecimal
- Unicode escapes
- ROT13
- URL encoding
- XOR (with key detection)
- Gzip decompression
- Auto-detection with decode chain

---

## 3. MITRE ATT&CK Integration 🎯

Full integration with the MITRE ATT&CK framework for technique mapping, detection coverage, and threat intelligence.

### 3.1 ATT&CK Navigator

**Features:**
- Full Enterprise matrix visualization (14 tactics, 200+ techniques)
- Heat map showing technique frequency in incidents
- Layer management for comparing incidents
- Coverage statistics per tactic
- Click-through to technique details

**Matrix Tactics:**
1. Reconnaissance
2. Resource Development
3. Initial Access
4. Execution
5. Persistence
6. Privilege Escalation
7. Defense Evasion
8. Credential Access
9. Discovery
10. Lateral Movement
11. Collection
12. Command & Control
13. Exfiltration
14. Impact

### 3.2 Technique Detail View

For each technique:
- Full MITRE description
- Observations in current incident
- Detection rules (Sigma, YARA, KQL, Splunk)
- Recommended mitigations
- Related IOCs from incident
- Passive DNS data

### 3.3 AI TTP Mapping Assistant

- Natural language description input
- Automatic technique identification
- Confidence scoring per technique
- Evidence linking
- Accept/Edit/Reject workflow
- Batch addition to incident

---

## 4. Incident Management 🚨

Complete incident response workflow from detection through recovery.

### 4.1 Incident Lifecycle

```
Detection → Containment → Eradication → Recovery → Closed
```

**Severity Levels:**
- 🔴 Critical: Business-critical impact, executive notification required
- 🟠 High: Significant impact, immediate response required
- 🟡 Medium: Moderate impact, response within SLA
- 🔵 Low: Minimal impact, routine handling

### 4.2 Team Management

**Roles:**
- Lead: Overall incident coordination
- Forensics: Evidence collection and analysis
- Network: Network-level investigation
- Malware: Malware analysis
- Log Analysis: Log review and correlation
- Communications: Stakeholder updates
- Legal: Legal and compliance coordination

### 4.3 Playbook Execution

**Pre-built Playbooks:**
- Ransomware Response (24 steps, 8-24h estimated)
- Phishing Response (18 steps, 2-6h estimated)
- Data Exfiltration (20 steps, 4-12h estimated)
- Business Email Compromise (15 steps, 2-4h estimated)
- Insider Threat (22 steps, varies)

**Playbook Features:**
- Phase-based organization
- Step-by-step execution tracking
- Assignment per step
- Notes and evidence linking
- AI recommendations based on progress
- Time tracking per step

### 4.4 Incident Features

- Activity feed with real-time updates
- External notifications tracking (FBI, insurance, legal)
- Affected systems inventory
- Impact estimation
- MTTD/MTTR tracking
- Related incidents linking

---

## 5. AI Log Analysis 🤖

AI-powered analysis that can parse millions of log lines, detect patterns, and correlate events across sources.

### 5.1 Supported Log Types

- Windows Event Logs (.evtx)
- Syslog
- JSON Lines
- Apache/Nginx access logs
- Firewall logs (various vendors)
- CloudTrail
- Azure AD logs
- Zeek/Bro
- Suricata
- PCAP (network captures)
- Custom formats with auto-detection

### 5.2 Analysis Capabilities

**Threat Detection:**
- C2 beaconing pattern detection
- Credential access attempts
- Data exfiltration indicators
- Lateral movement detection
- Anomalous authentication
- Service account abuse

**IOC Extraction:**
- IP addresses (internal/external classification)
- Domain names
- URLs
- File hashes
- Email addresses
- User agents

**AI Features:**
- Natural language query interface
- Attack narrative generation
- Cross-source correlation
- Visibility gap identification
- Timeline reconstruction
- Suggested follow-up queries

### 5.3 Correlation Engine

- Cross-reference multiple log sources
- Auto-detect attack chains
- Timeline visualization across sources
- MITRE mapping of correlated events
- Confidence scoring for correlations

---

## 6. IOC Management 💀

Comprehensive indicator of compromise tracking with enrichment and threat intelligence integration.

### 6.1 IOC Types

- IP addresses
- Domains
- URLs
- File hashes (MD5, SHA1, SHA256)
- Email addresses
- Filenames
- Registry keys
- Mutex names
- User agents
- JA3/JARM fingerprints

### 6.2 Enrichment Sources

- VirusTotal
- AlienVault OTX
- Abuse.ch (URLhaus, MalwareBazaar)
- EmergingThreats
- CrowdStrike
- Mandiant
- MISP Communities
- Custom TAXII feeds

### 6.3 IOC Features

- Threat scoring (0-100 composite)
- Confidence levels
- Geolocation for IPs
- Passive DNS history
- Related IOCs mapping
- Malware family association
- Threat actor attribution
- First/last seen tracking
- Observation count

### 6.4 Import/Export

**Import Formats:**
- CSV
- JSON
- STIX 2.1
- OpenIOC
- MISP JSON
- Plain text (with auto-detect)

**Export Formats:**
- CSV
- JSON
- STIX 2.1
- Firewall block lists
- SIEM integration formats

---

## 7. Evidence Vault 📁

Secure evidence storage with chain of custody tracking and forensic integrity verification.

### 7.1 Evidence Types

- Malware samples
- Memory dumps
- Disk images
- Log files
- Screenshots
- Network captures (PCAP)
- Emails
- Documents
- Other/custom

### 7.2 Evidence Metadata

- Original filename
- File size and type
- Collection method
- Collection time
- Collected by
- Source system
- Tags
- Description

### 7.3 Hash Verification

- MD5
- SHA1
- SHA256
- Verification at upload
- Verification at access
- Integrity alerts

### 7.4 Chain of Custody

Every action tracked:
- Collected
- Uploaded
- Accessed
- Downloaded
- Analyzed
- Modified
- Transferred
- Deleted

Each entry includes:
- Timestamp
- User
- IP address
- Action details
- Digital signature
- Hash at time of action

### 7.5 Auto-Analysis

- Sandbox execution for executables
- Hash lookup (VirusTotal, MalwareBazaar)
- IOC extraction
- Malware family identification
- String extraction
- Artifact extraction

---

## 8. Timeline Builder 📅

Visual attack timeline construction with AI-assisted reconstruction.

### 8.1 Event Types (MITRE Tactic Aligned)

- 🟢 Initial Access
- 🔵 Execution
- 🟣 Persistence
- 🟤 Privilege Escalation
- ⚫ Defense Evasion
- 🟡 Credential Access
- 🔵 Discovery
- 🟠 Lateral Movement
- 🟤 Collection
- 🟣 Command & Control
- 🔴 Exfiltration
- ⚫ Impact

### 8.2 Event Attributes

- Timestamp with timezone
- Event type
- Title and description
- Source/destination systems
- User account
- Data source (EDR, Firewall, etc.)
- MITRE technique mapping
- Evidence linking
- IOC linking
- Severity/confidence

### 8.3 AI Timeline Reconstruction

**Input:**
- Multiple log sources
- Focus areas selection
- Time window

**Output:**
- Auto-generated timeline events
- Attack chain summary
- MITRE technique mapping
- Visibility gaps identified
- Preview before applying

---

## 9. Report Generator 📄

AI-assisted incident report generation for every audience.

### 9.1 Report Templates

| Template | Audience | Length | Content |
|----------|----------|--------|---------|
| Executive Summary | Leadership | 2-3 pages | Business impact, key decisions |
| Technical Incident | Security Team | 15-30 pages | Full technical analysis |
| Threat Intelligence | Peers/ISACs | 5-10 pages | Shareable IOCs and TTPs |
| Compliance/Regulatory | Legal/Regulators | 10-20 pages | GDPR/HIPAA format |
| Post-Incident Review | Internal | 5-10 pages | Lessons learned |
| Custom | Variable | Variable | Build your own |

### 9.2 AI Writing Assistant

**Quick Actions:**
- Summarize timeline
- List all IOCs
- Describe TTPs
- Generate statistics
- Explain for executives

**Section Generation:**
- Natural language prompts
- Context-aware suggestions
- Fact checking against incident data
- Insert/edit/regenerate workflow
- Quality scoring

### 9.3 Export Options

**Formats:**
- PDF (branded)
- Microsoft Word (.docx)
- HTML
- Markdown
- STIX 2.1 Bundle

**Options:**
- Table of contents
- Timeline visualization
- MITRE ATT&CK heat map
- IOC appendix
- Evidence index
- Classification level
- Redaction options

---

## 10. Threat Intelligence 🌐

Real-time threat feeds and actor tracking.

### 10.1 Threat Feeds

**Built-in Integrations:**
- AlienVault OTX
- Abuse.ch URLhaus
- Abuse.ch MalwareBazaar
- EmergingThreats
- MISP Communities

**Custom Feeds:**
- TAXII 2.x support
- STIX 2.1 import
- CSV feeds
- API integrations

### 10.2 Feed Features

- Auto-sync scheduling
- IOC match alerting
- De-duplication
- Confidence scoring
- Age-based decay
- Tag mapping

### 10.3 Threat Actor Tracking

**Actor Profile:**
- Aliases
- Origin/attribution
- Motivation
- Target industries
- Target regions
- Known malware
- Known TTPs
- Activity timeline

**Sector Alerts:**
- Campaigns targeting your industry
- Geographic targeting
- New malware variants
- Infrastructure changes

---

## 11. Database Schema

### Core Tables

```sql
-- Incidents
cyber_incidents           -- Main incident records
incident_team            -- Team member assignments
incident_updates         -- Activity feed
incident_playbooks       -- Playbook execution
playbook_step_executions -- Step tracking
playbook_templates       -- Playbook definitions

-- Timeline
timeline_events          -- Timeline events with MITRE mapping

-- IOCs
iocs                     -- Indicator records with enrichment
incident_iocs            -- Incident-IOC relationships
ioc_observations         -- Observation history

-- Evidence
evidence                 -- Evidence records
evidence_custody         -- Chain of custody log

-- Analysis
sandbox_analyses         -- Sandbox analysis results
log_analyses             -- Log analysis jobs
log_analysis_files       -- Individual log files

-- MITRE
mitre_techniques         -- ATT&CK technique library
incident_mitre_mappings  -- Incident technique mappings
detection_rules          -- Detection rule library

-- Threat Intel
threat_feeds             -- Feed configurations
threat_actors            -- Actor profiles

-- Reports
incident_reports         -- Report records
```

### Key Relationships

- Incidents → Team, Updates, IOCs, Evidence, Timeline, MITRE, Reports
- IOCs → Observations, Incidents, Enrichment
- Evidence → Chain of Custody, Analysis Results
- Timeline Events → MITRE Techniques, Evidence, IOCs
- Log Analyses → Files, Extracted Data

---

## 12. API Endpoints

### Incidents
```
GET/POST   /api/cyber/incidents
GET/PUT/DELETE /api/cyber/incidents/:id
POST       /api/cyber/incidents/:id/escalate
POST       /api/cyber/incidents/:id/assign
POST       /api/cyber/incidents/:id/status
GET        /api/cyber/incidents/:id/timeline
GET        /api/cyber/incidents/:id/iocs
GET        /api/cyber/incidents/:id/evidence
GET/POST   /api/cyber/incidents/:id/updates
GET        /api/cyber/incidents/:id/mitre
GET        /api/cyber/incidents/:id/reports
GET/POST   /api/cyber/incidents/:id/playbook
PUT        /api/cyber/incidents/:id/playbook/step
```

### IOCs
```
GET/POST   /api/cyber/iocs
POST       /api/cyber/iocs/bulk
GET/PUT/DELETE /api/cyber/iocs/:id
POST       /api/cyber/iocs/:id/enrich
GET        /api/cyber/iocs/:id/observations
POST/DELETE /api/cyber/iocs/:id/link/:incidentId
POST       /api/cyber/iocs/search
GET        /api/cyber/iocs/export
POST       /api/cyber/iocs/import
```

### Evidence
```
GET/POST   /api/cyber/evidence
GET/PUT/DELETE /api/cyber/evidence/:id
GET        /api/cyber/evidence/:id/download
GET        /api/cyber/evidence/:id/custody
POST       /api/cyber/evidence/:id/analyze
GET        /api/cyber/evidence/:id/analysis
POST       /api/cyber/evidence/:id/extract-iocs
```

### Sandbox
```
POST       /api/cyber/sandbox/javascript
POST       /api/cyber/sandbox/html
POST       /api/cyber/sandbox/file
POST       /api/cyber/sandbox/url
GET        /api/cyber/sandbox/:id
GET        /api/cyber/sandbox/:id/deobfuscate
POST       /api/cyber/sandbox/:id/rerun
POST       /api/cyber/sandbox/decode
```

### Timeline
```
GET/POST   /api/cyber/timeline/:incidentId
PUT/DELETE /api/cyber/timeline/:incidentId/:eventId
POST       /api/cyber/timeline/:incidentId/ai-reconstruct
GET        /api/cyber/timeline/:incidentId/export
```

### Log Analysis
```
POST       /api/cyber/logs/analyze
GET        /api/cyber/logs/:id
GET        /api/cyber/logs/:id/threats
GET        /api/cyber/logs/:id/iocs
GET        /api/cyber/logs/:id/timeline
POST       /api/cyber/logs/:id/query
GET        /api/cyber/logs/:id/correlation
```

### MITRE
```
GET        /api/cyber/mitre/techniques
GET        /api/cyber/mitre/techniques/:id
GET        /api/cyber/mitre/techniques/:id/rules
GET        /api/cyber/mitre/matrix
POST       /api/cyber/mitre/map
GET        /api/cyber/mitre/coverage/:incidentId
```

### Reports
```
GET/POST   /api/cyber/reports
GET/PUT/DELETE /api/cyber/reports/:id
POST       /api/cyber/reports/:id/ai-write
POST       /api/cyber/reports/:id/export
GET        /api/cyber/reports/templates
```

### Threat Intel
```
GET/POST   /api/cyber/threatintel/feeds
PUT/DELETE /api/cyber/threatintel/feeds/:id
POST       /api/cyber/threatintel/feeds/:id/sync
GET        /api/cyber/threatintel/trending
GET        /api/cyber/threatintel/actors
GET        /api/cyber/threatintel/actors/:id
POST       /api/cyber/threatintel/matches
```

### Dashboard
```
GET        /api/cyber/dashboard/metrics
GET        /api/cyber/dashboard/threat-level
GET        /api/cyber/dashboard/active-incidents
GET        /api/cyber/dashboard/recent-activity
GET        /api/cyber/dashboard/mitre-heatmap
GET        /api/cyber/dashboard/trends
```

---

## 13. React Components

### Component Count by Category

| Category | Count | Key Components |
|----------|-------|----------------|
| Dashboard | 7 | ThreatLevelIndicator, SecurityMetricsGrid, ActivityFeed |
| Sandbox | 16 | JavaScriptEditor, DeobfuscationToolkit, BehaviorAnalysisPanel |
| MITRE | 10 | ATTACKNavigator, TechniqueDetail, TTPMappingAssistant |
| Incidents | 18 | IncidentDetail, PlaybookExecutor, TeamPanel |
| Log Analysis | 13 | LogAnalyzer, AIQueryInterface, CorrelationEngine |
| IOCs | 15 | IOCDatabase, IOCEnrichmentPanel, BulkIOCPaste |
| Evidence | 13 | EvidenceVault, ChainOfCustody, HashVerification |
| Timeline | 11 | TimelineBuilder, AITimelineReconstructor, TimelineEvent |
| Reports | 14 | ReportEditor, AIWritingAssistant, ExportOptions |
| Threat Intel | 12 | FeedManager, ThreatActorProfile, TrendingThreats |
| Shared | 13 | SeverityBadge, MITRETechniqueChip, ThreatScoreGauge |
| **TOTAL** | **142** | |

---

## 14. Implementation Roadmap

### Phase 1: Foundation (Weeks 1-4)
- Database schema implementation
- Core API endpoints
- Incident management CRUD
- IOC database with basic enrichment
- Dashboard with metrics

### Phase 2: Analysis Tools (Weeks 5-8)
- JavaScript sandbox with safe execution
- Deobfuscation toolkit
- HTML sandbox with phishing detection
- Log upload and parsing
- Multi-format support

### Phase 3: AI Integration (Weeks 9-12)
- AI log analysis engine
- Natural language query interface
- Cross-source correlation
- Attack narrative generation
- AI narrative summary

### Phase 4: MITRE & Timeline (Weeks 13-16)
- Full ATT&CK navigator
- Technique detail views
- AI TTP mapping
- Visual timeline builder
- AI timeline reconstruction

### Phase 5: Evidence & Reports (Weeks 17-20)
- Evidence vault with upload
- Chain of custody tracking
- All report templates
- AI report writing
- Export functionality

### Phase 6: Threat Intel & Polish (Weeks 21-24)
- Threat feed integration
- Actor tracking
- Playbook library
- Performance optimization
- Production readiness

---

## 15. Success Metrics

### Platform Adoption (12 months)
- Active Organizations: 200
- Daily Active Users: 2,000
- Incidents Created: 10,000
- IOCs Tracked: 1,000,000
- Evidence Items: 100,000
- Reports Generated: 5,000

### Analysis Efficiency
- Sandbox Analysis: < 30 seconds
- Log Analysis (1M lines): < 5 minutes
- AI Timeline Reconstruction: < 2 minutes
- IOC Enrichment: < 10 seconds
- Report Generation: < 3 minutes

### User Impact
- MTTD Reduction: 40%
- MTTR Reduction: 50%
- Report Writing Time: 70% reduction
- Analyst Productivity: 2x improvement
- User NPS: > 50

### AI Effectiveness
- TTP Mapping Accuracy: > 90%
- IOC Extraction Recall: > 95%
- Threat Detection Precision: > 85%
- Log Correlation Accuracy: > 88%
- Report Quality Score: > 4.5/5

---

## 16. Security Considerations

### Data Protection
- Evidence encrypted at rest (AES-256)
- Malware samples in isolated storage
- IOC values defanged in UI
- Chain of custody with digital signatures
- TLP classification enforcement

### Sandbox Security
- Web Worker isolation
- No actual network access (isolated mode)
- Memory and CPU limits
- Input sanitization
- Rate limiting

### Access Control
- Role-based permissions
- Incident-level restrictions
- Full audit logging
- Evidence access justification
- Sensitive IOC masking

---

## Conclusion

FooHut Cyber provides security teams with a unified, AI-native platform for threat intelligence and incident response. By combining safe analysis environments, intelligent log correlation, MITRE ATT&CK integration, and AI-assisted reporting, teams can:

1. **Respond faster** with AI analysis and playbook automation
2. **Understand deeper** with attack visualization and correlation
3. **Collaborate better** with unified incident management
4. **Document completely** with AI-assisted reporting

---

**Hunt. Analyze. Respond. Report.**

*FooHut Cyber - Security Operations, Reimagined.*

---

# APPENDIX A: Detailed UI Mockups

## A.1 Cyber Dashboard

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  FOOHUT CYBER                                              🔔  👤 Sarah Chen │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │  THREAT LEVEL                                                           ││
│  │                                                                          ││
│  │      ████████████████████████░░░░░░░░░░  ELEVATED                       ││
│  │                                                                          ││
│  │      Factors:                                                            ││
│  │      • 3 active critical incidents                                      ││
│  │      • APT29 campaign targeting your sector                             ││
│  │      • 12 new IOCs matched from threat feeds                            ││
│  │      • Unusual auth failures detected (457% above baseline)             ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
│  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────────┐ │
│  │   MTTD    │ │   MTTR    │ │ INCIDENTS │ │RESOLUTION │ │  IOCs ACTIVE  │ │
│  │   4.2h    │ │   18.6h   │ │    47     │ │   94.2%   │ │    4,567      │ │
│  │   ↓ 23%   │ │   ↓ 31%   │ │  ↑ 12%   │ │   ↑ 3.1%  │ │   ↑ 234      │ │
│  └───────────┘ └───────────┘ └───────────┘ └───────────┘ └───────────────┘ │
│                                                                              │
│  ┌─────────────────────────────────────┬───────────────────────────────────┐│
│  │  ACTIVE INCIDENTS            View All│  TOP MITRE TECHNIQUES            ││
│  ├─────────────────────────────────────┼───────────────────────────────────┤│
│  │                                      │                                   ││
│  │  🔴 INC-2026-0142  Ransomware        │  T1566.001 Phishing  ████████ 34 ││
│  │     Containment │ Sarah │ 2h 34m     │  T1059.001 PowerShell ██████ 28  ││
│  │                                      │  T1078 Valid Accounts █████ 25   ││
│  │  🟠 INC-2026-0141  Phishing          │  T1021.001 RDP        ████ 19    ││
│  │     Investigation │ Mike │ 6h 12m    │  T1486 Ransomware     ███ 17     ││
│  │                                      │  T1055 Injection      ██ 14      ││
│  │  🟡 INC-2026-0140  Suspicious PS     │                                   ││
│  │     Triage │ Unassigned │ 45m        │                                   ││
│  │                                      │                                   ││
│  └─────────────────────────────────────┴───────────────────────────────────┘│
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │  RECENT ACTIVITY                                                  Live 🔴││
│  ├─────────────────────────────────────────────────────────────────────────┤│
│  │  2 min   Sarah Chen escalated INC-2026-0142 to Critical                ││
│  │  5 min   AI Analysis completed: 2.4M logs processed                    ││
│  │  12 min  New IOC match: 185.220.101.45 (Emotet C2)                     ││
│  │  18 min  Mike Ross added 3 IOCs to INC-2026-0141                       ││
│  │  23 min  Sandbox analysis: invoice.js → MALICIOUS (98%)                ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## A.2 JavaScript Sandbox Analysis

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  JAVASCRIPT SANDBOX                                        INC-2026-0142    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────┬───────────────────────────────────┐│
│  │  CODE EDITOR                         │  ANALYSIS RESULTS                 ││
│  ├─────────────────────────────────────┼───────────────────────────────────┤│
│  │  1│ var _0x4f2a=['log','Hello'...   │                                   ││
│  │  2│ (function(_0x2d8f05,_0x4f2...   │  🔴 MALICIOUS                      ││
│  │  3│   var _0x4e6b=function(_0x...   │  Confidence: 94%                  ││
│  │  4│     while(--_0x32a5){           │                                   ││
│  │  5│       _0x2d8f05['push'](...     │  Classification: Infostealer      ││
│  │  6│     }                            │  Family: Lumma Stealer variant    ││
│  │  7│   };                             │                                   ││
│  │  8│   _0x4e6b(++_0x4f2a8c);         │  ─────────────────────────────── ││
│  │  9│ }(_0x4f2a,0x1b3));              │                                   ││
│  │ 10│ ...                              │  API CALLS INTERCEPTED:           ││
│  │                                      │                                   ││
│  │ ┌──────────┐ ┌──────────┐           │  ⚠️ eval() called 3 times         ││
│  │ │ ▶ RUN    │ │ DEOBFUSC │           │  🔴 fetch() POST to C2            ││
│  │ └──────────┘ └──────────┘           │  ⚠️ document.cookie accessed      ││
│  │                                      │  🔴 Hidden iframe created         ││
│  │ Network: [Isolated ▼]               │                                   ││
│  │ Timeout: [30s ▼]                    │  ─────────────────────────────── ││
│  │                                      │                                   ││
│  └─────────────────────────────────────┴───────────────────────────────────┘│
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │  EXTRACTED IOCs                                               [Add All] ││
│  ├─────────────────────────────────────────────────────────────────────────┤│
│  │  IP        185.220.101.45      [+]  Known C2 (Emotet)                   ││
│  │  Domain    cdn-evil.net        [+]  First seen                          ││
│  │  URL       /gate.php           [+]  C2 endpoint                         ││
│  │  Hash      a3f2c8d9e4b5...     [+]  Script SHA256                       ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │  MITRE ATT&CK MAPPING                                                   ││
│  ├─────────────────────────────────────────────────────────────────────────┤│
│  │  T1059.007  JavaScript Execution              Confidence: 98%          ││
│  │  T1185      Browser Session Hijacking         Confidence: 92%          ││
│  │  T1539      Steal Web Session Cookie          Confidence: 95%          ││
│  │  T1071.001  Web Protocols (C2)                Confidence: 88%          ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## A.3 Incident Detail View

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  INC-2026-0142: Ransomware - Finance Server Encryption                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │  ○ Detection → ● Containment → ○ Eradication → ○ Recovery → ○ Closed   ││
│  │       ✓ 2h          Active           —              —           —       ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
│  ┌──────────────────────────────┬────────────────────────────────────────┐  │
│  │  DETAILS                     │  TEAM                                  │  │
│  ├──────────────────────────────┼────────────────────────────────────────┤  │
│  │  Severity: 🔴 Critical       │  👤 Sarah Chen (Lead)                  │  │
│  │  Status: Containment         │  👤 Mike Ross (Forensics)              │  │
│  │  Created: 2026-01-01 06:45   │  👤 Alex Patel (Network)               │  │
│  │  Affected Systems: 12        │  👤 Jordan Liu (Malware)               │  │
│  │  Est. Impact: $2.5M          │                                        │  │
│  │  MTTR Estimate: 18-24h       │  [+ Add Team Member]                   │  │
│  └──────────────────────────────┴────────────────────────────────────────┘  │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │  QUICK STATS                                                            ││
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐                       ││
│  │  │  IOCs   │ │Evidence │ │  TTPs   │ │Timeline │                       ││
│  │  │   23    │ │    8    │ │   12    │ │   47    │                       ││
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘                       ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │  PLAYBOOK: Ransomware Response                    Progress: 8/24 (33%) ││
│  ├─────────────────────────────────────────────────────────────────────────┤│
│  │  ✓ Phase 1: Detection & Triage (5/5)                                   ││
│  │  ⏳ Phase 2: Containment (3/6) - Current                               ││
│  │    ✓ Isolate infected systems                                          ││
│  │    ✓ Block known C2 at perimeter                                       ││
│  │    ✓ Preserve forensic evidence                                        ││
│  │    ⏳ Disable compromised accounts  [Assigned: Sarah]                  ││
│  │    ○ Prevent lateral movement                                          ││
│  │    ○ Protect backup systems                                            ││
│  │  ○ Phase 3: Eradication (0/5)                                          ││
│  │  ○ Phase 4: Recovery (0/8)                                             ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │  ACTIVITY FEED                                                   Live 🔴││
│  ├─────────────────────────────────────────────────────────────────────────┤│
│  │  2 min    Sarah: "Confirmed 12 servers encrypted, all in Finance"      ││
│  │  8 min    Alex added 5 IOCs (C2 IPs from firewall logs)                ││
│  │  15 min   Jordan: "Sample identified as LockBit 3.0"                   ││
│  │  23 min   Mike uploaded memory dump from FIN-SRV-01                    ││
│  │  45 min   Casey: "Found initial PowerShell at 06:34:12"                ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## A.4 AI Log Analysis Results

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  AI LOG ANALYSIS - COMPLETE                                   INC-2026-0142 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────────────┐│
│  │ LOGS PARSED  │ │   THREATS    │ │ IOCs FOUND   │ │   TIMELINE EVENTS   ││
│  │  24.8M lines │ │     47       │ │     89       │ │        156          ││
│  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────────────┘│
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │  THREAT SUMMARY                                                         ││
│  ├─────────────────────────────────────────────────────────────────────────┤│
│  │  🔴 CRITICAL (3)                                                        ││
│  │  ├─ C2 Communication: 847 beacons to 185.220.101.45                    ││
│  │  ├─ Credential Dump: LSASS memory access on 5 systems                  ││
│  │  └─ Data Exfiltration: 2.3 GB to 91.234.99.15                          ││
│  │                                                                          ││
│  │  🟠 HIGH (12)                                                           ││
│  │  ├─ Lateral Movement: RDP from FIN-SRV-01 to 11 hosts                  ││
│  │  ├─ PowerShell: Encoded commands on 8 systems                          ││
│  │  └─ ... 10 more                                                [Expand] ││
│  │                                                                          ││
│  │  🟡 MEDIUM (32)                                                         ││
│  │  └─ ... 32 findings                                            [Expand] ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │  AI NARRATIVE SUMMARY                                               🤖  ││
│  ├─────────────────────────────────────────────────────────────────────────┤│
│  │                                                                          ││
│  │  The attack began at 06:34:12 when user jsmith@corp.local opened a     ││
│  │  malicious email attachment (invoice_Q4.docm) triggering a PowerShell  ││
│  │  download cradle. The initial payload established C2 communication     ││
│  │  with 185.220.101.45 (attributed to LockBit affiliate infrastructure). ││
│  │                                                                          ││
│  │  Within 45 minutes, the attacker:                                       ││
│  │  • Dumped credentials from memory using Mimikatz                       ││
│  │  • Obtained domain admin credentials (svc_backup)                      ││
│  │  • Moved laterally to 11 finance servers via RDP                       ││
│  │                                                                          ││
│  │  Data exfiltration occurred between 08:15-09:45, with 2.3 GB of        ││
│  │  financial data transferred to 91.234.99.15.                            ││
│  │                                                                          ││
│  │  Ransomware execution (LockBit 3.0) began at 09:52.                    ││
│  │                                                                          ││
│  │  Key gap: No EDR alerts for lateral movement.                          ││
│  │                                                                          ││
│  │  [Copy to Report] [Expand Analysis]                                    ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │  ASK AI ABOUT YOUR LOGS                                             🤖  ││
│  ├─────────────────────────────────────────────────────────────────────────┤│
│  │  ┌─────────────────────────────────────────────────────────────────┐   ││
│  │  │ Show me all connections over 100MB to external IPs on port 443  │   ││
│  │  └─────────────────────────────────────────────────────────────────┘   ││
│  │  [Ask]                                                                  ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## A.5 IOC Detail with Enrichment

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  IOC: 185.220.101.45                                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌───────────────────────────────┬───────────────────────────────────────┐  │
│  │  THREAT SCORE                 │  GEOLOCATION                          │  │
│  │                               │                                        │  │
│  │      ████████████░░  87/100   │  Country: Russia 🇷🇺                   │  │
│  │      HIGH THREAT              │  City: Moscow                         │  │
│  │                               │  ASN: AS12389                         │  │
│  │  First Seen: 2024-08-15       │  ISP: PJSC Rostelecom                 │  │
│  │  Last Seen: 2026-01-01        │                                        │  │
│  │  Observations: 847            │                                        │  │
│  └───────────────────────────────┴───────────────────────────────────────┘  │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │  VIRUSTOTAL                                          Last Check: 2h ago ││
│  ├─────────────────────────────────────────────────────────────────────────┤│
│  │  Detection: 45/90 engines flagged as malicious                          ││
│  │  ████████████████████████████████████░░░░░░░░░░░░░░░░░░░░  50%          ││
│  │  Categories: C2, Botnet, Malware Distribution                           ││
│  │  Associated: LockBit, Emotet, Cobalt Strike                             ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │  THREAT INTEL FEEDS                                                     ││
│  ├─────────────────────────────────────────────────────────────────────────┤│
│  │  ✓ AlienVault OTX        "LockBit 3.0 C2 Infrastructure"               ││
│  │  ✓ Abuse.ch              "Emotet tier-2 C2"                            ││
│  │  ✓ EmergingThreats       "Known malicious IP"                          ││
│  │  ✓ CrowdStrike           "CARBON SPIDER infrastructure"               ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │  PASSIVE DNS HISTORY                                                    ││
│  ├─────────────────────────────────────────────────────────────────────────┤│
│  │  2026-01-01   cdn-update.evil.com                                       ││
│  │  2025-12-15   update-service.net                                        ││
│  │  2025-11-28   secure-download.com                                       ││
│  │  2025-10-02   cdn-microsoft-update.com  (typosquat)                    ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
│  ┌───────────────────┐ ┌───────────────────┐ ┌─────────────────────────────┐│
│  │ Block Everywhere  │ │ Add to Watchlist  │ │ Export for Firewall        ││
│  └───────────────────┘ └───────────────────┘ └─────────────────────────────┘│
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## A.6 Timeline View

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  INCIDENT TIMELINE: INC-2026-0142                          [+ Add Event]    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  2026-01-01  Time →                                                         │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  06:34 ┃ 🟢 INITIAL ACCESS                                                  │
│        ┃ ┌───────────────────────────────────────────────────────────────┐  │
│        ┃ │ Phishing Email Opened                                         │  │
│        ┃ │ User jsmith@corp.local opened invoice_Q4.docm                │  │
│        ┃ │ Source: Email Gateway │ T1566.001                            │  │
│        ┃ └───────────────────────────────────────────────────────────────┘  │
│        ┃                                                                     │
│  06:34 ┃ 🔵 EXECUTION                                                       │
│        ┃ ┌───────────────────────────────────────────────────────────────┐  │
│        ┃ │ Macro Execution → PowerShell                                  │  │
│        ┃ │ WINWORD.EXE spawned PowerShell with encoded command          │  │
│        ┃ │ Source: EDR │ T1059.001, T1204.002                           │  │
│        ┃ └───────────────────────────────────────────────────────────────┘  │
│        ┃                                                                     │
│  06:35 ┃ 🟣 COMMAND & CONTROL                                               │
│        ┃ ┌───────────────────────────────────────────────────────────────┐  │
│        ┃ │ C2 Channel Established                                        │  │
│        ┃ │ HTTPS beacon to 185.220.101.45:443 (60s interval)            │  │
│        ┃ │ Source: Firewall │ T1071.001                                 │  │
│        ┃ └───────────────────────────────────────────────────────────────┘  │
│        ┃                                                                     │
│  07:15 ┃ 🟡 CREDENTIAL ACCESS                                               │
│        ┃ ┌───────────────────────────────────────────────────────────────┐  │
│        ┃ │ Credential Theft via Mimikatz                                 │  │
│        ┃ │ LSASS memory dumped, domain admin obtained                   │  │
│        ┃ │ Source: EDR │ T1003.001                                      │  │
│        ┃ └───────────────────────────────────────────────────────────────┘  │
│        ┃                                                                     │
│  07:30 ┃ 🟠 LATERAL MOVEMENT                                                │
│   ↓    ┃ ┌───────────────────────────────────────────────────────────────┐  │
│  09:00 ┃ │ RDP Lateral Movement (11 systems)                             │  │
│        ┃ │ FIN-SRV-01 through FIN-SRV-12 accessed                       │  │
│        ┃ │ Source: Windows Event │ T1021.001                            │  │
│        ┃ └───────────────────────────────────────────────────────────────┘  │
│        ┃                                                                     │
│  08:15 ┃ 🟤 EXFILTRATION                                                    │
│   ↓    ┃ ┌───────────────────────────────────────────────────────────────┐  │
│  09:45 ┃ │ Data Exfiltration (2.3 GB)                                    │  │
│        ┃ │ Financial data sent to 91.234.99.15                          │  │
│        ┃ │ Source: Firewall │ T1041                                     │  │
│        ┃ └───────────────────────────────────────────────────────────────┘  │
│        ┃                                                                     │
│  09:52 ┃ 🔴 IMPACT                                                          │
│   ↓    ┃ ┌───────────────────────────────────────────────────────────────┐  │
│  10:15 ┃ │ Ransomware Execution                                          │  │
│        ┃ │ LockBit 3.0 executed, 12 servers encrypted                   │  │
│        ┃ │ Source: EDR │ T1486, T1490                                   │  │
│        ┃ └───────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  Legend: 🟢 Init │ 🔵 Exec │ 🟡 Creds │ �� Lateral │ 🟤 Exfil │ 🔴 Impact  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## A.7 Report Editor with AI

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  REPORT: Technical Incident Report - INC-2026-0142                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────────────────┬──────────────────────────────────────────┐│
│  │  OUTLINE            Progress │  AI WRITING ASSISTANT                 🤖 ││
│  ├──────────────────────────────┼──────────────────────────────────────────┤│
│  │                              │                                          ││
│  │  ✓ 1. Executive Summary 100% │  Quick Actions:                         ││
│  │  ✓ 2. Incident Overview 100% │  ┌────────────────────────────────────┐ ││
│  │  ⏳ 3. Technical Analysis 65% │  │ Summarize Timeline                 │ ││
│  │     3.1 Attack Timeline  ✓   │  │ List All IOCs                      │ ││
│  │     3.2 Malware Analysis ✓   │  │ Describe TTPs                      │ ││
│  │     3.3 Lateral Movement ⏳  │  │ Generate Statistics                │ ││
│  │     3.4 Data Exfiltration ○  │  └────────────────────────────────────┘ ││
│  │  ○ 4. IOC Appendix       0%  │                                          ││
│  │  ○ 5. MITRE Mapping      0%  │  Write about:                           ││
│  │  ○ 6. Recommendations    0%  │  ┌────────────────────────────────────┐ ││
│  │                              │  │ Describe the lateral movement      │ ││
│  │                              │  │ phase including systems accessed   │ ││
│  │                              │  │ and methods used                   │ ││
│  │                              │  └────────────────────────────────────┘ ││
│  │                              │  [Generate]                             ││
│  │                              │                                          ││
│  └──────────────────────────────┴──────────────────────────────────────────┘│
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │  EDITOR - Section 3.3: Lateral Movement                                 ││
│  ├─────────────────────────────────────────────────────────────────────────┤│
│  │                                                                          ││
│  │  Following credential theft, the attacker leveraged the compromised    ││
│  │  domain administrator account (svc_backup) to move laterally through   ││
│  │  the finance server environment using Remote Desktop Protocol (RDP).   ││
│  │                                                                          ││
│  │  ┌─────────────────────────────────────────────────────────────────┐   ││
│  │  │  AI-GENERATED CONTENT                            [Insert] [Edit] │   ││
│  │  ├─────────────────────────────────────────────────────────────────┤   ││
│  │  │                                                                  │   ││
│  │  │  The lateral movement phase spanned approximately 90 minutes:   │   ││
│  │  │                                                                  │   ││
│  │  │  | Time  | Source     | Dest       | Account     |              │   ││
│  │  │  |-------|------------|------------|-------------|              │   ││
│  │  │  | 07:32 | FIN-WS-001 | FIN-SRV-01 | svc_backup  |              │   ││
│  │  │  | 07:41 | FIN-SRV-01 | FIN-SRV-02 | svc_backup  |              │   ││
│  │  │  | 07:48 | FIN-SRV-01 | FIN-SRV-03 | svc_backup  |              │   ││
│  │  │                                                                  │   ││
│  │  │  The attacker demonstrated prior network knowledge...           │   ││
│  │  │                                                                  │   ││
│  │  └─────────────────────────────────────────────────────────────────┘   ││
│  │                                                                          ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
│  Insert: [📊 Chart] [📅 Timeline] [💀 IOC Table] [🎯 MITRE] [📎 Evidence]  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

# APPENDIX B: Sample Detection Rules

## B.1 Sigma Rules

```yaml
# Suspicious PowerShell Download Cradle
title: PowerShell Download Cradle Detection
status: stable
logsource:
    category: process_creation
    product: windows
detection:
    selection:
        CommandLine|contains|all:
            - 'powershell'
            - 'IEX'
            - 'Net.WebClient'
    condition: selection
falsepositives:
    - Legitimate admin scripts
level: high
tags:
    - attack.execution
    - attack.t1059.001

---

# Encoded PowerShell Command
title: Encoded PowerShell Execution
status: stable
logsource:
    category: process_creation
    product: windows
detection:
    selection:
        CommandLine|contains:
            - '-enc '
            - '-EncodedCommand '
            - '-ec '
    condition: selection
level: medium
tags:
    - attack.execution
    - attack.t1059.001
    - attack.defense_evasion
    - attack.t1027
```

## B.2 YARA Rules

```yara
rule LockBit3_Ransomware {
    meta:
        description = "Detects LockBit 3.0 ransomware"
        author = "FooHut Cyber"
        date = "2026-01"
        mitre = "T1486"
    
    strings:
        $mutex = "Global\\LockBit" wide ascii
        $ransom = ".README.txt" wide ascii
        $ext = ".lockbit" wide ascii
        $key = { 52 53 41 31 } // RSA1 header
        
    condition:
        uint16(0) == 0x5A4D and
        3 of them
}

rule Mimikatz_Memory_Strings {
    meta:
        description = "Detects Mimikatz in memory"
        author = "FooHut Cyber"
        mitre = "T1003.001"
    
    strings:
        $s1 = "sekurlsa::logonpasswords" fullword
        $s2 = "sekurlsa::wdigest" fullword
        $s3 = "lsadump::sam" fullword
        $s4 = "privilege::debug" fullword
        
    condition:
        2 of them
}
```

---

# APPENDIX C: Navigation Structure

```
FooHut Cyber
├── Dashboard
│   ├── Threat Level
│   ├── Active Incidents
│   ├── Metrics
│   ├── MITRE Heatmap
│   └── Activity Feed
│
├── Incidents
│   ├── All Incidents
│   ├── Active
│   ├── My Incidents
│   └── Create New
│
├── Sandbox
│   ├── JavaScript
│   ├── HTML/Web
│   ├── File Analysis
│   └── Encoding Tools
│
├── MITRE ATT&CK
│   ├── Navigator
│   ├── Techniques
│   ├── Detection Rules
│   └── TTP Mapper
│
├── Log Analysis
│   ├── New Analysis
│   ├── Recent Analyses
│   └── Query History
│
├── IOCs
│   ├── All IOCs
│   ├── By Type
│   ├── Import
│   └── Export
│
├── Evidence
│   ├── Vault Browser
│   ├── Upload
│   └── Recent
│
├── Timeline
│   └── (Per Incident)
│
├── Reports
│   ├── All Reports
│   ├── Templates
│   └── Create New
│
├── Threat Intel
│   ├── Feeds
│   ├── Trending
│   ├── Actors
│   └── Matches
│
└── Settings
    ├── Team
    ├── Integrations
    ├── API Keys
    └── Notifications
```

---

*End of FooHut Cyber Complete Technical Specification*
