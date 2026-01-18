"use client";

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePathname } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Fuse from 'fuse.js';
import {
  ToolUseIndicator,
  FollowUpQuestions,
  ExportButton,
  CopyButton,
  QuickSuggestions,
  TypingIndicator,
} from './ChatEnhancements';
import { rooms, type Room } from './rooms';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  isStreaming?: boolean;
  toolCalls?: number;
  timestamp?: string;
}

interface ChatSession {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

interface AIChatProps {
  onCacheInvalidate?: (keys: string[]) => void;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function AIChat({ onCacheInvalidate }: AIChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionTitle, setSessionTitle] = useState<string | null>(null);
  const [streamingText, setStreamingText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [showSessions, setShowSessions] = useState(false);
  const [showToolIndicator, setShowToolIndicator] = useState(false);
  const [toolCallCount, setToolCallCount] = useState(0);
  const [followUpQuestions, setFollowUpQuestions] = useState<string[]>([]);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [autocompleteItems, setAutocompleteItems] = useState<Room[]>([]);
  const [selectedAutocompleteIndex, setSelectedAutocompleteIndex] = useState(0);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'h') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowSessions(false);
      }
    };

    if (showSessions) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSessions]);

  // Auto-scroll messages
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingText, scrollToBottom]);

  // Fetch sessions
  const fetchSessions = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/ai/sessions?user_id=default_user`);
      const data = await response.json();
      setSessions(data.sessions || []);
    } catch (error) {
      console.error('Error fetching sessions:', error);
    }
  }, []);

  useEffect(() => {
    const savedSessionId = localStorage.getItem('pillpal_chat_session_id');
    if (savedSessionId) {
      setSessionId(savedSessionId);
    }
    fetchSessions();
  }, [fetchSessions]);

  // Get smart suggestions based on current page
  const getSmartSuggestions = useCallback(() => {
    if (pathname?.includes('hospital') || pathname?.includes('floorplan')) {
      return [
        'Show room occupancy',
        'List available rooms',
        'Show critical rooms',
        'Active hazards',
      ];
    }
    return ['Room status', 'Active alerts', 'Hospital statistics'];
  }, [pathname]);

  // Generate follow-up questions
  const generateFollowUpQuestions = useCallback(
    (userQuery: string, response: string) => {
      const questions: string[] = [];
      const queryLower = userQuery.toLowerCase();
      const responseLower = response.toLowerCase();

      if (responseLower.includes('success') || responseLower.includes('✅')) {
        if (responseLower.includes('transferred') || responseLower.includes('moved')) {
          questions.push('Show room status');
        }
        if (responseLower.includes('assigned')) {
          questions.push('Show available rooms');
        }
        return questions.slice(0, 2);
      }

      if (queryLower.includes('room') && !queryLower.includes('all')) {
        questions.push('Show all rooms');
      }
      if (queryLower.includes('patient') && !queryLower.includes('all')) {
        questions.push('List all patients');
      }
      if (queryLower.includes('hazard')) {
        questions.push('Show hazards by type');
      }
      if (queryLower.includes('alert')) {
        questions.push('Critical alerts only');
      }

      return questions.slice(0, 2);
    },
    []
  );

  // Stream text response
  const streamText = useCallback(async (text: string) => {
    setIsStreaming(true);
    setStreamingText('');

    const placeholderMsg: Message = {
      role: 'assistant',
      content: '',
      isStreaming: true,
    };
    setMessages((prev) => [...prev, placeholderMsg]);

    const words = text.split(' ');
    let currentText = '';

    for (let i = 0; i < words.length; i++) {
      currentText += (i > 0 ? ' ' : '') + words[i];
      setStreamingText(currentText);

      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: 'assistant',
          content: currentText,
          isStreaming: true,
        };
        return updated;
      });

      await new Promise((resolve) => setTimeout(resolve, 20));
    }

    setMessages((prev) => {
      const updated = [...prev];
      updated[updated.length - 1] = {
        role: 'assistant',
        content: text,
        isStreaming: false,
      };
      return updated;
    });

    setIsStreaming(false);
    setStreamingText('');
  }, []);

  // Send message
  const handleSendMessage = useCallback(async () => {
    if (input.trim() === '' || isLoading || isStreaming) return;

    const userMessage: Message = { role: 'user', content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setFollowUpQuestions([]);

    try {
      const chatState = {
        current_page: pathname || '/',
        user_name: 'Clinical Staff',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      };

      const response = await fetch(`${API_URL}/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: input,
          session_id: sessionId,
          user_id: 'default_user',
          chat_state: chatState,
        }),
      });

      const data = await response.json();

      if (data.session_id && !sessionId) {
        setSessionId(data.session_id);
        localStorage.setItem('pillpal_chat_session_id', data.session_id);
      }
      if (data.session_title) {
        setSessionTitle(data.session_title);
      }

      // Show tool indicator
      if (data.tool_calls && data.tool_calls > 0) {
        setShowToolIndicator(true);
        setToolCallCount(data.tool_calls);
        await new Promise((resolve) => setTimeout(resolve, 1000));
        setShowToolIndicator(false);
      }

      setIsLoading(false);

      const responseText = data.response || 'Sorry, I encountered an error.';
      await streamText(responseText);

      // Invalidate cache if needed
      if (data.invalidate_cache && onCacheInvalidate) {
        onCacheInvalidate(data.cache_keys || ['rooms', 'patients']);
      }

      // Generate follow-ups
      const followUps = generateFollowUpQuestions(userMessage.content, responseText);
      setFollowUpQuestions(followUps);

      fetchSessions();
    } catch (error) {
      console.error('Error sending message:', error);
      setIsLoading(false);
      await streamText("Sorry, I'm having trouble connecting. Please try again.");
    }
  }, [
    input,
    isLoading,
    isStreaming,
    pathname,
    sessionId,
    streamText,
    onCacheInvalidate,
    generateFollowUpQuestions,
    fetchSessions,
  ]);

  // Handle suggestion click
  const handleSuggestionClick = useCallback(
    async (prompt: string) => {
      setInput('');
      const userMessage: Message = { role: 'user', content: prompt };
      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);
      setFollowUpQuestions([]);

      try {
        const response = await fetch(`${API_URL}/ai/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: prompt,
            session_id: sessionId,
            user_id: 'default_user',
            chat_state: { current_page: pathname || '/' },
          }),
        });

        const data = await response.json();

        if (data.session_id && !sessionId) {
          setSessionId(data.session_id);
          localStorage.setItem('pillpal_chat_session_id', data.session_id);
        }
        if (data.session_title) {
          setSessionTitle(data.session_title);
        }

        if (data.tool_calls && data.tool_calls > 0) {
          setShowToolIndicator(true);
          setToolCallCount(data.tool_calls);
          await new Promise((resolve) => setTimeout(resolve, 1000));
          setShowToolIndicator(false);
        }

        setIsLoading(false);
        await streamText(data.response || 'Sorry, I encountered an error.');

        if (data.invalidate_cache && onCacheInvalidate) {
          onCacheInvalidate(data.cache_keys || ['rooms', 'patients']);
        }

        const followUps = generateFollowUpQuestions(prompt, data.response);
        setFollowUpQuestions(followUps);

        fetchSessions();
      } catch (error) {
        console.error('Error:', error);
        setIsLoading(false);
        await streamText("Sorry, I'm having trouble connecting.");
      }
    },
    [
      sessionId,
      pathname,
      streamText,
      onCacheInvalidate,
      generateFollowUpQuestions,
      fetchSessions,
    ]
  );

  // Start new session
  const startNewSession = useCallback(() => {
    setMessages([]);
    setSessionId(null);
    setSessionTitle(null);
    setStreamingText('');
    setIsStreaming(false);
    setFollowUpQuestions([]);
    localStorage.removeItem('pillpal_chat_session_id');
    setShowSessions(false);
  }, []);

  // Load session
  const loadSession = useCallback(
    async (session: ChatSession) => {
      try {
        setIsLoading(true);
        setSessionId(session.id);
        setSessionTitle(session.title);
        localStorage.setItem('pillpal_chat_session_id', session.id);
        setShowSessions(false);

        const response = await fetch(`${API_URL}/ai/sessions/${session.id}`);
        const data = await response.json();

        if (data.messages) {
          const loadedMessages: Message[] = data.messages.map(
            (msg: { role: string; content: string }) => ({
              role: msg.role,
              content: msg.content,
              isStreaming: false,
            })
          );
          setMessages(loadedMessages);
        }
      } catch (error) {
        console.error('Error loading session:', error);
        setMessages([]);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // Handle @ autocomplete
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setInput(value);

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
    },
    []
  );

  // Select autocomplete item
  const selectAutocompleteItem = useCallback(
    (room: Room) => {
      const words = input.split(' ');
      words[words.length - 1] = `@${room.name}`;
      setInput(words.join(' ') + ' ');
      setShowAutocomplete(false);
    },
    [input]
  );

  // Handle key down
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (showAutocomplete && autocompleteItems.length > 0) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setSelectedAutocompleteIndex((prev) =>
            (prev + 1) % autocompleteItems.length
          );
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
        handleSendMessage();
      }
    },
    [
      showAutocomplete,
      autocompleteItems,
      selectedAutocompleteIndex,
      selectAutocompleteItem,
      handleSendMessage,
    ]
  );

  return (
    <>
      <AnimatePresence>
        {isOpen ? (
          <motion.div
            initial={{ scale: 0.95, opacity: 0, originX: 1, originY: 1 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="fixed bottom-6 right-6 z-50 bg-white border border-neutral-200 shadow-2xl flex flex-col"
            style={{
              width: '450px',
              height: '600px',
              borderRadius: '12px',
              transformOrigin: 'bottom right',
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <div className="relative flex-1">
                  <button
                    onClick={() => setShowSessions(!showSessions)}
                    className="flex items-center gap-2 hover:bg-neutral-50 transition-colors px-2 py-1 rounded max-w-full"
                  >
                    <p className="text-sm font-light text-neutral-900 truncate">
                      {sessionTitle && messages.length > 0
                        ? sessionTitle
                        : 'New Chat'}
                    </p>
                    <svg
                      className="w-4 h-4 text-neutral-400 flex-shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M19.5 8.25l-7.5 7.5-7.5-7.5"
                      />
                    </svg>
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {messages.length > 0 && (
                  <ExportButton messages={messages} sessionTitle={sessionTitle} />
                )}
                {!isLoading && !isStreaming && (
                  <button
                    onClick={startNewSession}
                    className="text-neutral-400 hover:text-neutral-900 transition-colors"
                    title="New chat"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 4.5v15m7.5-7.5h-15"
                      />
                    </svg>
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-neutral-400 hover:text-neutral-900 transition-colors"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>

            {/* Sessions Dropdown */}
            {showSessions && (
              <motion.div
                ref={dropdownRef}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
                className="absolute top-14 left-4 right-4 bg-white border border-neutral-200 shadow-xl rounded-lg overflow-hidden z-50 max-h-80"
              >
                <div className="p-3 border-b border-neutral-200 bg-neutral-50">
                  <p className="text-[10px] font-medium text-neutral-600 uppercase tracking-wider">
                    Recent Conversations
                  </p>
                </div>
                <div className="overflow-y-auto max-h-64">
                  {sessions.length === 0 ? (
                    <div className="p-4 text-center">
                      <p className="text-xs font-light text-neutral-400">
                        No previous conversations
                      </p>
                    </div>
                  ) : (
                    sessions.map((session) => (
                      <button
                        key={session.id}
                        onClick={() => loadSession(session)}
                        className={`w-full text-left px-4 py-2.5 border-b border-neutral-100 last:border-b-0 hover:bg-neutral-50 transition-colors ${
                          sessionId === session.id
                            ? 'bg-slate-50 border-l-2 border-l-slate-900'
                            : ''
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
                    ))
                  )}
                </div>
              </motion.div>
            )}

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.1 }}
                >
                  <p className="text-sm font-light text-neutral-600 mb-4">
                    Ask about rooms, patients, hazards, or hospital status.
                  </p>
                  <QuickSuggestions
                    suggestions={getSmartSuggestions()}
                    onSelect={handleSuggestionClick}
                  />
                  <p className="text-xs text-neutral-400 mt-4 pt-3 border-t border-neutral-100">
                    Type{' '}
                    <code className="bg-neutral-100 px-1 py-0.5 rounded text-blue-700 text-[11px]">
                      @
                    </code>{' '}
                    to reference rooms
                  </p>
                </motion.div>
              ) : (
                <>
                  {messages.map((msg, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, ease: 'easeOut' }}
                      className={`flex ${
                        msg.role === 'user' ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      <div
                        className={`max-w-[80%] px-4 py-3 text-sm font-light leading-relaxed ${
                          msg.role === 'user'
                            ? 'bg-slate-900 text-white'
                            : 'bg-neutral-100 text-neutral-900'
                        }`}
                        style={{
                          borderRadius:
                            msg.role === 'user'
                              ? '12px 12px 2px 12px'
                              : '12px 12px 12px 2px',
                          wordBreak: 'break-word',
                        }}
                      >
                        <div className="prose prose-sm max-w-none">
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                              p: ({ children }) => (
                                <p className="mb-2 last:mb-0 leading-relaxed">
                                  {children}
                                </p>
                              ),
                              strong: ({ children }) => (
                                <strong className="font-semibold">
                                  {children}
                                </strong>
                              ),
                              ul: ({ children }) => (
                                <ul className="my-2 space-y-1 list-disc pl-4">
                                  {children}
                                </ul>
                              ),
                              ol: ({ children }) => (
                                <ol className="my-2 space-y-1 list-decimal pl-4">
                                  {children}
                                </ol>
                              ),
                              li: ({ children }) => (
                                <li className="leading-relaxed text-sm">
                                  {children}
                                </li>
                              ),
                              code: ({ children }) => (
                                <code className="bg-neutral-200 text-neutral-900 px-1.5 py-0.5 rounded text-xs font-mono">
                                  {children}
                                </code>
                              ),
                              pre: ({ children }) => (
                                <div className="relative group my-2">
                                  <pre className="bg-neutral-200 p-3 rounded text-xs font-mono overflow-x-auto">
                                    {children}
                                  </pre>
                                  <CopyButton text={String(children)} />
                                </div>
                              ),
                            }}
                          >
                            {msg.content}
                          </ReactMarkdown>
                        </div>
                        {msg.isStreaming && (
                          <span className="inline-block w-1.5 h-3.5 bg-blue-600 ml-0.5 animate-pulse" />
                        )}
                      </div>
                    </motion.div>
                  ))}

                  {showToolIndicator && (
                    <ToolUseIndicator toolCount={toolCallCount} />
                  )}

                  {isLoading && !isStreaming && !showToolIndicator && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex justify-start"
                    >
                      <div
                        className="bg-neutral-100 px-4 py-3 text-sm"
                        style={{ borderRadius: '12px 12px 12px 2px' }}
                      >
                        <TypingIndicator />
                      </div>
                    </motion.div>
                  )}

                  {!isLoading &&
                    !isStreaming &&
                    messages.length > 0 &&
                    followUpQuestions.length > 0 && (
                      <FollowUpQuestions
                        questions={followUpQuestions}
                        onSelect={(q) => {
                          setFollowUpQuestions([]);
                          handleSuggestionClick(q);
                        }}
                      />
                    )}

                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Input Area */}
            <div className="border-t border-neutral-200 p-4">
              {showAutocomplete && autocompleteItems.length > 0 && (
                <div className="mb-2 bg-white border border-neutral-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                  {autocompleteItems.map((room, idx) => (
                    <button
                      key={room.id}
                      onClick={() => selectAutocompleteItem(room)}
                      className={`w-full text-left px-3 py-2 text-xs font-light transition-colors ${
                        idx === selectedAutocompleteIndex
                          ? 'bg-slate-100 text-slate-900 border-l-2 border-slate-900'
                          : 'text-neutral-900 hover:bg-neutral-50'
                      }`}
                    >
                      <span className="font-medium">{room.name}</span>
                      <span className="text-neutral-400 ml-2">
                        ({room.type})
                      </span>
                    </button>
                  ))}
                </div>
              )}

              <div className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  placeholder={
                    isLoading
                      ? 'Thinking...'
                      : isStreaming
                      ? 'Responding...'
                      : 'Ask me anything... (@ to tag rooms)'
                  }
                  disabled={isLoading || isStreaming}
                  className="flex-1 px-3 py-2 text-sm font-light text-neutral-900 placeholder:text-neutral-500 border border-neutral-200 rounded-lg focus:outline-none focus:border-blue-600 transition-colors disabled:opacity-50 disabled:bg-neutral-50"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={isLoading || isStreaming || input.trim() === ''}
                  className="px-4 py-2 bg-slate-900 text-white text-sm font-light rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M13 5l7 7-7 7M5 5l7 7-7 7"
                    />
                  </svg>
                </button>
              </div>
            </div>

            {/* Footer */}
            <div
              className="px-4 py-2 border-t border-neutral-200 bg-neutral-50"
              style={{ borderRadius: '0 0 12px 12px' }}
            >
              <div className="flex items-center justify-between text-xs font-light text-neutral-500">
                <span className="uppercase tracking-wider flex items-center gap-2">
                  {pathname?.includes('hospital') ? (
                    <>
                      <span>🏥</span>
                      <span>Hospital View</span>
                    </>
                  ) : (
                    <>
                      <span>💊</span>
                      <span>PillPal</span>
                    </>
                  )}
                </span>
                <span className="font-mono text-[10px]">
                  {currentTime.toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            </div>
          </motion.div>
        ) : (
          <div className="fixed bottom-6 right-6 z-50 group">
            <motion.button
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              onClick={() => setIsOpen(true)}
              className="w-14 h-14 bg-slate-900 hover:bg-slate-800 text-white shadow-lg hover:shadow-xl transition-all flex items-center justify-center rounded-full"
              title="PillPal AI Assistant"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </motion.button>

            <div className="absolute bottom-full right-0 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
              <div className="bg-neutral-900 text-white text-xs font-light px-3 py-1.5 rounded whitespace-nowrap">
                PillPal AI (Cmd+Shift+H)
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
