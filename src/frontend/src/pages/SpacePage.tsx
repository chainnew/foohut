import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card, Button, Input } from '@/components/ui';
import { cn } from '@/lib/utils';

// Icons
const ChevronIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
);

const SearchIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const PlusIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);

// Mock page tree data
interface PageNode {
  id: string;
  title: string;
  emoji: string;
  slug: string;
  children?: PageNode[];
}

const mockPages: PageNode[] = [
  {
    id: '1',
    title: 'Getting Started',
    emoji: '🚀',
    slug: 'getting-started',
    children: [
      { id: '1-1', title: 'Introduction', emoji: '👋', slug: 'introduction' },
      { id: '1-2', title: 'Quick Start', emoji: '⚡', slug: 'quick-start' },
      { id: '1-3', title: 'Installation', emoji: '📦', slug: 'installation' },
    ],
  },
  {
    id: '2',
    title: 'API Reference',
    emoji: '📡',
    slug: 'api-reference',
    children: [
      { id: '2-1', title: 'Authentication', emoji: '🔐', slug: 'authentication' },
      { id: '2-2', title: 'Endpoints', emoji: '🔗', slug: 'endpoints' },
      { id: '2-3', title: 'Errors', emoji: '⚠️', slug: 'errors' },
    ],
  },
  {
    id: '3',
    title: 'Guides',
    emoji: '📖',
    slug: 'guides',
    children: [
      { id: '3-1', title: 'Best Practices', emoji: '✅', slug: 'best-practices' },
      { id: '3-2', title: 'Troubleshooting', emoji: '🔧', slug: 'troubleshooting' },
    ],
  },
  { id: '4', title: 'Changelog', emoji: '📝', slug: 'changelog' },
];

export function SpacePage() {
  const { orgSlug, collectionSlug, spaceSlug } = useParams();
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(['1', '2']));
  const [searchQuery, setSearchQuery] = useState('');

  const toggleNode = (nodeId: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  };

  const renderPageTree = (nodes: PageNode[], depth = 0) => {
    return nodes.map((node) => {
      const hasChildren = node.children && node.children.length > 0;
      const isExpanded = expandedNodes.has(node.id);

      return (
        <div key={node.id}>
          <div
            className={cn(
              'flex items-center gap-2 py-1.5 px-2 rounded-lg',
              'hover:bg-gray-800 transition-colors group cursor-pointer',
              depth > 0 && 'ml-4'
            )}
          >
            {hasChildren ? (
              <button
                onClick={() => toggleNode(node.id)}
                className="p-0.5 text-gray-500 hover:text-white transition-colors"
              >
                <ChevronIcon
                  className={cn('transition-transform', isExpanded && 'rotate-90')}
                />
              </button>
            ) : (
              <span className="w-5" />
            )}
            <span className="text-base">{node.emoji}</span>
            <Link
              to={`/${orgSlug}/${collectionSlug}/${spaceSlug}/${node.slug}`}
              className="flex-1 text-sm text-gray-300 hover:text-white truncate"
            >
              {node.title}
            </Link>
            <button className="opacity-0 group-hover:opacity-100 p-1 text-gray-500 hover:text-white transition-all">
              <PlusIcon />
            </button>
          </div>
          {hasChildren && isExpanded && renderPageTree(node.children!, depth + 1)}
        </div>
      );
    });
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <Link to="/" className="hover:text-white transition-colors">Home</Link>
        <ChevronIcon />
        <Link to={`/${orgSlug}`} className="hover:text-white transition-colors">{orgSlug}</Link>
        <ChevronIcon />
        <Link to={`/${orgSlug}/${collectionSlug}`} className="hover:text-white transition-colors">{collectionSlug}</Link>
        <ChevronIcon />
        <span className="text-white">{spaceSlug || 'Space'}</span>
      </nav>

      <div className="grid lg:grid-cols-4 gap-6">
        {/* Page tree sidebar */}
        <div className="lg:col-span-1">
          <Card padding="sm">
            <div className="flex items-center gap-2 mb-4">
              <Input
                placeholder="Search pages..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                leftIcon={<SearchIcon />}
                className="text-sm"
              />
            </div>

            <div className="space-y-1">
              {renderPageTree(mockPages)}
            </div>

            <div className="mt-4 pt-4 border-t border-gray-700">
              <Button variant="ghost" size="sm" className="w-full justify-start gap-2">
                <PlusIcon />
                Add new page
              </Button>
            </div>
          </Card>
        </div>

        {/* Main content area */}
        <div className="lg:col-span-3">
          <Card>
            <div className="text-center py-12">
              <span className="text-4xl mb-4 block">📚</span>
              <h2 className="text-xl font-semibold text-white mb-2">
                {spaceSlug || 'Documentation Space'}
              </h2>
              <p className="text-gray-400 mb-6">
                Select a page from the sidebar to view its content, or create a new page.
              </p>
              <div className="flex items-center justify-center gap-4">
                <Button variant="primary">Create Page</Button>
                <Button variant="secondary">Import from Markdown</Button>
              </div>
            </div>
          </Card>

          {/* Space info */}
          <div className="grid md:grid-cols-3 gap-4 mt-6">
            <Card>
              <p className="text-sm text-gray-400">Total Pages</p>
              <p className="text-2xl font-bold text-white mt-1">24</p>
            </Card>
            <Card>
              <p className="text-sm text-gray-400">Contributors</p>
              <p className="text-2xl font-bold text-white mt-1">5</p>
            </Card>
            <Card>
              <p className="text-sm text-gray-400">Last Updated</p>
              <p className="text-2xl font-bold text-white mt-1">2h ago</p>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
