"use client";

import * as React from "react";
import { useState, useRef, useEffect, useCallback } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { usePathname } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Fuse from 'fuse.js';
import { rooms, type Room } from '@/components/hospital/rooms';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isStreaming?: boolean;
  timestamp?: string;
}

interface ChatSidebarProps {
  isCollapsed: boolean;
  onClose?: () => void;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export function ChatSidebar({ isCollapsed, onClose }: ChatSidebarProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [autocompleteItems, setAutocompleteItems] = useState<Room[]>([]);
  const [selectedAutocompleteIndex, setSelectedAutocompleteIndex] = useState(0);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  useEffect(() => {
    if (!isCollapsed && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isCollapsed]);

  useEffect(() => {
    const savedSessionId = localStorage.getItem('pillpal_hospital_chat_session_id');
    if (savedSessionId) {
      setSessionId(savedSessionId);
    }
  }, []);

  // Stream text response
  const streamText = useCallback(async (text: string) => {
    setIsStreaming(true);
    const messageId = `msg-${Date.now()}`;
    
    const placeholderMsg: Message = {
      id: messageId,
      role: 'assistant',
      content: '',
      isStreaming: true,
    };
    setMessages((prev) => [...prev, placeholderMsg]);

    const words = text.split(' ');
    let currentText = '';

    for (let i = 0; i < words.length; i++) {
      currentText += (i > 0 ? ' ' : '') + words[i];

      setMessages((prev) => {
        const updated = [...prev];
        const lastIdx = updated.findIndex(m => m.id === messageId);
        if (lastIdx !== -1) {
          updated[lastIdx] = {
            ...updated[lastIdx],
            content: currentText,
            isStreaming: true,
          };
        }
        return updated;
      });

      await new Promise((resolve) => setTimeout(resolve, 20));
    }

    setMessages((prev) => {
      const updated = [...prev];
      const lastIdx = updated.findIndex(m => m.id === messageId);
      if (lastIdx !== -1) {
        updated[lastIdx] = {
          ...updated[lastIdx],
          content: text,
          isStreaming: false,
        };
      }
      return updated;
    });

    setIsStreaming(false);
  }, []);

  const handleSend = useCallback(async () => {
    const trimmedInput = inputValue.trim();
    if (!trimmedInput || isLoading || isStreaming) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: trimmedInput
    };
    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    try {
      const chatState = {
        current_page: pathname || '/dashboard/hospital',
        user_name: 'Clinical Staff',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      };

      const response = await fetch(`${API_URL}/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmedInput,
          session_id: sessionId,
          user_id: 'default_user',
          chat_state: chatState,
        }),
      });

      const data = await response.json();

      if (data.session_id && !sessionId) {
        setSessionId(data.session_id);
        localStorage.setItem('pillpal_hospital_chat_session_id', data.session_id);
      }

      setIsLoading(false);

      const responseText = data.response || 'Sorry, I encountered an error.';
      await streamText(responseText);
    } catch (error) {
      console.error('Error sending message:', error);
      setIsLoading(false);
      await streamText("Sorry, I'm having trouble connecting. Please try again.");
    }
  }, [inputValue, isLoading, isStreaming, pathname, sessionId, streamText]);

  const handleSuggestionClick = useCallback(async (prompt: string) => {
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: prompt
    };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response = await fetch(`${API_URL}/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: prompt,
          session_id: sessionId,
          user_id: 'default_user',
          chat_state: { current_page: pathname || '/dashboard/hospital' },
        }),
      });

      const data = await response.json();

      if (data.session_id && !sessionId) {
        setSessionId(data.session_id);
        localStorage.setItem('pillpal_hospital_chat_session_id', data.session_id);
      }

      setIsLoading(false);
      await streamText(data.response || 'Sorry, I encountered an error.');
    } catch (error) {
      console.error('Error:', error);
      setIsLoading(false);
      await streamText("Sorry, I'm having trouble connecting.");
    }
  }, [sessionId, pathname, streamText]);

  // Handle @ autocomplete
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);

    const lastWord = value.split(' ').pop() || '';
    if (lastWord.startsWith('@')) {
      const query = lastWord.substring(1).toLowerCase();

      if (query) {
        const fuse = new Fuse(rooms, {
          keys: ['name', 'type'],
          threshold: 0.4,
        });
        const results = fuse.search(query);
        setAutocompleteItems(results.map((r) => r.item).slice(0, 6));
      } else {
        setAutocompleteItems(rooms.slice(0, 6));
      }
      setShowAutocomplete(true);
      setSelectedAutocompleteIndex(0);
    } else {
      setShowAutocomplete(false);
    }
  }, []);

  // Select autocomplete item
  const selectAutocompleteItem = useCallback((room: Room) => {
    const words = inputValue.split(' ');
    words[words.length - 1] = `@${room.name}`;
    setInputValue(words.join(' ') + ' ');
    setShowAutocomplete(false);
  }, [inputValue]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (showAutocomplete && autocompleteItems.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedAutocompleteIndex((prev) => (prev + 1) % autocompleteItems.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedAutocompleteIndex((prev) =>
          prev === 0 ? autocompleteItems.length - 1 : prev - 1
        );
      } else if (e.key === 'Tab' || e.key === 'Enter') {
        e.preventDefault();
        selectAutocompleteItem(autocompleteItems[selectedAutocompleteIndex]);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setShowAutocomplete(false);
      }
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [showAutocomplete, autocompleteItems, selectedAutocompleteIndex, selectAutocompleteItem, handleSend]);

  return (
    <div
      className={cn(
        "h-full flex flex-col bg-white relative",
        "transition-opacity duration-200 ease-in-out",
        isCollapsed ? "opacity-0 pointer-events-none" : "opacity-100"
      )}
    >
      {/* Header */}
      <div className="h-12 px-4 flex items-center justify-between border-b shrink-0">
        <h2 className="text-sm font-medium text-foreground">AI Assistant</h2>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <EmptyState onSuggestionClick={handleSuggestionClick} />
        ) : (
          <>
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}
            {isLoading && !isStreaming && <TypingIndicator />}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Autocomplete Dropdown */}
      {showAutocomplete && autocompleteItems.length > 0 && (
        <div className="absolute bottom-[72px] left-4 right-4 bg-white border border-neutral-200 rounded-lg shadow-lg max-h-40 overflow-y-auto z-50">
          {autocompleteItems.map((room, idx) => (
            <button
              key={room.id}
              onClick={() => selectAutocompleteItem(room)}
              className={cn(
                "w-full text-left px-3 py-2 text-xs font-light transition-colors",
                idx === selectedAutocompleteIndex
                  ? "bg-primary/10 text-primary border-l-2 border-primary"
                  : "text-neutral-900 hover:bg-neutral-50"
              )}
            >
              <span className="font-medium">{room.name}</span>
              <span className="text-neutral-400 ml-2">({room.type})</span>
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="p-3 border-t shrink-0">
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={isLoading ? 'Thinking...' : isStreaming ? 'Responding...' : 'Ask about rooms, patients... (@ to tag)'}
            disabled={isLoading || isStreaming}
            className={cn(
              "w-full h-10 px-3 pr-10 text-sm",
              "bg-muted/40 border rounded-md",
              "placeholder:text-muted-foreground",
              "focus:outline-none focus:ring-1 focus:ring-primary",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          />
          <Button
            size="icon"
            className="absolute right-1.5 top-1.5 h-7 w-7"
            onClick={handleSend}
            disabled={!inputValue.trim() || isLoading || isStreaming}
          >
            <Send className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

interface EmptyStateProps {
  onSuggestionClick: (prompt: string) => void;
}

function EmptyState({ onSuggestionClick }: EmptyStateProps) {
  const suggestions = [
    'Show room occupancy',
    'List critical rooms',
    'Active hazards overview',
    'Show available rooms'
  ];

  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-4 py-8">
      <p className="text-sm text-muted-foreground mb-4 max-w-[220px]">
        Ask about rooms, patients, hazards, or hospital status.
      </p>
      <div className="space-y-2 w-full max-w-[240px]">
        {suggestions.map((text) => (
          <button
            key={text}
            onClick={() => onSuggestionClick(text)}
            className="w-full px-3 py-2 text-xs text-left text-muted-foreground bg-muted/40 hover:bg-muted rounded-md transition-colors"
          >
            {text}
          </button>
        ))}
      </div>
      <p className="text-xs text-muted-foreground mt-4 pt-3 border-t border-neutral-100 w-full">
        Type <code className="bg-neutral-100 px-1 py-0.5 rounded text-primary text-[11px]">@</code> to reference rooms
      </p>
    </div>
  );
}

interface MessageBubbleProps {
  message: Message;
}

function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";

  return (
    <div className={cn("flex gap-2", isUser ? "flex-row-reverse" : "flex-row")}>
      <div className={cn(
        "max-w-[85%] px-3 py-2 rounded-lg text-sm leading-relaxed",
        isUser ? "bg-primary text-primary-foreground" : "bg-muted/60 text-foreground"
      )}>
        {isUser ? (
          message.content
        ) : (
          <div className="prose prose-sm max-w-none">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
                strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                ul: ({ children }) => <ul className="my-2 space-y-1 list-disc pl-4">{children}</ul>,
                ol: ({ children }) => <ol className="my-2 space-y-1 list-decimal pl-4">{children}</ol>,
                li: ({ children }) => <li className="leading-relaxed text-sm">{children}</li>,
                code: ({ children }) => (
                  <code className="bg-neutral-200 text-neutral-900 px-1.5 py-0.5 rounded text-xs font-mono">
                    {children}
                  </code>
                ),
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>
        )}
        {message.isStreaming && (
          <span className="inline-block w-1.5 h-3.5 bg-primary ml-0.5 animate-pulse" />
        )}
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex gap-2">
      <div className="flex items-center gap-1 px-3 py-2 bg-muted/60 rounded-lg">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-pulse"
            style={{ animationDelay: `${i * 150}ms`, animationDuration: "1.4s" }}
          />
        ))}
      </div>
    </div>
  );
}
