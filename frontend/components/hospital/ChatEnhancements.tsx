"use client";

import { useState } from 'react';
import { motion } from 'framer-motion';

// Copy button for code blocks
interface CopyButtonProps {
  text: string;
}

export function CopyButton({ text }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity px-2 py-1 text-xs bg-neutral-700 text-white rounded hover:bg-neutral-600"
    >
      {copied ? 'Copied!' : 'Copy'}
    </button>
  );
}

// Tool use indicator (shows when AI is fetching data)
interface ToolUseIndicatorProps {
  toolCount: number;
}

export function ToolUseIndicator({ toolCount }: ToolUseIndicatorProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-700"
    >
      <div className="flex items-center gap-1.5">
        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
        <span>
          Fetching data ({toolCount} {toolCount === 1 ? 'query' : 'queries'})
        </span>
      </div>
    </motion.div>
  );
}

// Follow-up questions component
interface FollowUpQuestionsProps {
  questions: string[];
  onSelect: (question: string) => void;
}

export function FollowUpQuestions({ questions, onSelect }: FollowUpQuestionsProps) {
  if (questions.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="flex flex-wrap gap-2 mt-3"
    >
      {questions.map((question, idx) => (
        <motion.button
          key={idx}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 * idx }}
          onClick={() => onSelect(question)}
          className="px-3 py-1.5 text-xs font-light text-neutral-700 bg-neutral-100 hover:bg-neutral-200 border border-neutral-200 rounded-full transition-colors"
        >
          {question}
        </motion.button>
      ))}
    </motion.div>
  );
}

// Export button for chat history
interface ExportButtonProps {
  messages: Array<{ role: string; content: string }>;
  sessionTitle?: string | null;
}

export function ExportButton({ messages, sessionTitle }: ExportButtonProps) {
  const handleExport = () => {
    const title = sessionTitle || 'Chat Export';
    const timestamp = new Date().toISOString().split('T')[0];
    
    let content = `# ${title}\n`;
    content += `Exported: ${new Date().toLocaleString()}\n\n`;
    content += '---\n\n';
    
    messages.forEach((msg) => {
      const role = msg.role === 'user' ? 'You' : 'PillPal AI';
      content += `**${role}:**\n${msg.content}\n\n`;
    });
    
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.replace(/[^a-z0-9]/gi, '_')}_${timestamp}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <button
      onClick={handleExport}
      className="text-neutral-400 hover:text-neutral-700 transition-colors"
      title="Export chat"
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
        />
      </svg>
    </button>
  );
}

// Message typing indicator
export function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-3 py-2">
      <span className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
      <span className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
      <span className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
    </div>
  );
}

// Quick suggestion buttons
interface QuickSuggestionsProps {
  suggestions: string[];
  onSelect: (suggestion: string) => void;
}

export function QuickSuggestions({ suggestions, onSelect }: QuickSuggestionsProps) {
  return (
    <div className="space-y-1.5">
      {suggestions.map((suggestion, idx) => (
        <motion.button
          key={idx}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: 0.1 * idx }}
          onClick={() => onSelect(suggestion)}
          className="w-full text-left px-3 py-2 text-sm font-light text-neutral-700 bg-white hover:bg-neutral-50 border border-neutral-200 rounded-lg transition-colors"
        >
          {suggestion}
        </motion.button>
      ))}
    </div>
  );
}

// Session item for dropdown
interface SessionItemProps {
  session: {
    id: string;
    title: string;
    updated_at: string;
  };
  isActive: boolean;
  onClick: () => void;
}

export function SessionItem({ session, isActive, onClick }: SessionItemProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-2.5 border-b border-neutral-100 last:border-b-0 hover:bg-neutral-50 transition-colors ${
        isActive ? 'bg-emerald-50 border-l-2 border-l-emerald-600' : ''
      }`}
    >
      <p className="text-sm font-light text-neutral-900 mb-1 truncate">
        {session.title}
      </p>
      <p className="text-[10px] font-light text-neutral-400">
        {new Date(session.updated_at).toLocaleDateString()} •{' '}
        {new Date(session.updated_at).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        })}
      </p>
    </button>
  );
}
