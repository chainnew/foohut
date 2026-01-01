import { Link } from 'react-router-dom';
import { Card, CardHeader, CardContent, Button } from '@/components/ui';
import { cn } from '@/lib/utils';

// Icons
const FolderIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
  </svg>
);

const DocIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

const ClockIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const ArrowRightIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
);

// Mock data for demonstration
const recentSpaces = [
  { id: '1', name: 'API Documentation', slug: 'api-docs', icon: '📚', lastUpdated: '2h ago', pageCount: 24 },
  { id: '2', name: 'User Guide', slug: 'user-guide', icon: '📖', lastUpdated: '5h ago', pageCount: 18 },
  { id: '3', name: 'Developer Handbook', slug: 'dev-handbook', icon: '💻', lastUpdated: '1d ago', pageCount: 42 },
];

const recentPages = [
  { id: '1', title: 'Getting Started', path: '/api-docs/getting-started', emoji: '🚀', updatedAt: '10 min ago' },
  { id: '2', title: 'Authentication', path: '/api-docs/auth', emoji: '🔐', updatedAt: '1h ago' },
  { id: '3', title: 'REST API Reference', path: '/api-docs/rest-api', emoji: '📡', updatedAt: '2h ago' },
  { id: '4', title: 'Webhooks', path: '/api-docs/webhooks', emoji: '🪝', updatedAt: '3h ago' },
];

const quickActions = [
  { label: 'New Page', description: 'Create a blank page', icon: '📄', action: 'create-page' },
  { label: 'Import', description: 'Import from Markdown', icon: '📥', action: 'import' },
  { label: 'AI Assistant', description: 'Generate content', icon: '✨', action: 'ai-assistant' },
  { label: 'Templates', description: 'Start from template', icon: '📋', action: 'templates' },
];

export function Dashboard() {
  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Welcome section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Welcome back</h1>
          <p className="text-gray-400 mt-1">Here's what's happening in your documentation</p>
        </div>
        <Button variant="primary" className="gap-2">
          <span>Create Space</span>
          <ArrowRightIcon />
        </Button>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {quickActions.map((action) => (
          <button
            key={action.action}
            className={cn(
              'p-4 bg-gray-800 border border-gray-700 rounded-xl',
              'hover:border-indigo-500 hover:bg-gray-750 transition-all duration-200',
              'text-left group'
            )}
          >
            <span className="text-2xl">{action.icon}</span>
            <h3 className="text-white font-medium mt-2 group-hover:text-indigo-400 transition-colors">
              {action.label}
            </h3>
            <p className="text-sm text-gray-500 mt-0.5">{action.description}</p>
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent spaces */}
        <div className="lg:col-span-2">
          <Card padding="none">
            <CardHeader
              title="Recent Spaces"
              description="Your most recently accessed documentation spaces"
              action={
                <Link to="/spaces" className="text-sm text-indigo-400 hover:text-indigo-300">
                  View all
                </Link>
              }
              className="px-6 pt-6"
            />
            <CardContent className="p-0">
              <div className="divide-y divide-gray-700">
                {recentSpaces.map((space) => (
                  <Link
                    key={space.id}
                    to={`/org/${space.slug}`}
                    className="flex items-center gap-4 px-6 py-4 hover:bg-gray-750 transition-colors group"
                  >
                    <span className="text-2xl">{space.icon}</span>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-white font-medium truncate group-hover:text-indigo-400 transition-colors">
                        {space.name}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {space.pageCount} pages
                      </p>
                    </div>
                    <div className="flex items-center gap-1 text-sm text-gray-500">
                      <ClockIcon />
                      <span>{space.lastUpdated}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent pages */}
        <div>
          <Card padding="none">
            <CardHeader
              title="Recent Pages"
              description="Your recently edited pages"
              className="px-6 pt-6"
            />
            <CardContent className="p-0">
              <div className="divide-y divide-gray-700">
                {recentPages.map((page) => (
                  <Link
                    key={page.id}
                    to={page.path}
                    className="flex items-center gap-3 px-6 py-3 hover:bg-gray-750 transition-colors group"
                  >
                    <span className="text-lg">{page.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm text-white truncate group-hover:text-indigo-400 transition-colors">
                        {page.title}
                      </h4>
                      <p className="text-xs text-gray-500">{page.updatedAt}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Pages" value="84" change="+12%" positive />
        <StatCard label="Total Views" value="2.4k" change="+8%" positive />
        <StatCard label="Team Members" value="8" change="+2" positive />
        <StatCard label="AI Queries" value="156" change="+34%" positive />
      </div>
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: string;
  change: string;
  positive?: boolean;
}

function StatCard({ label, value, change, positive }: StatCardProps) {
  return (
    <Card>
      <p className="text-sm text-gray-400">{label}</p>
      <div className="flex items-baseline gap-2 mt-1">
        <span className="text-2xl font-bold text-white">{value}</span>
        <span className={cn('text-sm', positive ? 'text-green-400' : 'text-red-400')}>
          {change}
        </span>
      </div>
    </Card>
  );
}
