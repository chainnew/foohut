import React, { useState } from 'react';
import { Search, Plus, GitBranch, MessageSquare, Sparkles, ChevronRight, ChevronDown, FileText, Folder, Settings, Users, Bell, Moon, Sun, Play, Copy, Check, Zap, Brain, RefreshCw, Globe, Lock, Eye, Edit3, GitPullRequest, Clock, CheckCircle, AlertTriangle, Code, Book, Layers, Database, Terminal, Send, X, Menu, Home, BarChart3, Shield, Cpu } from 'lucide-react';

export default function FoohutMockup() {
  const [darkMode, setDarkMode] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [aiPanelOpen, setAiPanelOpen] = useState(true);
  const [activeTab, setActiveTab] = useState('editor');
  const [expandedFolders, setExpandedFolders] = useState(['getting-started', 'api-reference']);
  const [selectedPage, setSelectedPage] = useState('authentication');
  const [aiQuery, setAiQuery] = useState('');
  const [showCommandPalette, setShowCommandPalette] = useState(false);

  const theme = darkMode ? {
    bg: 'bg-slate-950',
    bgSecondary: 'bg-slate-900',
    bgTertiary: 'bg-slate-800',
    bgHover: 'hover:bg-slate-800',
    border: 'border-slate-700',
    text: 'text-slate-100',
    textSecondary: 'text-slate-400',
    textMuted: 'text-slate-500',
    accent: 'bg-violet-600',
    accentHover: 'hover:bg-violet-500',
    accentText: 'text-violet-400',
    success: 'text-emerald-400',
    warning: 'text-amber-400',
    error: 'text-red-400',
  } : {
    bg: 'bg-white',
    bgSecondary: 'bg-slate-50',
    bgTertiary: 'bg-slate-100',
    bgHover: 'hover:bg-slate-100',
    border: 'border-slate-200',
    text: 'text-slate-900',
    textSecondary: 'text-slate-600',
    textMuted: 'text-slate-400',
    accent: 'bg-violet-600',
    accentHover: 'hover:bg-violet-500',
    accentText: 'text-violet-600',
    success: 'text-emerald-600',
    warning: 'text-amber-600',
    error: 'text-red-600',
  };

  const navigation = [
    { id: 'getting-started', label: 'Getting Started', icon: Book, children: [
      { id: 'introduction', label: 'Introduction' },
      { id: 'quickstart', label: 'Quickstart' },
      { id: 'authentication', label: 'Authentication' },
    ]},
    { id: 'api-reference', label: 'API Reference', icon: Code, children: [
      { id: 'endpoints', label: 'Endpoints' },
      { id: 'webhooks', label: 'Webhooks' },
      { id: 'rate-limits', label: 'Rate Limits' },
    ]},
    { id: 'guides', label: 'Guides', icon: Layers, children: [
      { id: 'git-sync', label: 'Git Sync Setup' },
      { id: 'ai-features', label: 'AI Features' },
    ]},
  ];

  const toggleFolder = (id) => {
    setExpandedFolders(prev => 
      prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
    );
  };

  const recentChanges = [
    { id: 1, title: 'Update auth flow', author: 'matto', status: 'merged', time: '2h ago' },
    { id: 2, title: 'Add webhook docs', author: 'AI Agent', status: 'review', time: '4h ago' },
    { id: 3, title: 'Fix typos in quickstart', author: 'matto', status: 'draft', time: '1d ago' },
  ];

  const aiSuggestions = [
    { type: 'stale', message: 'Authentication section may be outdated - API v2.1 released', severity: 'warning' },
    { type: 'broken', message: '2 broken links detected in Webhooks', severity: 'error' },
    { type: 'improvement', message: 'Add code examples for Python SDK', severity: 'info' },
  ];

  return (
    <div className={`h-screen flex flex-col ${theme.bg} ${theme.text} font-sans`}>
      {/* Top Navigation Bar */}
      <header className={`h-14 ${theme.bgSecondary} border-b ${theme.border} flex items-center justify-between px-4 shrink-0`}>
        <div className="flex items-center gap-4">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className={`p-2 rounded-lg ${theme.bgHover}`}>
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 ${theme.accent} rounded-lg flex items-center justify-center`}>
              <Zap size={18} className="text-white" />
            </div>
            <span className="font-bold text-lg">foohut</span>
            <span className={`text-xs ${theme.textMuted} px-2 py-0.5 ${theme.bgTertiary} rounded`}>BETA</span>
          </div>
          <div className={`flex items-center gap-1 px-3 py-1 ${theme.bgTertiary} rounded-lg text-sm`}>
            <Folder size={14} className={theme.textSecondary} />
            <span className={theme.textSecondary}>Acme Corp</span>
            <ChevronRight size={14} className={theme.textMuted} />
            <span>API Documentation</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Search */}
          <button 
            onClick={() => setShowCommandPalette(true)}
            className={`flex items-center gap-2 px-3 py-1.5 ${theme.bgTertiary} rounded-lg text-sm ${theme.textSecondary} ${theme.bgHover} min-w-64`}
          >
            <Search size={16} />
            <span>Search docs...</span>
            <kbd className={`ml-auto px-1.5 py-0.5 text-xs ${theme.bgSecondary} rounded border ${theme.border}`}>⌘K</kbd>
          </button>
          
          {/* Git Status */}
          <div className={`flex items-center gap-2 px-3 py-1.5 ${theme.bgTertiary} rounded-lg text-sm`}>
            <GitBranch size={16} className={theme.success} />
            <span>main</span>
            <span className={`${theme.success} text-xs`}>synced</span>
          </div>
          
          {/* Actions */}
          <button className={`p-2 rounded-lg ${theme.bgHover}`}>
            <Bell size={18} />
          </button>
          <button onClick={() => setDarkMode(!darkMode)} className={`p-2 rounded-lg ${theme.bgHover}`}>
            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <div className={`w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-white text-sm font-medium`}>
            M
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        {sidebarOpen && (
          <aside className={`w-64 ${theme.bgSecondary} border-r ${theme.border} flex flex-col shrink-0`}>
            {/* Variant Selector */}
            <div className={`p-3 border-b ${theme.border}`}>
              <select className={`w-full px-3 py-2 ${theme.bgTertiary} rounded-lg text-sm ${theme.text} border ${theme.border}`}>
                <option>v2.0 (Current)</option>
                <option>v1.5 (Legacy)</option>
                <option>v3.0 (Beta)</option>
              </select>
            </div>

            {/* Navigation Tree */}
            <nav className="flex-1 overflow-y-auto p-2">
              {navigation.map(section => (
                <div key={section.id} className="mb-1">
                  <button
                    onClick={() => toggleFolder(section.id)}
                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm ${theme.bgHover} ${theme.textSecondary}`}
                  >
                    {expandedFolders.includes(section.id) ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    <section.icon size={16} />
                    <span>{section.label}</span>
                  </button>
                  {expandedFolders.includes(section.id) && (
                    <div className="ml-6 mt-1 space-y-0.5">
                      {section.children.map(child => (
                        <button
                          key={child.id}
                          onClick={() => setSelectedPage(child.id)}
                          className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm ${
                            selectedPage === child.id 
                              ? `${theme.accent} text-white` 
                              : `${theme.bgHover} ${theme.textSecondary}`
                          }`}
                        >
                          <FileText size={14} />
                          <span>{child.label}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </nav>

            {/* AI Health Panel */}
            <div className={`p-3 border-t ${theme.border}`}>
              <div className="flex items-center justify-between mb-2">
                <span className={`text-xs font-medium ${theme.textSecondary}`}>AI INSIGHTS</span>
                <Brain size={14} className={theme.accentText} />
              </div>
              <div className="space-y-2">
                {aiSuggestions.map((suggestion, i) => (
                  <div key={i} className={`flex items-start gap-2 p-2 ${theme.bgTertiary} rounded-lg text-xs`}>
                    {suggestion.severity === 'warning' && <AlertTriangle size={14} className={theme.warning} />}
                    {suggestion.severity === 'error' && <AlertTriangle size={14} className={theme.error} />}
                    {suggestion.severity === 'info' && <Sparkles size={14} className={theme.accentText} />}
                    <span className={theme.textSecondary}>{suggestion.message}</span>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        )}

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Editor Toolbar */}
          <div className={`h-12 ${theme.bgSecondary} border-b ${theme.border} flex items-center justify-between px-4 shrink-0`}>
            <div className="flex items-center gap-2">
              <div className="flex items-center">
                {['editor', 'preview', 'diff'].map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-3 py-1.5 text-sm capitalize ${
                      activeTab === tab 
                        ? `${theme.accentText} border-b-2 border-violet-500` 
                        : theme.textSecondary
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
              <span className={`mx-2 text-sm ${theme.textMuted}`}>|</span>
              <span className={`text-sm ${theme.textSecondary}`}>Authentication</span>
              <span className={`px-2 py-0.5 text-xs ${theme.bgTertiary} rounded ${theme.textMuted}`}>Draft</span>
            </div>
            <div className="flex items-center gap-2">
              <button className={`flex items-center gap-1 px-3 py-1.5 text-sm ${theme.bgTertiary} rounded-lg ${theme.bgHover}`}>
                <GitPullRequest size={16} />
                <span>Create CR</span>
              </button>
              <button className={`flex items-center gap-1 px-3 py-1.5 text-sm ${theme.accent} ${theme.accentHover} rounded-lg text-white`}>
                <Globe size={16} />
                <span>Publish</span>
              </button>
            </div>
          </div>

          <div className="flex-1 flex overflow-hidden">
            {/* Editor Content */}
            <div className="flex-1 overflow-y-auto p-8">
              <article className="max-w-3xl mx-auto">
                {/* Page Title */}
                <div className="mb-8">
                  <h1 className="text-3xl font-bold mb-2">Authentication</h1>
                  <p className={`${theme.textSecondary}`}>
                    Learn how to authenticate your API requests using JWT tokens and API keys.
                  </p>
                  <div className={`flex items-center gap-4 mt-4 text-sm ${theme.textMuted}`}>
                    <span className="flex items-center gap-1">
                      <Clock size={14} />
                      Updated 2 days ago
                    </span>
                    <span className="flex items-center gap-1">
                      <Eye size={14} />
                      1.2k views
                    </span>
                    <span className="flex items-center gap-1">
                      <Edit3 size={14} />
                      Last edited by matto
                    </span>
                  </div>
                </div>

                {/* Content Blocks */}
                <div className="space-y-6">
                  {/* Hint Block */}
                  <div className={`p-4 rounded-lg border-l-4 border-violet-500 ${theme.bgTertiary}`}>
                    <div className="flex items-start gap-3">
                      <Sparkles size={20} className={theme.accentText} />
                      <div>
                        <p className="font-medium mb-1">AI-Powered Security</p>
                        <p className={`text-sm ${theme.textSecondary}`}>
                          foohut automatically scans your API documentation for security best practices and suggests improvements.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Text Block */}
                  <div className={`p-4 rounded-lg border ${theme.border} ${theme.bgHover} cursor-text group`}>
                    <p>
                      All API requests must include a valid authentication token in the request headers. 
                      foohut supports two authentication methods: <strong>JWT tokens</strong> for user-based 
                      authentication and <strong>API keys</strong> for server-to-server communication.
                    </p>
                    <div className={`opacity-0 group-hover:opacity-100 flex items-center gap-1 mt-2 transition-opacity`}>
                      <button className={`p-1 rounded ${theme.bgTertiary}`}><Plus size={14} /></button>
                      <button className={`p-1 rounded ${theme.bgTertiary}`}><Sparkles size={14} /></button>
                      <button className={`p-1 rounded ${theme.bgTertiary}`}><MessageSquare size={14} /></button>
                    </div>
                  </div>

                  {/* Heading */}
                  <h2 className="text-xl font-semibold mt-8">API Key Authentication</h2>

                  {/* Code Block with Tabs */}
                  <div className={`rounded-lg border ${theme.border} overflow-hidden`}>
                    <div className={`flex items-center justify-between px-4 py-2 ${theme.bgTertiary} border-b ${theme.border}`}>
                      <div className="flex items-center gap-1">
                        {['cURL', 'Python', 'Node.js', 'Go'].map((lang, i) => (
                          <button 
                            key={lang}
                            className={`px-3 py-1 text-sm rounded ${i === 0 ? theme.accent + ' text-white' : theme.bgHover}`}
                          >
                            {lang}
                          </button>
                        ))}
                      </div>
                      <button className={`flex items-center gap-1 px-2 py-1 text-sm ${theme.bgHover} rounded`}>
                        <Copy size={14} />
                        <span>Copy</span>
                      </button>
                    </div>
                    <pre className={`p-4 ${theme.bg} text-sm overflow-x-auto`}>
                      <code className="text-emerald-400">
{`curl -X GET "https://api.foohut.com/v1/docs" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json"`}
                      </code>
                    </pre>
                  </div>

                  {/* API Endpoint Block */}
                  <div className={`rounded-lg border ${theme.border} overflow-hidden`}>
                    <div className={`flex items-center gap-3 px-4 py-3 ${theme.bgTertiary} border-b ${theme.border}`}>
                      <span className="px-2 py-0.5 text-xs font-mono bg-emerald-500/20 text-emerald-400 rounded">GET</span>
                      <code className="text-sm">/v1/auth/token</code>
                      <span className={`ml-auto text-sm ${theme.textMuted}`}>Generate access token</span>
                    </div>
                    <div className="p-4">
                      <div className="flex items-center gap-2 mb-4">
                        <button className={`flex items-center gap-2 px-4 py-2 ${theme.accent} ${theme.accentHover} rounded-lg text-white text-sm`}>
                          <Play size={16} />
                          <span>Try It</span>
                        </button>
                        <span className={`text-sm ${theme.textMuted}`}>Test this endpoint in your browser</span>
                      </div>
                      <div className={`p-3 ${theme.bgTertiary} rounded-lg`}>
                        <p className={`text-xs font-medium ${theme.textMuted} mb-2`}>RESPONSE</p>
                        <pre className="text-sm text-emerald-400">
{`{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "expires_in": 3600,
  "token_type": "Bearer"
}`}
                        </pre>
                      </div>
                    </div>
                  </div>

                  {/* Table Block */}
                  <h3 className="text-lg font-semibold mt-6">Authentication Headers</h3>
                  <div className={`rounded-lg border ${theme.border} overflow-hidden`}>
                    <table className="w-full text-sm">
                      <thead className={theme.bgTertiary}>
                        <tr>
                          <th className={`px-4 py-3 text-left font-medium ${theme.textSecondary}`}>Header</th>
                          <th className={`px-4 py-3 text-left font-medium ${theme.textSecondary}`}>Required</th>
                          <th className={`px-4 py-3 text-left font-medium ${theme.textSecondary}`}>Description</th>
                        </tr>
                      </thead>
                      <tbody className={`divide-y ${theme.border}`}>
                        <tr className={theme.bgHover}>
                          <td className="px-4 py-3 font-mono text-violet-400">Authorization</td>
                          <td className="px-4 py-3"><span className={theme.success}>Yes</span></td>
                          <td className={`px-4 py-3 ${theme.textSecondary}`}>Bearer token for authentication</td>
                        </tr>
                        <tr className={theme.bgHover}>
                          <td className="px-4 py-3 font-mono text-violet-400">X-Api-Key</td>
                          <td className="px-4 py-3"><span className={theme.textMuted}>Optional</span></td>
                          <td className={`px-4 py-3 ${theme.textSecondary}`}>API key for server-to-server auth</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </article>
            </div>

            {/* AI Assistant Panel */}
            {aiPanelOpen && (
              <aside className={`w-80 ${theme.bgSecondary} border-l ${theme.border} flex flex-col shrink-0`}>
                <div className={`p-4 border-b ${theme.border} flex items-center justify-between`}>
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center`}>
                      <Brain size={18} className="text-white" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">AI Assistant</p>
                      <p className={`text-xs ${theme.textMuted}`}>Powered by Claude</p>
                    </div>
                  </div>
                  <button onClick={() => setAiPanelOpen(false)} className={`p-1 rounded ${theme.bgHover}`}>
                    <X size={16} />
                  </button>
                </div>

                {/* AI Chat */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {/* AI Message */}
                  <div className={`p-3 ${theme.bgTertiary} rounded-lg`}>
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles size={14} className={theme.accentText} />
                      <span className={`text-xs font-medium ${theme.accentText}`}>AI Assistant</span>
                    </div>
                    <p className="text-sm">
                      I've analyzed this page and found a few suggestions:
                    </p>
                    <ul className={`mt-2 space-y-1 text-sm ${theme.textSecondary}`}>
                      <li className="flex items-start gap-2">
                        <CheckCircle size={14} className={`${theme.success} mt-0.5`} />
                        <span>Add rate limiting info to auth section</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <AlertTriangle size={14} className={`${theme.warning} mt-0.5`} />
                        <span>Token expiry doesn't match API spec</span>
                      </li>
                    </ul>
                    <button className={`mt-3 flex items-center gap-1 text-xs ${theme.accentText}`}>
                      <Sparkles size={12} />
                      Apply AI suggestions
                    </button>
                  </div>

                  {/* User Message */}
                  <div className={`p-3 ${theme.accent} rounded-lg text-white ml-4`}>
                    <p className="text-sm">Can you add a Python example for OAuth2 flow?</p>
                  </div>

                  {/* AI Response */}
                  <div className={`p-3 ${theme.bgTertiary} rounded-lg`}>
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles size={14} className={theme.accentText} />
                      <span className={`text-xs font-medium ${theme.accentText}`}>AI Assistant</span>
                    </div>
                    <p className="text-sm mb-3">
                      I've drafted a Python OAuth2 example. Here's a preview:
                    </p>
                    <pre className={`p-2 ${theme.bg} rounded text-xs overflow-x-auto text-emerald-400`}>
{`import requests

def get_oauth_token():
    response = requests.post(
        "https://api.foohut.com/oauth/token",
        data={"grant_type": "client_credentials"}
    )
    return response.json()`}
                    </pre>
                    <div className="flex gap-2 mt-3">
                      <button className={`flex-1 py-1.5 text-xs ${theme.accent} ${theme.accentHover} rounded text-white`}>
                        Insert
                      </button>
                      <button className={`flex-1 py-1.5 text-xs ${theme.bgTertiary} ${theme.bgHover} rounded`}>
                        Regenerate
                      </button>
                    </div>
                  </div>
                </div>

                {/* AI Input */}
                <div className={`p-4 border-t ${theme.border}`}>
                  <div className={`flex items-center gap-2 p-2 ${theme.bgTertiary} rounded-lg border ${theme.border}`}>
                    <input
                      type="text"
                      value={aiQuery}
                      onChange={(e) => setAiQuery(e.target.value)}
                      placeholder="Ask AI anything..."
                      className={`flex-1 bg-transparent text-sm outline-none ${theme.text}`}
                    />
                    <button className={`p-1.5 ${theme.accent} rounded-lg`}>
                      <Send size={16} className="text-white" />
                    </button>
                  </div>
                  <div className={`flex items-center gap-2 mt-2 text-xs ${theme.textMuted}`}>
                    <kbd className={`px-1.5 py-0.5 ${theme.bgTertiary} rounded`}>⌘I</kbd>
                    <span>Quick AI</span>
                  </div>
                </div>
              </aside>
            )}
          </div>
        </main>

        {/* Right Panel - Change Requests */}
        <aside className={`w-72 ${theme.bgSecondary} border-l ${theme.border} flex flex-col shrink-0`}>
          <div className={`p-4 border-b ${theme.border}`}>
            <h3 className="font-medium flex items-center gap-2">
              <GitPullRequest size={18} />
              Change Requests
            </h3>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {recentChanges.map(cr => (
              <div key={cr.id} className={`p-3 rounded-lg ${theme.bgHover} mb-2 cursor-pointer`}>
                <div className="flex items-start justify-between">
                  <p className="text-sm font-medium">{cr.title}</p>
                  <span className={`px-2 py-0.5 text-xs rounded ${
                    cr.status === 'merged' ? 'bg-emerald-500/20 text-emerald-400' :
                    cr.status === 'review' ? 'bg-amber-500/20 text-amber-400' :
                    `${theme.bgTertiary} ${theme.textMuted}`
                  }`}>
                    {cr.status}
                  </span>
                </div>
                <div className={`flex items-center gap-2 mt-2 text-xs ${theme.textMuted}`}>
                  <span>{cr.author}</span>
                  <span>•</span>
                  <span>{cr.time}</span>
                </div>
              </div>
            ))}
          </div>
          
          {/* Git Sync Status */}
          <div className={`p-4 border-t ${theme.border}`}>
            <div className="flex items-center justify-between mb-3">
              <span className={`text-xs font-medium ${theme.textSecondary}`}>GIT SYNC</span>
              <RefreshCw size={14} className={theme.success} />
            </div>
            <div className={`p-3 ${theme.bgTertiary} rounded-lg`}>
              <div className="flex items-center gap-2 mb-2">
                <GitBranch size={14} className={theme.success} />
                <span className="text-sm">main</span>
                <Check size={14} className={theme.success} />
              </div>
              <p className={`text-xs ${theme.textMuted}`}>
                Last sync: 2 minutes ago
              </p>
              <p className={`text-xs ${theme.textMuted}`}>
                github.com/acme/docs
              </p>
            </div>
          </div>
        </aside>
      </div>

      {/* Command Palette Modal */}
      {showCommandPalette && (
        <div className="fixed inset-0 bg-black/50 flex items-start justify-center pt-32 z-50" onClick={() => setShowCommandPalette(false)}>
          <div className={`w-full max-w-xl ${theme.bgSecondary} rounded-xl shadow-2xl border ${theme.border}`} onClick={e => e.stopPropagation()}>
            <div className={`p-4 border-b ${theme.border}`}>
              <div className="flex items-center gap-3">
                <Search size={20} className={theme.textMuted} />
                <input
                  type="text"
                  placeholder="Search docs or ask AI..."
                  className={`flex-1 bg-transparent text-lg outline-none ${theme.text}`}
                  autoFocus
                />
                <kbd className={`px-2 py-1 text-xs ${theme.bgTertiary} rounded`}>ESC</kbd>
              </div>
            </div>
            <div className="p-2 max-h-96 overflow-y-auto">
              <p className={`px-3 py-2 text-xs font-medium ${theme.textMuted}`}>QUICK ACTIONS</p>
              {[
                { icon: Sparkles, label: 'Ask AI Assistant', shortcut: '⌘I' },
                { icon: Plus, label: 'Create new page', shortcut: '⌘N' },
                { icon: GitPullRequest, label: 'Open Change Request', shortcut: '⌘R' },
                { icon: Settings, label: 'Space settings', shortcut: '⌘,' },
              ].map((action, i) => (
                <button key={i} className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg ${theme.bgHover}`}>
                  <action.icon size={18} className={theme.textSecondary} />
                  <span>{action.label}</span>
                  <kbd className={`ml-auto px-2 py-0.5 text-xs ${theme.bgTertiary} rounded`}>{action.shortcut}</kbd>
                </button>
              ))}
              <p className={`px-3 py-2 text-xs font-medium ${theme.textMuted} mt-2`}>RECENT PAGES</p>
              {['Authentication', 'Quickstart Guide', 'Webhooks'].map((page, i) => (
                <button key={i} className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg ${theme.bgHover}`}>
                  <FileText size={18} className={theme.textSecondary} />
                  <span>{page}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* AI Toggle FAB */}
      {!aiPanelOpen && (
        <button 
          onClick={() => setAiPanelOpen(true)}
          className={`fixed bottom-6 right-6 w-14 h-14 ${theme.accent} rounded-full shadow-lg flex items-center justify-center ${theme.accentHover} z-40`}
        >
          <Brain size={24} className="text-white" />
        </button>
      )}
    </div>
  );
}
