import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Button, Card } from '@/components/ui';
import { Editor } from '@/components/editor';
import { cn } from '@/lib/utils';

// Icons
const ChevronIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
);

const EditIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
  </svg>
);

const EyeIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
);

const SaveIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
  </svg>
);

const ShareIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
  </svg>
);

const SparklesIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
  </svg>
);

// Mock page data
const mockPageContent = `# Getting Started

Welcome to the foohut documentation! This guide will help you get started with our platform.

## Prerequisites

Before you begin, make sure you have:
- Node.js 18 or higher
- npm or yarn package manager
- A foohut account

## Installation

\`\`\`bash
npm install @foohut/sdk
\`\`\`

## Quick Start

1. Import the SDK
2. Initialize with your API key
3. Start building!

\`\`\`typescript
import { Foohut } from '@foohut/sdk';

const client = new Foohut({
  apiKey: process.env.FOOHUT_API_KEY
});

// Create a new page
const page = await client.pages.create({
  title: 'My First Page',
  content: '# Hello World!'
});
\`\`\`

## Next Steps

- Read the [API Reference](/api-reference)
- Check out [Examples](/examples)
- Join our [Community](/community)
`;

export function PageView() {
  const { orgSlug, collectionSlug, spaceSlug, pagePath } = useParams();
  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState(mockPageContent);
  const [hasChanges, setHasChanges] = useState(false);

  const handleContentChange = (newContent: string) => {
    setContent(newContent);
    setHasChanges(newContent !== mockPageContent);
  };

  const handleSave = () => {
    // Simulate save
    setHasChanges(false);
    setIsEditing(false);
  };

  return (
    <div className="max-w-5xl mx-auto">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <Link to="/" className="hover:text-white transition-colors">Home</Link>
        <ChevronIcon />
        <Link to={`/${orgSlug}`} className="hover:text-white transition-colors">{orgSlug}</Link>
        <ChevronIcon />
        <Link to={`/${orgSlug}/${collectionSlug}`} className="hover:text-white transition-colors">{collectionSlug}</Link>
        <ChevronIcon />
        <Link to={`/${orgSlug}/${collectionSlug}/${spaceSlug}`} className="hover:text-white transition-colors">{spaceSlug}</Link>
        <ChevronIcon />
        <span className="text-white">{pagePath || 'Page'}</span>
      </nav>

      {/* Page header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-3xl">🚀</span>
            <h1 className="text-3xl font-bold text-white">Getting Started</h1>
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <span>Last edited 2 hours ago</span>
            <span>by John Doe</span>
            <span>5 min read</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditing(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleSave}
                disabled={!hasChanges}
                className="gap-2"
              >
                <SaveIcon />
                Save
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" className="gap-2">
                <SparklesIcon />
                Ask AI
              </Button>
              <Button variant="ghost" size="sm" className="gap-2">
                <ShareIcon />
                Share
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsEditing(true)}
                className="gap-2"
              >
                <EditIcon />
                Edit
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Editor/Preview */}
      <div className="mb-8">
        {isEditing ? (
          <Editor
            content={content}
            onChange={handleContentChange}
            placeholder="Start writing..."
          />
        ) : (
          <Card padding="lg">
            <div className="prose prose-invert max-w-none">
              <div className="whitespace-pre-wrap text-gray-300 leading-relaxed">
                {content}
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Page metadata */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <h3 className="text-sm font-medium text-gray-400 mb-3">On this page</h3>
          <ul className="space-y-2">
            <li>
              <a href="#prerequisites" className="text-sm text-gray-300 hover:text-indigo-400 transition-colors">
                Prerequisites
              </a>
            </li>
            <li>
              <a href="#installation" className="text-sm text-gray-300 hover:text-indigo-400 transition-colors">
                Installation
              </a>
            </li>
            <li>
              <a href="#quick-start" className="text-sm text-gray-300 hover:text-indigo-400 transition-colors">
                Quick Start
              </a>
            </li>
            <li>
              <a href="#next-steps" className="text-sm text-gray-300 hover:text-indigo-400 transition-colors">
                Next Steps
              </a>
            </li>
          </ul>
        </Card>

        <Card>
          <h3 className="text-sm font-medium text-gray-400 mb-3">Page info</h3>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500">Created</dt>
              <dd className="text-gray-300">Dec 15, 2024</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Last modified</dt>
              <dd className="text-gray-300">Dec 31, 2024</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Word count</dt>
              <dd className="text-gray-300">156 words</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Contributors</dt>
              <dd className="text-gray-300">3 people</dd>
            </div>
          </dl>
        </Card>
      </div>
    </div>
  );
}
