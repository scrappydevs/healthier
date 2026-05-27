"use client";

import * as React from "react";
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { usePathname } from "next/navigation";
import { Send, X, Plus, ChevronDown, Wrench, Copy, Download } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Fuse from "fuse.js";
import { Button } from "@/components/ui/button";
import { useChatStore } from "@/stores/chatStore";
import { cn } from "@/lib/cn";
import { rooms, type Room } from "@/components/hospital/rooms";

interface ChatSidebarProps {
  isCollapsed: boolean;
  onClose?: () => void;
  onCacheInvalidate?: (keys: string[]) => void;
}

interface ChatSession {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export function ChatSidebar({ isCollapsed, onClose, onCacheInvalidate }: ChatSidebarProps) {
  const pathname = usePathname();
  const [inputValue, setInputValue] = useState("");
  const [showSessions, setShowSessions] = useState(false);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [autocompleteItems, setAutocompleteItems] = useState<Room[]>([]);
  const [selectedAutocompleteIndex, setSelectedAutocompleteIndex] = useState(0);
  const [followUpQuestions, setFollowUpQuestions] = useState<string[]>([]);
  const [displayedTitle, setDisplayedTitle] = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const titleAnimationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const {
    messages,
    isStreaming,
    isLoading,
    sessionId,
    sessionTitle,
    sessions,
    isTitleAnimating,
    showToolIndicator,
    toolCallCount,
    currentPage,
    shouldFocusInput,
    acknowledgeFocus,
    addMessage,
    updateLastMessage,
    setIsStreaming,
    setIsLoading,
    setSessionId,
    setSessionTitle,
    setSessions,
    startNewSession,
    setCurrentPage,
    setShowToolIndicator,
    setToolCallCount,
    setIsTitleAnimating,
  } = useChatStore();

  useEffect(() => {
    if (pathname) {
      setCurrentPage(pathname);
    }
  }, [pathname, setCurrentPage]);

  // Animate title typing effect
  useEffect(() => {
    if (!sessionTitle || !isTitleAnimating) {
      setDisplayedTitle(sessionTitle || "");
      return;
    }

    // Clear any existing animation
    if (titleAnimationTimeoutRef.current) {
      clearTimeout(titleAnimationTimeoutRef.current);
    }

    let currentIndex = 0;
    setDisplayedTitle("");

    const animate = () => {
      if (currentIndex < sessionTitle.length) {
        setDisplayedTitle(sessionTitle.substring(0, currentIndex + 1));
        currentIndex++;
        titleAnimationTimeoutRef.current = setTimeout(animate, 30);
      } else {
        setIsTitleAnimating(false);
      }
    };

    animate();

    return () => {
      if (titleAnimationTimeoutRef.current) {
        clearTimeout(titleAnimationTimeoutRef.current);
      }
    };
  }, [sessionTitle, isTitleAnimating, setIsTitleAnimating]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Focus input when chat opens
  useEffect(() => {
    if (!isCollapsed && inputRef.current && shouldFocusInput) {
      inputRef.current.focus();
      acknowledgeFocus();
    }
  }, [isCollapsed, shouldFocusInput, acknowledgeFocus]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowSessions(false);
      }
    };

    if (showSessions) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showSessions]);

  const fetchSessions = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/ai/sessions?user_id=default_user`);
      const data = await response.json();
      setSessions(data.sessions || []);
    } catch (error) {
      console.error("Error fetching sessions:", error);
    }
  }, [setSessions]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const smartSuggestions = useMemo(() => {
    if (pathname?.includes("hospital")) {
      return [
        "Show room occupancy",
        "List available rooms",
        "Show critical rooms",
        "Active hazards",
      ];
    }
    if (pathname?.includes("patients")) {
      return [
        "Who missed medications today?",
        "Show patients with low adherence",
        "List critical patients",
      ];
    }
    if (pathname?.includes("alerts")) {
      return [
        "Show critical alerts",
        "Unacknowledged alerts",
        "Alert summary",
      ];
    }
    if (pathname?.includes("analytics")) {
      return [
        "Adherence trends",
        "Patient statistics",
        "Medication breakdown",
      ];
    }
    if (pathname === "/dashboard" || pathname?.endsWith("/dashboard")) {
      return [
        "Show patients with low adherence",
        "Who missed medications today?",
        "Patient summary",
        "Recent activity",
      ];
    }
    return [
      "Show room status",
      "Active alerts",
      "Hospital statistics",
      "Patient summary",
    ];
  }, [pathname]);

  const generateFollowUpQuestions = useCallback((userQuery: string, response: string) => {
    const questions: string[] = [];
    const queryLower = userQuery.toLowerCase();
    const responseLower = response.toLowerCase();

    if (responseLower.includes("success") || responseLower.includes("✅")) {
      if (responseLower.includes("transferred") || responseLower.includes("moved")) {
        questions.push("Show room status");
      }
      if (responseLower.includes("assigned")) {
        questions.push("Show available rooms");
      }
      return questions.slice(0, 2);
    }

    if (queryLower.includes("room") && !queryLower.includes("all")) {
      questions.push("Show all rooms");
    }
    if (queryLower.includes("patient") && !queryLower.includes("all")) {
      questions.push("List all patients");
    }
    if (queryLower.includes("hazard")) {
      questions.push("Show hazards by type");
    }
    if (queryLower.includes("alert")) {
      questions.push("Critical alerts only");
    }

    return questions.slice(0, 2);
  }, []);

  // Stream text response word by word
  const streamText = useCallback(async (text: string, toolCalls?: number) => {
    setIsStreaming(true);
    addMessage({ role: "assistant", content: "", isStreaming: true, toolCalls });

    const words = text.split(" ");
    let currentText = "";

    for (let i = 0; i < words.length; i++) {
      currentText += (i > 0 ? " " : "") + words[i];
      updateLastMessage(currentText, true);
      await new Promise((resolve) => setTimeout(resolve, 20));
    }

    updateLastMessage(text, false);
    setIsStreaming(false);
  }, [addMessage, updateLastMessage, setIsStreaming]);

  const handleSend = useCallback(async () => {
    const trimmedInput = inputValue.trim();
    if (!trimmedInput || isLoading || isStreaming) return;

    // (sessionId may be persisted across reloads while messages/title are not).
    const shouldGenerateTitle =
      messages.length === 0 && (!sessionTitle || sessionTitle === "New Chat" || sessionTitle === "Chat");

    let generatedTitle: string | null = null;
    if (shouldGenerateTitle) {
      try {
        const titleResponse = await fetch(`${API_URL}/ai/generate-title`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: trimmedInput }),
        });
        const titleData = await titleResponse.json();
        if (titleData.title) {
          generatedTitle = titleData.title;
          setIsTitleAnimating(true);
          setSessionTitle(titleData.title);
        }
      } catch (error) {
        console.error("Error generating title:", error);
      }
    }

    addMessage({ role: "user", content: trimmedInput });
    setInputValue("");
    setIsLoading(true);
    setFollowUpQuestions([]);

    try {
      const chatState = {
        current_page: pathname || "/",
        user_name: "Clinical Staff",
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        ...(generatedTitle ? { title: generatedTitle } : {}),
      };

      const response = await fetch(`${API_URL}/ai/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: trimmedInput,
          session_id: sessionId,
          user_id: "default_user",
          chat_state: chatState,
        }),
      });

      const data = await response.json();

      if (data.session_id && !sessionId) {
        setSessionId(data.session_id);
      }
      if (data.session_title && data.session_title !== sessionTitle) {
        if (!generatedTitle) {
          setIsTitleAnimating(true);
          setSessionTitle(data.session_title);
        }
      }

      if (data.tool_calls && data.tool_calls > 0) {
        setShowToolIndicator(true);
        setToolCallCount(data.tool_calls);
        await new Promise((resolve) => setTimeout(resolve, 1200));
        setShowToolIndicator(false);
      }

      setIsLoading(false);

      const responseText = data.response || "Sorry, I encountered an error.";
      await streamText(responseText, data.tool_calls);

      // Invalidate cache if needed
      if (data.invalidate_cache && onCacheInvalidate) {
        onCacheInvalidate(data.cache_keys || ["rooms", "patients"]);
      }

      const followUps = generateFollowUpQuestions(trimmedInput, responseText);
      setFollowUpQuestions(followUps);

      fetchSessions();
    } catch (error) {
      console.error("Error sending message:", error);
      setIsLoading(false);
      await streamText("Sorry, I'm having trouble connecting. Please check the backend is running.");
    }
  }, [
    inputValue,
    isLoading,
    isStreaming,
    pathname,
    sessionId,
    sessionTitle,
    messages.length,
    addMessage,
    setIsLoading,
    setSessionId,
    setSessionTitle,
    setIsTitleAnimating,
    setShowToolIndicator,
    setToolCallCount,
    streamText,
    onCacheInvalidate,
    generateFollowUpQuestions,
    fetchSessions,
  ]);

  const handleSuggestionClick = useCallback(async (prompt: string) => {
    setInputValue("");
    
    // (sessionId may be persisted across reloads while messages/title are not).
    const shouldGenerateTitle =
      messages.length === 0 && (!sessionTitle || sessionTitle === "New Chat" || sessionTitle === "Chat");

    let generatedTitle: string | null = null;
    if (shouldGenerateTitle) {
      try {
        const titleResponse = await fetch(`${API_URL}/ai/generate-title`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: prompt }),
        });
        const titleData = await titleResponse.json();
        if (titleData.title) {
          generatedTitle = titleData.title;
          setIsTitleAnimating(true);
          setSessionTitle(titleData.title);
        }
      } catch (error) {
        console.error("Error generating title:", error);
      }
    }
    
    addMessage({ role: "user", content: prompt });
    setIsLoading(true);
    setFollowUpQuestions([]);

    try {
      const chatState = {
        current_page: pathname || "/",
        ...(generatedTitle ? { title: generatedTitle } : {}),
      };

      const response = await fetch(`${API_URL}/ai/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: prompt,
          session_id: sessionId,
          user_id: "default_user",
          chat_state: chatState,
        }),
      });

      const data = await response.json();

      if (data.session_id && !sessionId) {
        setSessionId(data.session_id);
      }
      if (data.session_title && data.session_title !== sessionTitle) {
        if (!generatedTitle) {
          setIsTitleAnimating(true);
          setSessionTitle(data.session_title);
        }
      }

      if (data.tool_calls && data.tool_calls > 0) {
        setShowToolIndicator(true);
        setToolCallCount(data.tool_calls);
        await new Promise((resolve) => setTimeout(resolve, 1200));
        setShowToolIndicator(false);
      }

      setIsLoading(false);
      await streamText(data.response || "Sorry, I encountered an error.", data.tool_calls);

      if (data.invalidate_cache && onCacheInvalidate) {
        onCacheInvalidate(data.cache_keys || ["rooms", "patients"]);
      }

      const followUps = generateFollowUpQuestions(prompt, data.response);
      setFollowUpQuestions(followUps);

      fetchSessions();
    } catch (error) {
      console.error("Error:", error);
      setIsLoading(false);
      await streamText("Sorry, I'm having trouble connecting.");
    }
  }, [
    sessionId,
    sessionTitle,
    messages.length,
    pathname,
    addMessage,
    setIsLoading,
    setSessionId,
    setSessionTitle,
    setIsTitleAnimating,
    setShowToolIndicator,
    setToolCallCount,
    streamText,
    onCacheInvalidate,
    generateFollowUpQuestions,
    fetchSessions,
  ]);

  const loadSession = useCallback(async (session: ChatSession) => {
    try {
      setIsLoading(true);
      setSessionId(session.id);
      setSessionTitle(session.title);
      setShowSessions(false);

      const response = await fetch(`${API_URL}/ai/sessions/${session.id}`);
      const data = await response.json();

      if (data.messages) {
        useChatStore.setState({
          messages: data.messages.map((msg: { role: string; content: string }) => ({
            id: crypto.randomUUID(),
            role: msg.role as "user" | "assistant",
            content: msg.content,
            timestamp: new Date(),
            isStreaming: false,
          })),
        });
      }
    } catch (error) {
      console.error("Error loading session:", error);
      useChatStore.setState({ messages: [] });
    } finally {
      setIsLoading(false);
    }
  }, [setIsLoading, setSessionId, setSessionTitle]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setInputValue(value);

    const lastWord = value.split(" ").pop() || "";
    if (lastWord.startsWith("@")) {
      const query = lastWord.substring(1).toLowerCase();

      if (query) {
        const fuse = new Fuse(rooms, {
          keys: ["name", "type"],
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
    const words = inputValue.split(" ");
    words[words.length - 1] = `@${room.name}`;
    setInputValue(words.join(" ") + " ");
    setShowAutocomplete(false);
    inputRef.current?.focus();
  }, [inputValue]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showAutocomplete && autocompleteItems.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedAutocompleteIndex((prev) => (prev + 1) % autocompleteItems.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedAutocompleteIndex((prev) =>
          prev === 0 ? autocompleteItems.length - 1 : prev - 1
        );
      } else if (e.key === "Tab" || e.key === "Enter") {
        e.preventDefault();
        selectAutocompleteItem(autocompleteItems[selectedAutocompleteIndex]);
      } else if (e.key === "Escape") {
        e.preventDefault();
        setShowAutocomplete(false);
      }
    } else if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Copy message content
  const copyToClipboard = useCallback((text: string) => {
    navigator.clipboard.writeText(text);
  }, []);

  // Export chat
  const exportChat = useCallback(() => {
    const content = messages.map((m) => `${m.role === "user" ? "You" : "Assistant"}: ${m.content}`).join("\n\n");
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `chat-${sessionTitle || "export"}-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }, [messages, sessionTitle]);

  return (
    <div
      className={cn(
        "h-full flex flex-col bg-white relative",
        "transition-opacity duration-200 ease-in-out",
        isCollapsed ? "opacity-0 pointer-events-none" : "opacity-100"
      )}
    >
      <div className="h-12 px-3 flex items-center justify-between border-b shrink-0">
        <div className="flex items-center gap-2 flex-1 min-w-0 relative">
          <button
            onClick={() => setShowSessions(!showSessions)}
            className="flex items-center gap-1.5 hover:bg-muted/50 transition-colors px-2 py-1 rounded max-w-[180px]"
          >
            <span className="text-sm font-medium text-foreground truncate flex items-center gap-0.5">
              {isTitleAnimating
                ? displayedTitle
                : (displayedTitle || (messages.length > 0 ? (sessionTitle || "Chat") : "New Chat"))}
              {isTitleAnimating && (
                <span className="inline-block w-0.5 h-4 bg-foreground animate-pulse ml-0.5" />
              )}
            </span>
            <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" />
          </button>

          {showSessions && (
            <div
              ref={dropdownRef}
              className="absolute top-full left-0 mt-1 w-64 bg-white border shadow-lg rounded-md overflow-hidden z-50"
            >
              <div className="p-2 border-b bg-muted/30">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                  Recent Conversations
                </p>
              </div>
              <div className="max-h-64 overflow-y-auto">
                {sessions.length === 0 ? (
                  <div className="p-3 text-center">
                    <p className="text-xs text-muted-foreground">No previous conversations</p>
                  </div>
                ) : (
                  sessions.map((session) => (
                    <button
                      key={session.id}
                      onClick={() => loadSession(session)}
                      className={cn(
                        "w-full text-left px-3 py-2 border-b last:border-b-0 hover:bg-muted/50 transition-colors",
                        sessionId === session.id && "bg-primary/5 border-l-2 border-l-primary"
                      )}
                    >
                      <p className="text-sm text-foreground truncate">{session.title}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {new Date(session.updated_at).toLocaleDateString()}
                      </p>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1">
          {messages.length > 0 && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={exportChat}
              title="Export chat"
            >
              <Download className="h-3.5 w-3.5" />
            </Button>
          )}
          {!isLoading && !isStreaming && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={startNewSession}
              title="New chat"
            >
              <Plus className="h-4 w-4" />
            </Button>
          )}
          {onClose && (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.length === 0 ? (
          <EmptyState
            suggestions={smartSuggestions}
            onSuggestionClick={handleSuggestionClick}
          />
        ) : (
          <>
            {messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                onCopy={copyToClipboard}
              />
            ))}

            {showToolIndicator && (
              <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-md">
                <Wrench className="h-3.5 w-3.5 text-primary animate-pulse" />
                <span className="text-xs text-muted-foreground">
                  Using {toolCallCount} tool{toolCallCount > 1 ? "s" : ""}...
                </span>
              </div>
            )}

            {isLoading && !isStreaming && !showToolIndicator && <TypingIndicator />}

            {!isLoading && !isStreaming && followUpQuestions.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-2">
                {followUpQuestions.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => handleSuggestionClick(q)}
                    className="text-xs px-2.5 py-1.5 bg-muted/50 hover:bg-muted text-foreground rounded-md transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-3 border-t shrink-0">
        {showAutocomplete && autocompleteItems.length > 0 && (
          <div className="mb-2 bg-white border rounded-md shadow-lg max-h-40 overflow-y-auto">
            {autocompleteItems.map((room, idx) => (
              <button
                key={room.id}
                onClick={() => selectAutocompleteItem(room)}
                className={cn(
                  "w-full text-left px-3 py-2 text-xs transition-colors",
                  idx === selectedAutocompleteIndex
                    ? "bg-primary/10 text-primary border-l-2 border-primary"
                    : "text-foreground hover:bg-muted/50"
                )}
              >
                <span className="font-medium">{room.name}</span>
                <span className="text-muted-foreground ml-2">({room.type})</span>
              </button>
            ))}
          </div>
        )}

        <div className="flex gap-2 items-end">
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={
              isLoading
                ? "Thinking..."
                : isStreaming
                ? "Responding..."
                : "Ask a question..."
            }
            disabled={isLoading || isStreaming}
            rows={1}
            className={cn(
              "flex-1 min-h-[38px] max-h-32 px-3 py-2 text-sm",
              "bg-muted/30 border border-border rounded-lg resize-none",
              "placeholder:text-muted-foreground/60",
              "focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          />
          <Button
            size="icon"
            className="h-[38px] w-[38px] rounded-lg shrink-0"
            onClick={handleSend}
            disabled={!inputValue.trim() || isLoading || isStreaming}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>

      </div>
    </div>
  );
}

function EmptyState({
  suggestions,
  onSuggestionClick,
}: {
  suggestions: string[];
  onSuggestionClick: (prompt: string) => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-4 py-8">
      <p className="text-xs text-muted-foreground mb-4 max-w-[220px]">
        Ask questions or use suggestions below.
      </p>
      <div className="space-y-2 w-full max-w-[240px]">
        {suggestions.map((text, i) => (
          <button
            key={i}
            onClick={() => onSuggestionClick(text)}
            className="w-full px-3 py-2 text-xs text-left text-muted-foreground bg-muted/40 hover:bg-muted rounded-md transition-colors"
          >
            {text}
          </button>
        ))}
      </div>
    </div>
  );
}

// Message bubble
function MessageBubble({
  message,
  onCopy,
}: {
  message: { role: "user" | "assistant"; content: string; isStreaming?: boolean; toolCalls?: number };
  onCopy: (text: string) => void;
}) {
  const isUser = message.role === "user";

  return (
    <div className={cn("flex gap-2 group", isUser ? "flex-row-reverse" : "flex-row")}>
      <div
        className={cn(
          "max-w-[85%] px-3 py-2 rounded-lg text-sm leading-relaxed relative",
          isUser ? "bg-primary text-primary-foreground" : "bg-muted/60 text-foreground"
        )}
      >
        {isUser ? (
          <span>{message.content}</span>
        ) : (
          <div className="prose prose-sm max-w-none prose-p:mb-2 prose-p:last:mb-0 prose-ul:my-2 prose-ol:my-2 prose-li:my-0">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {message.content || " "}
            </ReactMarkdown>
          </div>
        )}
        {message.isStreaming && (
          <span className="inline-block w-1.5 h-3.5 bg-primary ml-0.5 animate-pulse" />
        )}

        {!isUser && message.content && !message.isStreaming && (
          <button
            onClick={() => onCopy(message.content)}
            className="absolute -right-7 top-1 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-muted rounded"
            title="Copy"
          >
            <Copy className="h-3 w-3 text-muted-foreground" />
          </button>
        )}

        {message.toolCalls && message.toolCalls > 0 && (
          <div className="flex items-center gap-1 mt-2 pt-2 border-t border-current/10">
            <Wrench className="h-3 w-3 opacity-50" />
            <span className="text-[10px] opacity-50">
              {message.toolCalls} tool{message.toolCalls > 1 ? "s" : ""} used
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// Typing indicator
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
