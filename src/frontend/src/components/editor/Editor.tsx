import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

/**
 * TipTap Block Editor - Placeholder Component
 *
 * This component will be replaced with a full TipTap implementation.
 * The TipTap integration will include:
 * - @tiptap/react for React bindings
 * - @tiptap/starter-kit for basic functionality
 * - Custom extensions for:
 *   - Code blocks with syntax highlighting
 *   - Callouts (info, warning, danger, success)
 *   - Tables
 *   - Task lists
 *   - Images with captions
 *   - Embeds
 *   - AI prompt blocks
 */

interface EditorProps {
  content?: string;
  onChange?: (content: string) => void;
  placeholder?: string;
  readOnly?: boolean;
  className?: string;
}

export function Editor({
  content = '',
  onChange,
  placeholder = 'Start writing...',
  readOnly = false,
  className,
}: EditorProps) {
  const [localContent, setLocalContent] = useState(content);

  useEffect(() => {
    setLocalContent(content);
  }, [content]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setLocalContent(newContent);
    onChange?.(newContent);
  };

  return (
    <div
      className={cn(
        'min-h-[400px] bg-gray-800 rounded-xl border border-gray-700',
        'focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-transparent',
        'transition-all duration-200',
        className
      )}
    >
      {/* Toolbar placeholder */}
      <div className="flex items-center gap-1 p-2 border-b border-gray-700">
        <ToolbarButton>B</ToolbarButton>
        <ToolbarButton>I</ToolbarButton>
        <ToolbarButton>U</ToolbarButton>
        <div className="w-px h-5 bg-gray-700 mx-1" />
        <ToolbarButton>H1</ToolbarButton>
        <ToolbarButton>H2</ToolbarButton>
        <ToolbarButton>H3</ToolbarButton>
        <div className="w-px h-5 bg-gray-700 mx-1" />
        <ToolbarButton>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
          </svg>
        </ToolbarButton>
        <ToolbarButton>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h8m-8 6h16" />
          </svg>
        </ToolbarButton>
        <div className="flex-1" />
        <div className="text-xs text-gray-500 px-2">
          TipTap Editor (Placeholder)
        </div>
      </div>

      {/* Editor area */}
      <div className="p-4">
        <textarea
          value={localContent}
          onChange={handleChange}
          placeholder={placeholder}
          readOnly={readOnly}
          className={cn(
            'w-full min-h-[350px] bg-transparent text-gray-100 resize-none outline-none',
            'placeholder-gray-500 font-sans leading-relaxed',
            readOnly && 'cursor-not-allowed opacity-75'
          )}
        />
      </div>

      {/* Status bar */}
      <div className="flex items-center justify-between px-4 py-2 border-t border-gray-700 text-xs text-gray-500">
        <span>
          {localContent.length} characters | {localContent.split(/\s+/).filter(Boolean).length} words
        </span>
        <span>Markdown supported</span>
      </div>
    </div>
  );
}

// Toolbar button component
function ToolbarButton({ children }: { children: React.ReactNode }) {
  return (
    <button
      type="button"
      className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
    >
      {children}
    </button>
  );
}
